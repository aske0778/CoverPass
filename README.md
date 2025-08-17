# CoverPass

Smart Contract for insurance verification using off-chain Merkle trees.

## Overview

CoverPass is a Solidity smart contract that enables:
- **Insurers** to publish insurance documents by submitting Merkle roots
- **Verifiers** to check user coverage using Merkle proofs
- **Role-based access control** for secure operations

## Features

- Role-based access control (Admin, Insurer, Verifier)
- Merkle tree verification for efficient coverage checking
- Off-chain document management with on-chain verification
- Gas-efficient operations

## Smart Contract

The main contract `CoverPass.sol` provides:

- **Admin Functions**: Whitelist/revoke insurers and verifiers
- **Insurer Functions**: Publish new insurance documents
- **Verifier Functions**: Verify user coverage using Merkle proofs

## Setup

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Solidity compiler (v0.8.2+)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CoverPass
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install dev dependencies**
   ```bash
   npm install --save-dev typescript ts-node @types/node
   ```

## Usage

### 1. Generate Merkle Data

First, generate sample insurance documents and Merkle proofs:

```bash
npm run merkle
```

This creates `merkle_data.json` with sample data for testing.

### 2. Deploy Contract

Deploy the CoverPass contract to your network:

```bash
# Set environment variables
export PRIVATE_KEY="your_private_key_here"
export RPC_URL="your_rpc_url_here"

# Deploy
npm run deploy
```

The deployment info is saved to `deployment.json`.

### 3. Interact with Contract

Run the interaction script to test contract functions:

```bash
npm run interact
```

## Scripts

- **`deploy_coverpass.ts`**: Deploys the CoverPass contract
- **`interact_coverpass.ts`**: Demonstrates contract interactions
- **`merkle_utils.ts`**: Generates Merkle trees and proofs using OpenZeppelin's merkletreejs

## Environment Variables

- `PRIVATE_KEY`: Your wallet private key
- `RPC_URL`: Ethereum RPC endpoint

## Contract Functions

### Admin Functions
- `whitelistInsurer(address)`: Grant insurer role
- `whitelistVerifier(address)`: Grant verifier role
- `revokeInsurer(address)`: Revoke insurer role
- `revokeVerifier(address)`: Revoke verifier role

### Insurer Functions
- `publishInsurance(bytes32, uint256, bytes32)`: Publish new insurance document

### Verifier Functions
- `verifyCoverage(address, bytes32, bytes32[])`: Verify user coverage

## Testing

The contract includes comprehensive tests in the `tests/` directory.

## Security

- Uses OpenZeppelin's AccessControl for role management
- Merkle proofs ensure data integrity
- No sensitive data stored on-chain

## License

ISC License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
