# CoverPass

Minimal setup to compile locally and use the web UI with MetaMask.

## Prerequisites
- Node.js 16+
- MetaMask browser extension
- A Solidity compiler (local solc or Remix) for building `contracts/CoverPass.sol`

## Quick Start
1) Install dependencies
```bash
npm install
```

2) Compile the contract locally
- Using your Solidity toolchain, compile `CoverPass.sol`.
- Save the artifacts to:
  - `bin/contracts/CoverPass.abi`
  - `bin/contracts/CoverPass.bin`

3) Run the web UI
```bash
npm run web
```

4) Connect MetaMask and deploy/use
- On the index page, connect MetaMask and deploy using the ABI/bytecode from `bin/contracts/`.
- Copy the deployed address.
- On `Admin`, `Insurer`, or `Verifier` pages, paste the contract address and connect.

## Notes
- When creating a block, Merkle root must be a 32-byte hex string (0x + 64 hex chars).
- Artifacts are loaded from `bin/contracts/` by the web UI.
