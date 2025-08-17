import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

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
  console.log('CoverPass Remix Setup\n');
  console.log('This script will help you set up your environment to connect to a');
  console.log('CoverPass contract deployed via Remix.\n');

  const envPath = path.join(__dirname, '../.env');
  
  if (fs.existsSync(envPath)) {
    const overwrite = await question('A .env file already exists. Overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('=== Required Configuration ===\n');

  // Contract Address
  const contractAddress = await question('Enter your deployed contract address from Remix (0x...): ');
  if (!contractAddress.startsWith('0x') || contractAddress.length !== 42) {
    console.log('Invalid contract address format. It should start with 0x and be 42 characters long.');
    rl.close();
    return;
  }

  // Private Key
  const privateKey = await question('Enter your MetaMask private key: ');
  if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
    console.log('Invalid private key format. It should start with 0x and be 66 characters long.');
    rl.close();
    return;
  }

  // RPC URL
  const rpcUrl = await question('Enter RPC URL (or press Enter for Sepolia default): ');
  const finalRpcUrl = rpcUrl || 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID';

  // Network Name
  const networkName = await question('Enter network name (e.g., sepolia, mainnet) or press Enter to skip: ');

  // Build .env content
  let envContent = `# CoverPass Environment Configuration
# Generated on ${new Date().toISOString()}
# For contract deployed via Remix

# Contract Configuration
CONTRACT_ADDRESS=${contractAddress}

# Network Configuration
RPC_URL=${finalRpcUrl}
${networkName ? `NETWORK_NAME=${networkName}` : ''}

# Wallet Configuration
PRIVATE_KEY=${privateKey}
`;

  // Write .env file
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n.env file created successfully!');
    console.log(`Location: ${envPath}`);
    
    console.log('\n=== Next Steps ===');
    console.log('1. Update RPC_URL with your actual Infura/Alchemy project ID');
    console.log('2. Test your connection: npm run admin');
    console.log('3. Use the role-specific interfaces:');
    console.log('   - Admin: npm run admin');
    console.log('   - Insurer: npm run insurer');
    console.log('   - Verifier: npm run verifier');
    
    console.log('\n=== Important Notes ===');
    console.log('• Make sure your contract is deployed and accessible');
    console.log('• Ensure your wallet has the appropriate role (admin/insurer/verifier)');
    console.log('• For admin functions, your wallet must be the contract deployer');
    console.log('• For insurer/verifier functions, an admin must whitelist you first');
    
  } catch (error) {
    console.error('Error creating .env file:', error);
  }

  rl.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
