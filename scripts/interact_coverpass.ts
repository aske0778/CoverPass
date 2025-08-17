import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

interface DeploymentInfo {
  contract: string;
  address: string;
  deployer: string;
  network: string;
  timestamp: string;
}

async function main(): Promise<void> {
  console.log('CoverPass Contract Interaction Script');
  
  // Load deployment info
  const deploymentPath = path.join(__dirname, '../deployment.json');
  if (!fs.existsSync(deploymentPath)) {
    throw new Error('Deployment info not found. Please deploy the contract first.');
  }
  
  const deployment: DeploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  console.log(`Contract: ${deployment.contract} at ${deployment.address}`);
  
  // Configuration
  const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000';
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  
  // Connect to provider
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  // Load contract ABI
  const contractPath = path.join(__dirname, '../artifacts/contracts/CoverPass.sol/CoverPass.json');
  const contractArtifact = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  
  // Connect to contract
  const contract = new ethers.Contract(deployment.address, contractArtifact.abi, wallet);
  
  console.log(`Connected as: ${wallet.address}`);
  
  // Check if user is admin
  const isAdmin = await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), wallet.address);
  console.log(`Is admin: ${isAdmin}`);
  
  if (isAdmin) {
    await runAdminFunctions(contract, wallet);
  }
  
  // Check if user is insurer
  const isInsurer = await contract.hasRole(await contract.INSURER_ROLE(), wallet.address);
  console.log(`Is insurer: ${isInsurer}`);
  
  if (isInsurer) {
    await runInsurerFunctions(contract, wallet);
  }
  
  // Check if user is verifier
  const isVerifier = await contract.hasRole(await contract.VERIFIER_ROLE(), wallet.address);
  console.log(`Is verifier: ${isVerifier}`);
  
  if (isVerifier) {
    await runVerifierFunctions(contract, wallet);
  }
  
  // Display current state
  await displayContractState(contract);
}

async function runAdminFunctions(contract: ethers.Contract, wallet: ethers.Wallet): Promise<void> {
  console.log('\nRunning Admin Functions...');
  
  // Example: Whitelist an insurer
  const testInsurer = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  try {
    const tx = await contract.whitelistInsurer(testInsurer);
    await tx.wait();
    console.log(`Whitelisted insurer: ${testInsurer}`);
  } catch (error) {
    console.log(`Failed to whitelist insurer: ${error.message}`);
  }
  
  // Example: Whitelist a verifier
  const testVerifier = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
  try {
    const tx = await contract.whitelistVerifier(testVerifier);
    await tx.wait();
    console.log(`Whitelisted verifier: ${testVerifier}`);
  } catch (error) {
    console.log(`Failed to whitelist verifier: ${error.message}`);
  }
}

async function runInsurerFunctions(contract: ethers.Contract, wallet: ethers.Wallet): Promise<void> {
  console.log('\nRunning Insurer Functions...');
  
  // Example: Publish insurance document
  const docHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Sample Insurance Document'));
  const newRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('New Merkle Root'));
  const index = 1;
  
  try {
    const tx = await contract.publishInsurance(newRoot, index, docHash);
    await tx.wait();
    console.log('Published insurance document:');
    console.log(`  Document Hash: ${docHash}`);
    console.log(`  New Merkle Root: ${newRoot}`);
    console.log(`  Index: ${index}`);
  } catch (error) {
    console.log(`Failed to publish insurance: ${error.message}`);
  }
}

async function runVerifierFunctions(contract: ethers.Contract, wallet: ethers.Wallet): Promise<void> {
  console.log('\nRunning Verifier Functions...');
  
  // Example: Verify coverage
  const user = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const docHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Sample Insurance Document'));
  
  // Create a simple proof (in real scenario, this would be generated off-chain)
  const proof = [
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes('proof1')),
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes('proof2'))
  ];
  
  try {
    const result = await contract.verifyCoverage(user, docHash, proof);
    console.log('Coverage verification result:');
    console.log(`  User: ${result[0]}`);
    console.log(`  Document Hash: ${result[1]}`);
    console.log(`  Valid: ${result[2]}`);
  } catch (error) {
    console.log(`Failed to verify coverage: ${error.message}`);
  }
}

async function displayContractState(contract: ethers.Contract): Promise<void> {
  console.log('\nContract State:');
  
  try {
    const merkleRoot = await contract.merkleRoot();
    console.log(`Current Merkle Root: ${merkleRoot}`);
    
    const adminRole = await contract.DEFAULT_ADMIN_ROLE();
    const insurerRole = await contract.INSURER_ROLE();
    const verifierRole = await contract.VERIFIER_ROLE();
    
    console.log(`Admin Role: ${adminRole}`);
    console.log(`Insurer Role: ${insurerRole}`);
    console.log(`Verifier Role: ${verifierRole}`);
  } catch (error) {
    console.log(`Failed to read contract state: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Interaction failed:', error);
    process.exit(1);
  });
