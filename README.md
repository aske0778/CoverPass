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
- MetaMask or other Ethereum wallet

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

## Deployment Workflow

### 1. Deploy Contract via Remix

1. Go to [Remix IDE](https://remix.ethereum.org/)
2. Create a new file and paste the contents of `contracts/CoverPass.sol`
3. Compile the contract using Solidity compiler v0.8.2+
4. Deploy to your preferred network (Sepolia, Goerli, or Mainnet)
5. Copy the deployed contract address

### 2. Setup Environment Variables

Run the interactive setup script to create your `.env` file:

```bash
npm run setup_remix
```

This will guide you through creating a `.env` file with:
- Your contract address from Remix deployment
- Your wallet private key
- RPC URL for your chosen network

Alternatively, manually create a `.env` file in the project root:

```env
CONTRACT_ADDRESS=your_deployed_contract_address_here
PRIVATE_KEY=your_wallet_private_key_here
RPC_URL=your_rpc_url_here
```

**Important**: Never commit your `.env` file to version control!

### 3. Generate Merkle Data

Generate sample insurance documents and Merkle proofs for testing:

```bash
npm run merkle
```

This creates `insurance_documents.json` with sample data for testing.

## Usage

### Role-Specific Interfaces

#### Admin Interface
Manage roles and permissions:
```bash
npm run admin
```

Features:
- Whitelist/revoke insurers and verifiers
- View current roles and permissions
- Monitor blockchain events in real-time
- View event history and export data
- Manage contract permissions

#### Insurer Interface
Issue insurance documents:
```bash
npm run insurer
```

Features:
- Create new insurance policies
- View current merkle root
- Generate sample insurance data
- Save issued documents locally

#### Verifier Interface
Verify insurance coverage:
```bash
npm run verifier
```

Features:
- Verify coverage with document hashes
- Use sample data for testing
- View insurance documents
- Check coverage status

## Scripts

- **`setup_remix.ts`**: Interactive setup for connecting to Remix-deployed contracts
- **`admin_ui.ts`**: Admin interface for managing roles and permissions
- **`insurer_ui.ts`**: Insurer interface for issuing insurance documents
- **`verifier_ui.ts`**: Verifier interface for checking insurance coverage
- **`merkle_utils.ts`**: Generates Merkle trees and proofs using OpenZeppelin's merkletreejs

## Environment Variables

- `CONTRACT_ADDRESS`: Address of your deployed CoverPass contract
- `PRIVATE_KEY`: Your wallet private key (for signing transactions)
- `RPC_URL`: Ethereum RPC endpoint (e.g., Infura, Alchemy, or local node)

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
- Private keys should never be committed to version control

## License

ISC License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
