import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import 'dotenv/config';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main(): Promise<void> {
  console.log('CoverPass Insurer Interface\n');
  
  // Configuration
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
  const RPC_URL = process.env.RPC_URL || 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID';
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  
  if (!CONTRACT_ADDRESS) {
    console.log('CONTRACT_ADDRESS environment variable is required.');
    console.log('Please set it in your .env file or run:');
    console.log('CONTRACT_ADDRESS=0x... npm run insurer');
    rl.close();
    return;
  }
  
  if (!PRIVATE_KEY) {
    console.log('PRIVATE_KEY environment variable is required.');
    console.log('Please set it in your .env file or run:');
    console.log('PRIVATE_KEY=0x... npm run insurer');
    rl.close();
    return;
  }
  
  try {
    // Connect to provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`Connected to: ${RPC_URL}`);
    console.log(`Insurer address: ${wallet.address}`);
    console.log(`Contract: ${CONTRACT_ADDRESS}\n`);
    
    // Load contract ABI
    const abiPath = path.join(__dirname, '../bin/contracts/CoverPass.abi');
    if (!fs.existsSync(abiPath)) {
      throw new Error('CoverPass.abi not found. Please compile the contract first.');
    }
    
    const contractAbi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, wallet);
    
    // Check if user is insurer
    const insurerRole = await contract.INSURER_ROLE();
    const isInsurer = await contract.hasRole(insurerRole, wallet.address);
    
    if (!isInsurer) {
          console.log('Access denied. This address does not have insurer privileges.');
    console.log('Ask an admin to whitelist you as an insurer.');
      rl.close();
      return;
    }
    
    console.log('Insurer access confirmed!\n');
    
    // Main insurer menu
    await showInsurerMenu(contract, wallet);
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    rl.close();
  }
}

async function showInsurerMenu(contract: ethers.Contract, wallet: ethers.Wallet): Promise<void> {
  while (true) {
    console.log('\n=== Insurer Menu ===');
    console.log('1. Issue New Insurance Document');
    console.log('2. View Current Merkle Root');
    console.log('3. Generate Sample Insurance Data');
    console.log('4. Exit');
    
    const choice = await question('\nSelect an option (1-4): ');
    
    switch (choice) {
      case '1':
        await issueInsuranceDocument(contract);
        break;
      case '2':
        await viewCurrentMerkleRoot(contract);
        break;
      case '3':
        await generateSampleInsuranceData();
        break;
      case '4':
        console.log('Goodbye!');
        return;
      default:
        console.log('Invalid option. Please try again.');
    }
  }
}

async function issueInsuranceDocument(contract: ethers.Contract): Promise<void> {
  console.log('\n=== Issue New Insurance Document ===');
  
  try {
    // Get insurance details
    const policyNumber = await question('Enter policy number (e.g., POL-001-2024): ');
    const coverageType = await question('Enter coverage type (e.g., Health, Auto, Life): ');
    const amount = await question('Enter coverage amount (e.g., 10000): ');
    const expiryDate = await question('Enter expiry date (YYYY-MM-DD): ');
    
    // Create document hash
    const documentData = {
      policyNumber,
      coverageType,
      amount,
      expiryDate,
      timestamp: new Date().toISOString()
    };
    
    const documentString = JSON.stringify(documentData);
    const docHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(documentString));
    
    console.log('\nDocument Details:');
    console.log(`   Policy: ${policyNumber}`);
    console.log(`   Coverage: ${coverageType}`);
    console.log(`   Amount: ${amount}`);
    console.log(`   Expiry: ${expiryDate}`);
    console.log(`   Hash: ${docHash}`);
    
    // For demo purposes, we'll use a simple merkle root
    // In a real scenario, you'd build a proper merkle tree
    const newRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`Root_${Date.now()}`));
    const index = Math.floor(Math.random() * 1000000); // Random index for demo
    
    const confirm = await question('\nProceed with issuing this insurance? (y/N): ');
    
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('Insurance issuance cancelled.');
      return;
    }
    
    console.log('Issuing insurance document...');
    const tx = await contract.publishInsurance(newRoot, index, docHash);
    console.log(`Transaction hash: ${tx.hash}`);
    
    console.log('Waiting for confirmation...');
    await tx.wait();
    
    console.log('Insurance document issued successfully!');
    console.log(`New Merkle Root: ${newRoot}`);
    console.log(`Index: ${index}`);
    
    // Save document info locally
    const documentInfo = {
      ...documentData,
      docHash,
      merkleRoot: newRoot,
      index,
      txHash: tx.hash,
      timestamp: new Date().toISOString()
    };
    
    const documentsPath = path.join(__dirname, '../insurance_documents.json');
    let documents = [];
    
    if (fs.existsSync(documentsPath)) {
      documents = JSON.parse(fs.readFileSync(documentsPath, 'utf8'));
    }
    
    documents.push(documentInfo);
    fs.writeFileSync(documentsPath, JSON.stringify(documents, null, 2));
    
    console.log('Document info saved to insurance_documents.json');
    
  } catch (error) {
    console.log(`Failed to issue insurance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function viewCurrentMerkleRoot(contract: ethers.Contract): Promise<void> {
  console.log('\n=== Current Merkle Root ===');
  
  try {
    const merkleRoot = await contract.merkleRoot();
    
    if (merkleRoot === ethers.constants.HashZero) {
      console.log('No insurance documents have been issued yet.');
    } else {
      console.log(`Current Merkle Root: ${merkleRoot}`);
    }
    
  } catch (error) {
    console.log(`Failed to read merkle root: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function generateSampleInsuranceData(): Promise<void> {
  console.log('\n=== Sample Insurance Data ===');
  
  const sampleDocuments = [
    {
      policyNumber: 'POL-001-2024',
      coverageType: 'Health Insurance',
      amount: '10000',
      expiryDate: '2024-12-31',
      user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
    },
    {
      policyNumber: 'POL-002-2024',
      coverageType: 'Auto Insurance',
      amount: '5000',
      expiryDate: '2024-12-31',
      user: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
    },
    {
      policyNumber: 'POL-003-2024',
      coverageType: 'Life Insurance',
      amount: '50000',
      expiryDate: '2024-12-31',
      user: '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
    }
  ];
  
  console.log('Sample insurance documents:');
  sampleDocuments.forEach((doc, index) => {
    console.log(`\n   ${index + 1}. Policy: ${doc.policyNumber}`);
    console.log(`      Coverage: ${doc.coverageType}`);
    console.log(`      Amount: ${doc.amount}`);
    console.log(`      Expiry: ${doc.expiryDate}`);
    console.log(`      User: ${doc.user}`);
    
    const docString = JSON.stringify(doc);
    const docHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(docString));
    console.log(`      Hash: ${docHash}`);
  });
  
  console.log('\nYou can use these sample documents to test the system.');
  console.log('   Copy the hash values to use in verifier operations.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Insurer UI failed:', error);
    process.exit(1);
  });
