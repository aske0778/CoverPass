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

async function main(): Promise<ethers.Contract> {
  console.log('Deploying CoverPass contract...');

  // Configuration
  const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000';
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  
  // Connect to provider
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log(`Connected to: ${RPC_URL}`);
  console.log(`Deployer address: ${wallet.address}`);

  // Read contract artifacts
  const contractPath = path.join(__dirname, '../artifacts/contracts/CoverPass.sol/CoverPass.json');
  
  if (!fs.existsSync(contractPath)) {
    throw new Error('Contract artifacts not found. Please compile the contract first.');
  }

  const contractArtifact = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  
  // Deploy contract
  const factory = new ethers.ContractFactory(
    contractArtifact.abi,
    contractArtifact.bytecode,
    wallet
  );

  console.log('Deploying CoverPass contract...');
  const contract = await factory.deploy(wallet.address); // Pass deployer as default admin
  
  console.log('Waiting for deployment confirmation...');
  await contract.deployed();
  
  console.log('CoverPass deployed successfully!');
  console.log(`Contract address: ${contract.address}`);
  console.log(`Default admin: ${wallet.address}`);
  
  // Save deployment info
  const deploymentInfo: DeploymentInfo = {
    contract: 'CoverPass',
    address: contract.address,
    deployer: wallet.address,
    network: RPC_URL,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../deployment.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log('Deployment info saved to deployment.json');
  
  return contract;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
