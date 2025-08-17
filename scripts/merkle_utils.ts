import { ethers } from 'ethers';
import { MerkleTree } from 'merkletreejs';

interface InsuranceDocument {
  user: string;
  policyNumber: string;
  coverage: string;
  expiryDate: string;
  amount: string;
}

interface DocumentWithProof extends InsuranceDocument {
  hash: string;
  proof: string[];
}

function hashDocument(doc: InsuranceDocument): string {
  const encoded = ethers.utils.defaultAbiCoder.encode(
    ['address', 'string', 'string', 'string', 'string'],
    [doc.user, doc.policyNumber, doc.coverage, doc.expiryDate, doc.amount]
  );
  return ethers.utils.keccak256(encoded);
}

function generateSampleDocuments(): InsuranceDocument[] {
  return [
    {
      user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      policyNumber: 'POL-001-2024',
      coverage: 'Health Insurance',
      expiryDate: '2024-12-31',
      amount: '10000'
    },
    {
      user: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      policyNumber: 'POL-002-2024',
      coverage: 'Auto Insurance',
      expiryDate: '2024-12-31',
      amount: '5000'
    },
    {
      user: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      policyNumber: 'POL-003-2024',
      coverage: 'Life Insurance',
      expiryDate: '2024-12-31',
      amount: '50000'
    }
  ];
}

function buildMerkleTree(documents: InsuranceDocument[]): { tree: MerkleTree; hashes: string[] } {
  const hashes = documents.map(doc => hashDocument(doc));
  
  // Create Merkle tree using OpenZeppelin's merkletreejs
  const tree = new MerkleTree(hashes, ethers.utils.keccak256, { hashLeaves: false, sortPairs: true });
  
  return { tree, hashes };
}

function generateProofs(tree: MerkleTree, hashes: string[]): DocumentWithProof[] {
  return hashes.map((hash, index) => {
    const proof = tree.getHexProof(hash);
    return {
      ...generateSampleDocuments()[index],
      hash,
      proof
    };
  });
}

async function main(): Promise<void> {
  console.log('Merkle Tree Utilities for CoverPass');
  
  // Generate sample insurance documents
  const documents = generateSampleDocuments();
  console.log(`Generated ${documents.length} sample documents`);
  
  // Hash each document
  const hashes = documents.map(doc => hashDocument(doc));
  console.log('\nDocument Hashes:');
  hashes.forEach((hash, index) => {
    console.log(`  ${index + 1}. ${hash}`);
  });
  
  // Build Merkle tree
  const { tree, hashes: treeHashes } = buildMerkleTree(documents);
  const root = tree.getHexRoot();
  console.log(`\nMerkle Root: ${root}`);
  
  // Generate proofs for each document
  console.log('\nMerkle Proofs:');
  const documentsWithProofs = generateProofs(tree, treeHashes);
  
  documentsWithProofs.forEach((doc, index) => {
    const isValid = tree.verify(doc.proof, doc.hash, root);
    
    console.log(`\n  Document ${index + 1} (${doc.policyNumber}):`);
    console.log(`  User: ${doc.user}`);
    console.log(`  Hash: ${doc.hash}`);
    console.log(`  Proof: [${doc.proof.map(p => p.slice(0, 10) + '...').join(', ')}]`);
    console.log(`  Valid: ${isValid}`);
  });
  
  // Save to file for use in deployment
  const output = {
    root: root,
    documents: documentsWithProofs
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    'merkle_data.json',
    JSON.stringify(output, null, 2)
  );
  
  console.log('\nMerkle data saved to merkle_data.json');
  console.log('\nYou can now use this data with your CoverPass contract!');
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { buildMerkleTree, generateProofs, hashDocument, InsuranceDocument, DocumentWithProof };
