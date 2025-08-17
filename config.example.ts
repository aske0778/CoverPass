// Example configuration file for CoverPass deployment
// Copy this file to config.ts and fill in your values

export const config = {
  // Ethereum Network Configuration
  rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
  
  // Wallet Configuration
  privateKey: process.env.PRIVATE_KEY || 'your_private_key_here',
  
  // Network-specific configurations (uncomment and modify as needed)
  // rpcUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
  // rpcUrl: 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
  // rpcUrl: 'https://polygon-rpc.com',
  
  // Gas settings
  gasLimit: 5000000,
  gasPrice: 'auto'
};
