# CoverPass Deployment Guide

This guide provides step-by-step instructions for deploying and testing the CoverPass smart contract.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager
- Solidity compiler (v0.8.2 or higher)
- Access to an Ethereum network (local, testnet, or mainnet)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Compile Contracts

Ensure your Solidity contracts are compiled and artifacts are generated. The deployment script expects to find compiled artifacts in the `artifacts/` directory.

### 3. Configure Environment

Set the following environment variables:

```bash
# For local development
export RPC_URL="http://localhost:8545"
export PRIVATE_KEY="your_private_key_here"

# For testnet (example: Sepolia)
export RPC_URL="https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
export PRIVATE_KEY="your_private_key_here"

# For mainnet
export RPC_URL="https://mainnet.infura.io/v3/YOUR_PROJECT_ID"
export PRIVATE_KEY="your_private_key_here"
```

## Deployment Process

### Step 1: Generate Merkle Data

Generate sample insurance documents and Merkle proofs for testing:

```bash
npm run merkle
```

This creates a `merkle_data.json` file containing:
- Sample insurance documents
- Document hashes
- Merkle root
- Merkle proofs for each document

### Step 2: Deploy Contract

Deploy the CoverPass contract to your chosen network:

```bash
npm run deploy
```

The script will:
- Connect to the specified network
- Deploy the CoverPass contract
- Save deployment information to `deployment.json`
- Display the contract address and deployer information

### Step 3: Verify Deployment

Check that the contract was deployed successfully:

```bash
npm run interact
```

This script will:
- Connect to the deployed contract
- Check your role permissions
- Execute functions based on your role
- Display the current contract state

## Testing

### Admin Functions

As the deployer, you automatically have admin privileges:

- **Whitelist Insurer**: Grant insurer role to an address
- **Whitelist Verifier**: Grant verifier role to an address
- **Revoke Roles**: Remove role assignments

### Insurer Functions

After being whitelisted as an insurer:

- **Publish Insurance**: Submit new Merkle roots for insurance documents

### Verifier Functions

After being whitelisted as a verifier:

- **Verify Coverage**: Check user coverage using Merkle proofs

## Network-Specific Considerations

### Local Development

- Use Ganache or Hardhat for local blockchain
- Set `RPC_URL=http://localhost:8545`
- Use test private keys

### Testnets

- Sepolia, Goerli, or Mumbai recommended
- Obtain test ETH from faucets
- Use dedicated test wallets

### Mainnet

- Ensure sufficient ETH for gas fees
- Use hardware wallets for security
- Test thoroughly on testnets first

## Troubleshooting

### Common Issues

1. **"Contract artifacts not found"**
   - Ensure contracts are compiled
   - Check artifacts directory exists

2. **"Insufficient funds"**
   - Verify wallet has sufficient ETH
   - Check gas price settings

3. **"Nonce too low"**
   - Wait for pending transactions
   - Reset wallet nonce if necessary

### Gas Optimization

- Monitor gas usage during deployment
- Adjust gas limit if needed
- Use appropriate gas price for network conditions

## Security Considerations

- Never commit private keys to version control
- Use environment variables for sensitive data
- Test thoroughly on testnets before mainnet
- Verify contract addresses after deployment
- Keep private keys secure and backed up

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review contract logs and error messages
3. Verify network connectivity and configuration
4. Consult Ethereum development documentation
