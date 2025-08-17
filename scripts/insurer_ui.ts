import 'dotenv/config';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

interface InsuranceBlock {
    merkleRoot: string;
    timestamp: number;
    blockNumber: number;
    insurer: string;
    previousBlockHash: string;
    insuranceCount: number;
}

interface MerkleTreeData {
    blockNumber: number;
    merkleRoot: string;
    documents: string[];
    proofs: { [docHash: string]: string[] };
}

class InsurerUI {
    private provider!: ethers.providers.JsonRpcProvider;
    private wallet!: ethers.Wallet;
    private contract!: ethers.Contract;
    private abi: any;
    private merkleTrees: Map<number, MerkleTreeData> = new Map();

    constructor() {
        this.loadEnvironment();
        this.loadABI();
        this.setupProvider();
        this.setupWallet();
        this.setupContract();
        this.loadOffChainData();
    }

    private loadEnvironment() {
        if (!process.env.PRIVATE_KEY) {
            throw new Error('PRIVATE_KEY not found in environment variables');
        }
        if (!process.env.RPC_URL) {
            throw new Error('RPC_URL not found in environment variables');
        }
        if (!process.env.CONTRACT_ADDRESS) {
            throw new Error('CONTRACT_ADDRESS not found in environment variables');
        }
    }

    private loadABI() {
        const abiPath = path.join(__dirname, '..', 'bin', 'contracts', 'CoverPass.abi');
        if (!fs.existsSync(abiPath)) {
            throw new Error('CoverPass.abi not found. Please compile the contract first.');
        }
        this.abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    }

    private setupProvider() {
        this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL!);
    }

    private setupWallet() {
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, this.provider);
    }

    private setupContract() {
        this.contract = new ethers.Contract(
            process.env.CONTRACT_ADDRESS!,
            this.abi,
            this.wallet
        );
    }

    private loadOffChainData() {
        const dataPath = path.join(__dirname, '..', 'data', 'insurer_merkle_trees.json');
        if (fs.existsSync(dataPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                this.merkleTrees = new Map(Object.entries(data).map(([key, value]) => [Number(key), value as MerkleTreeData]));
                console.log(`Loaded ${this.merkleTrees.size} Merkle trees from off-chain storage`);
            } catch (error) {
                console.log('Could not load off-chain data, starting fresh');
            }
        }
    }

    private saveOffChainData() {
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const dataPath = path.join(dataDir, 'insurer_merkle_trees.json');
        const data = Object.fromEntries(this.merkleTrees);
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    }

    async showMenu() {
        console.log('\n=== CoverPass Insurer Interface ===');
        console.log('1. Create Insurance Block');
        console.log('2. View Current Block');
        console.log('3. View Statistics');
        console.log('4. Generate Sample Merkle Tree');
        console.log('5. Store Merkle Tree Data');
        console.log('6. Respond to Merkle Tree Request');
        console.log('7. View Stored Merkle Trees');
        console.log('8. Export Merkle Tree Data');
        console.log('0. Exit');
        console.log('===================================');
    }

    async handleChoice(choice: string) {
        switch (choice) {
            case '1':
                await this.createInsuranceBlock();
                break;
            case '2':
                await this.viewCurrentBlock();
                break;
            case '3':
                await this.viewStatistics();
                break;
            case '4':
                await this.generateSampleMerkleTree();
                break;
            case '5':
                await this.storeMerkleTreeData();
                break;
            case '6':
                await this.respondToMerkleTreeRequest();
                break;
            case '7':
                this.viewStoredMerkleTrees();
                break;
            case '8':
                this.exportMerkleTreeData();
                break;
            case '0':
                console.log('Exiting...');
                process.exit(0);
            default:
                console.log('Invalid choice. Please try again.');
        }
    }

    async createInsuranceBlock() {
        try {
            const merkleRoot = await this.promptForInput('Enter Merkle root (0x...):');
            const insuranceCount = await this.promptForNumber('Enter number of insurance documents:');

            console.log('Creating insurance block...');
            const tx = await this.contract.createInsuranceBlock(merkleRoot, insuranceCount);
            console.log(`Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log('Insurance block created successfully!');

            // Store the Merkle tree data off-chain
            const currentBlock = await this.contract.getCurrentBlock();
            const merkleTreeData: MerkleTreeData = {
                blockNumber: Number(currentBlock.blockNumber),
                merkleRoot: merkleRoot,
                documents: [],
                proofs: {}
            };
            this.merkleTrees.set(Number(currentBlock.blockNumber), merkleTreeData);
            this.saveOffChainData();

        } catch (error) {
            console.error('Error creating insurance block:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    async viewCurrentBlock() {
        try {
            const block = await this.contract.getCurrentBlock();
            console.log('\n=== Current Insurance Block ===');
            console.log(`Block Number: ${block.blockNumber}`);
            console.log(`Merkle Root: ${block.merkleRoot}`);
            console.log(`Timestamp: ${new Date(Number(block.timestamp) * 1000).toISOString()}`);
            console.log(`Insurer: ${block.insurer}`);
            console.log(`Previous Block Hash: ${block.previousBlockHash}`);
            console.log(`Insurance Count: ${block.insuranceCount}`);
            console.log('===============================');
        } catch (error) {
            console.error('Error viewing current block:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    async viewStatistics() {
        try {
            const [totalBlocks, totalInsuranceDocuments] = await this.contract.getStatistics();
            console.log('\n=== Statistics ===');
            console.log(`Total Blocks: ${totalBlocks}`);
            console.log(`Total Insurance Documents: ${totalInsuranceDocuments}`);
            console.log('==================');
        } catch (error) {
            console.error('Error viewing statistics:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    async generateSampleMerkleTree() {
        try {
            const documentCount = await this.promptForNumber('Enter number of sample documents:');
            
            // Generate sample documents
            const documents: string[] = [];
            for (let i = 0; i < documentCount; i++) {
                const docHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`Sample Document ${i + 1}`));
                documents.push(docHash);
            }

            // Create Merkle tree (simplified - in real implementation you'd use a proper Merkle tree library)
            const merkleRoot = ethers.utils.keccak256(ethers.utils.concat(documents));
            
            console.log('\n=== Generated Sample Merkle Tree ===');
            console.log(`Merkle Root: ${merkleRoot}`);
            console.log(`Document Count: ${documents.length}`);
            console.log('Documents:');
            documents.forEach((doc, index) => {
                console.log(`  ${index + 1}. ${doc}`);
            });
            console.log('=====================================');

            // Store in memory for later use
            const blockNumber = await this.promptForNumber('Enter block number for this tree:');
            const merkleTreeData: MerkleTreeData = {
                blockNumber: blockNumber,
                merkleRoot: merkleRoot,
                documents: documents,
                proofs: {}
            };
            this.merkleTrees.set(blockNumber, merkleTreeData);
            this.saveOffChainData();

        } catch (error) {
            console.error('Error generating sample Merkle tree:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    async storeMerkleTreeData() {
        try {
            const blockNumber = await this.promptForNumber('Enter block number:');
            const merkleRoot = await this.promptForInput('Enter Merkle root:');
            const documentsInput = await this.promptForInput('Enter document hashes (comma-separated):');
            
            const documents = documentsInput.split(',').map(doc => doc.trim());
            
            const merkleTreeData: MerkleTreeData = {
                blockNumber: blockNumber,
                merkleRoot: merkleRoot,
                documents: documents,
                proofs: {}
            };
            
            this.merkleTrees.set(blockNumber, merkleTreeData);
            this.saveOffChainData();
            console.log('Merkle tree data stored successfully!');

        } catch (error) {
            console.error('Error storing Merkle tree data:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    async respondToMerkleTreeRequest() {
        try {
            const blockNumber = await this.promptForNumber('Enter block number:');
            const docHash = await this.promptForInput('Enter document hash:');
            
            const merkleTree = this.merkleTrees.get(blockNumber);
            if (!merkleTree) {
                console.log('Merkle tree not found for this block number');
                return;
            }

            // Generate proof (simplified - in real implementation you'd use a proper Merkle tree library)
            const proof = this.generateMerkleProof(merkleTree.documents, docHash);
            
            console.log('Responding to Merkle tree request...');
            const tx = await this.contract.respondMerkleTree(
                blockNumber,
                merkleTree.merkleRoot,
                docHash,
                proof
            );
            console.log(`Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log('Merkle tree response sent successfully!');

        } catch (error) {
            console.error('Error responding to Merkle tree request:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    private generateMerkleProof(documents: string[], targetDoc: string): string[] {
        // Simplified Merkle proof generation
        // In a real implementation, you'd use a proper Merkle tree library
        const index = documents.indexOf(targetDoc);
        if (index === -1) {
            throw new Error('Document not found in Merkle tree');
        }
        
        // For demonstration, return some dummy proof hashes
        return [
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes('proof1')),
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes('proof2')),
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes('proof3'))
        ];
    }

    viewStoredMerkleTrees() {
        console.log('\n=== Stored Merkle Trees ===');
        if (this.merkleTrees.size === 0) {
            console.log('No Merkle trees stored.');
            return;
        }

        this.merkleTrees.forEach((tree, blockNumber) => {
            console.log(`\nBlock ${blockNumber}:`);
            console.log(`  Merkle Root: ${tree.merkleRoot}`);
            console.log(`  Document Count: ${tree.documents.length}`);
            console.log(`  Documents: ${tree.documents.slice(0, 3).join(', ')}${tree.documents.length > 3 ? '...' : ''}`);
        });
        console.log('===========================');
    }

    exportMerkleTreeData() {
        const filename = `merkle_trees_export_${Date.now()}.json`;
        const data = Object.fromEntries(this.merkleTrees);
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        console.log(`Merkle tree data exported to ${filename}`);
    }

    private async promptForInput(prompt: string): Promise<string> {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question(prompt, (answer: string) => {
                rl.close();
                resolve(answer.trim());
            });
        });
    }

    private async promptForNumber(prompt: string): Promise<number> {
        const input = await this.promptForInput(prompt);
        return parseInt(input, 10);
    }

    async run() {
        console.log('Starting CoverPass Insurer Interface...');
        console.log(`Connected to contract: ${process.env.CONTRACT_ADDRESS}`);
        console.log(`Insurer address: ${this.wallet.address}\n`);

        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        while (true) {
            await this.showMenu();
            const choice = await new Promise<string>((resolve) => {
                rl.question('Enter your choice: ', (answer: string) => {
                    resolve(answer.trim());
                });
            });
            await this.handleChoice(choice);
        }
    }
}

// Run the insurer interface
const insurerUI = new InsurerUI();
insurerUI.run().catch(console.error);
