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
  console.log('CoverPass Verifier Interface\n');
  
  // Configuration
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
  const RPC_URL = process.env.RPC_URL || 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID';
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  
  if (!CONTRACT_ADDRESS) {
    console.log('CONTRACT_ADDRESS environment variable is required.');
    console.log('Please set it in your .env file or run:');
    console.log('CONTRACT_ADDRESS=0x... npm run verifier');
    rl.close();
    return;
  }
  
  if (!PRIVATE_KEY) {
    console.log('PRIVATE_KEY environment variable is required.');
    console.log('Please set it in your .env file or run:');
    console.log('PRIVATE_KEY=0x... npm run verifier');
    rl.close();
    return;
  }
  
  try {
    // Connect to provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`Connected to: ${RPC_URL}`);
    console.log(`Verifier address: ${wallet.address}`);
    console.log(`Contract: ${CONTRACT_ADDRESS}\n`);
    
    // Load contract ABI
    const abiPath = path.join(__dirname, '../bin/contracts/CoverPass.abi');
    if (!fs.existsSync(abiPath)) {
      throw new Error('CoverPass.abi not found. Please compile the contract first.');
    }
    
    const contractAbi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, wallet);
    
    // Check if user is verifier
    const verifierRole = await contract.VERIFIER_ROLE();
    const isVerifier = await contract.hasRole(verifierRole, wallet.address);
    
    if (!isVerifier) {
          console.log('Access denied. This address does not have verifier privileges.');
    console.log('Ask an admin to whitelist you as a verifier.');
      rl.close();
      return;
    }
    
    console.log('Verifier access confirmed!\n');
    
    // Main verifier menu
    await showVerifierMenu(contract, wallet);
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    rl.close();
  }
}

async function showVerifierMenu(contract: ethers.Contract, wallet: ethers.Wallet): Promise<void> {
  while (true) {
    console.log('\n=== Verifier Menu ===');
    console.log('1. Verify Coverage with Document Hash');
    console.log('2. Verify Coverage with Sample Data');
    console.log('3. View Current Merkle Root');
    console.log('4. Load Insurance Documents');
    console.log('5. Exit');
    
    const choice = await question('\nSelect an option (1-5): ');
    
    switch (choice) {
      case '1':
        await verifyCoverageWithHash(contract);
        break;
      case '2':
        await verifyCoverageWithSampleData(contract);
        break;
      case '3':
        await viewCurrentMerkleRoot(contract);
        break;
      case '4':
        await loadInsuranceDocuments();
        break;
      case '5':
        console.log('Goodbye!');
        return;
      default:
        console.log('Invalid option. Please try again.');
    }
  }
}

async function verifyCoverageWithHash(contract: ethers.Contract): Promise<void> {
  console.log('\n=== Verify Coverage with Document Hash ===');
  
  try {
    const userAddress = await question('Enter user address to verify (0x...): ');
    
    if (!ethers.utils.isAddress(userAddress)) {
      console.log('Invalid Ethereum address format.');
      return;
    }
    
    const docHash = await question('Enter document hash (0x...): ');
    
    if (!docHash.startsWith('0x') || docHash.length !== 66) {
      console.log('Invalid document hash format.');
      return;
    }
    
    // For demo purposes, we'll create a simple proof
    // In a real scenario, this would be generated from the merkle tree
    console.log('\nNote: This is a demo proof. In production, you would generate');
    console.log('   the actual merkle proof from the insurance document tree.');
    
    const proof = [
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('demo_proof_1')),
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('demo_proof_2'))
    ];
    
    console.log(`Generated proof with ${proof.length} elements`);
    
    const confirm = await question('\nProceed with verification? (y/N): ');
    
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('Verification cancelled.');
      return;
    }
    
    console.log('Verifying coverage...');
    const result = await contract.verifyCoverage(userAddress, docHash, proof);
    
    console.log('\nCoverage verification completed!');
    console.log(`User: ${result[0]}`);
    console.log(`Document Hash: ${result[1]}`);
    console.log(`Valid: ${result[2]}`);
    
    if (result[2]) {
      console.log('Coverage verified successfully!');
    } else {
      console.log('Coverage verification failed.');
      console.log('This could mean:');
      console.log('   - Document hash is not in the merkle tree');
      console.log('   - Proof is incorrect');
      console.log('   - User does not have coverage');
    }
    
  } catch (error) {
    console.log(`Failed to verify coverage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function verifyCoverageWithSampleData(contract: ethers.Contract): Promise<void> {
  console.log('\n=== Verify Coverage with Sample Data ===');
  
  try {
    const userAddress = await question('Enter user address to verify (0x...): ');
    
    if (!ethers.utils.isAddress(userAddress)) {
      console.log('Invalid Ethereum address format.');
      return;
    }
    
    console.log('\nSample insurance documents:');
    console.log('1. Health Insurance - POL-001-2024');
    console.log('2. Auto Insurance - POL-002-2024');
    console.log('3. Life Insurance - POL-003-2024');
    
    const choice = await question('\nSelect document (1-3): ');
    
    let docHash: string;
    let coverageType: string;
    
    switch (choice) {
      case '1':
        const doc1 = {
          policyNumber: 'POL-001-2024',
          coverageType: 'Health Insurance',
          amount: '10000',
          expiryDate: '2024-12-31',
          user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
        };
        docHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(doc1)));
        coverageType = 'Health Insurance';
        break;
      case '2':
        const doc2 = {
          policyNumber: 'POL-002-2024',
          coverageType: 'Auto Insurance',
          amount: '5000',
          expiryDate: '2024-12-31',
          user: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
        };
        docHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(doc2)));
        coverageType = 'Auto Insurance';
        break;
      case '3':
        const doc3 = {
          policyNumber: 'POL-003-2024',
          coverageType: 'Life Insurance',
          amount: '50000',
          expiryDate: '2024-12-31',
          user: '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
        };
        docHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(doc3)));
        coverageType = 'Life Insurance';
        break;
      default:
                console.log('Invalid selection.');
        return;
      }
      
      console.log(`\nSelected: ${coverageType}`);
      console.log(`Document Hash: ${docHash}`);
    
    // Generate demo proof
    const proof = [
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('sample_proof_1')),
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes('sample_proof_2'))
    ];
    
    const confirm = await question('\nProceed with verification? (y/N): ');
    
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('Verification cancelled.');
      return;
    }
    
    console.log('Verifying coverage...');
    const result = await contract.verifyCoverage(userAddress, docHash, proof);
    
    console.log('\nCoverage verification completed!');
    console.log(`User: ${result[0]}`);
    console.log(`Document Hash: ${result[1]}`);
    console.log(`Valid: ${result[2]}`);
    
    if (result[2]) {
      console.log('Coverage verified successfully!');
    } else {
      console.log('Coverage verification failed.');
    }
    
  } catch (error) {
    console.log(`Failed to verify coverage: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

async function loadInsuranceDocuments(): Promise<void> {
  console.log('\n=== Load Insurance Documents ===');
  
  const documentsPath = path.join(__dirname, '../insurance_documents.json');
  
  if (!fs.existsSync(documentsPath)) {
    console.log('No insurance documents found.');
    console.log('Ask an insurer to issue some documents first.');
    return;
  }
  
  try {
    const documents = JSON.parse(fs.readFileSync(documentsPath, 'utf8'));
    
    if (documents.length === 0) {
      console.log('No insurance documents found.');
      return;
    }
    
    console.log(`Found ${documents.length} insurance document(s):\n`);
    
    documents.forEach((doc: any, index: number) => {
      console.log(`${index + 1}. Policy: ${doc.policyNumber}`);
      console.log(`   Coverage: ${doc.coverageType}`);
      console.log(`   Amount: ${doc.amount}`);
      console.log(`   Expiry: ${doc.expiryDate}`);
      console.log(`   Hash: ${doc.docHash}`);
      console.log(`   Merkle Root: ${doc.merkleRoot}`);
      console.log(`   Index: ${doc.index}`);
      console.log(`   TX: ${doc.txHash}`);
      console.log(`   Issued: ${doc.timestamp}`);
      console.log('');
    });
    
    console.log('You can copy these document hashes to verify coverage.');
    
  } catch (error) {
    console.log(`Failed to load documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Verifier UI failed:', error);
    process.exit(1);
  });
