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

interface StoredBlock {
    blockNumber: number;
    merkleRoot: string;
    timestamp: number;
    insurer: string;
    previousBlockHash: string;
    insuranceCount: number;
    storedAt: string;
}

interface VerificationRequest {
    policyID: number;
    blockNumber: number;
    docHash: string;
    requestedAt: string;
    status: 'pending' | 'completed' | 'failed';
    response?: any;
}

class VerifierUI {
    private provider!: ethers.providers.JsonRpcProvider;
    private wallet!: ethers.Wallet;
    private contract!: ethers.Contract;
    private abi: any;
    private storedBlocks: Map<number, StoredBlock> = new Map();
    private verificationRequests: Map<string, VerificationRequest> = new Map();

    constructor() {
        this.loadEnvironment();
        this.loadABI();
        this.setupProvider();
        this.setupWallet();
        this.setupContract();
        this.loadOffChainData();
        this.setupEventListeners();
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
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Load stored blocks
        const blocksPath = path.join(dataDir, 'verifier_blocks.json');
        if (fs.existsSync(blocksPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(blocksPath, 'utf8'));
                this.storedBlocks = new Map(Object.entries(data).map(([key, value]) => [Number(key), value as StoredBlock]));
                console.log(`Loaded ${this.storedBlocks.size} blocks from off-chain storage`);
            } catch (error) {
                console.log('Could not load stored blocks, starting fresh');
            }
        }

        // Load verification requests
        const requestsPath = path.join(dataDir, 'verifier_requests.json');
        if (fs.existsSync(requestsPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(requestsPath, 'utf8'));
                this.verificationRequests = new Map(Object.entries(data).map(([key, value]) => [key, value as VerificationRequest]));
                console.log(`Loaded ${this.verificationRequests.size} verification requests from off-chain storage`);
            } catch (error) {
                console.log('Could not load verification requests, starting fresh');
            }
        }
    }

    private saveOffChainData() {
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Save stored blocks
        const blocksPath = path.join(dataDir, 'verifier_blocks.json');
        const blocksData = Object.fromEntries(this.storedBlocks);
        fs.writeFileSync(blocksPath, JSON.stringify(blocksData, null, 2));

        // Save verification requests
        const requestsPath = path.join(dataDir, 'verifier_requests.json');
        const requestsData = Object.fromEntries(this.verificationRequests);
        fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2));
    }

    private setupEventListeners() {
        // Listen for InsuranceBlockCreated events to store blocks off-chain
        this.contract.on('InsuranceBlockCreated', (merkleRoot, timestamp, blockNumber, insurer, previousBlockHash, insuranceCount, event) => {
            const storedBlock: StoredBlock = {
                blockNumber: Number(blockNumber),
                merkleRoot: merkleRoot,
                timestamp: Number(timestamp),
                insurer: insurer,
                previousBlockHash: previousBlockHash,
                insuranceCount: Number(insuranceCount),
                storedAt: new Date().toISOString()
            };
            
            this.storedBlocks.set(Number(blockNumber), storedBlock);
            this.saveOffChainData();
            
            console.log(`\n[EVENT] New block stored off-chain: Block #${blockNumber} by ${insurer}`);
        });

        // Listen for MerkleTreeResponse events to update verification requests
        this.contract.on('MerkleTreeResponse', (insurer, blockNumber, merkleRoot, proof, timestamp, event) => {
            const requestKey = `${blockNumber}_${merkleRoot}`;
            const request = this.verificationRequests.get(requestKey);
            
            if (request) {
                request.status = 'completed';
                request.response = {
                    insurer,
                    blockNumber: Number(blockNumber),
                    merkleRoot,
                    proofLength: proof.length,
                    timestamp: Number(timestamp)
                };
                this.saveOffChainData();
                
                console.log(`\n[EVENT] Verification request completed: Block #${blockNumber}`);
            }
        });
    }

    async showMenu() {
        console.log('\n=== CoverPass Verifier Interface ===');
        console.log('1. Request Merkle Tree Data');
        console.log('2. View Current Block');
        console.log('3. View Stored Blocks');
        console.log('4. View Verification Requests');
        console.log('5. Verify Coverage with Hash');
        console.log('6. Load Sample Documents');
        console.log('7. Export Stored Data');
        console.log('8. Sync Latest Block');
        console.log('0. Exit');
        console.log('====================================');
    }

    async handleChoice(choice: string) {
        switch (choice) {
            case '1':
                await this.requestMerkleTreeData();
                break;
            case '2':
                await this.viewCurrentBlock();
                break;
            case '3':
                this.viewStoredBlocks();
                break;
            case '4':
                this.viewVerificationRequests();
                break;
            case '5':
                await this.verifyCoverageWithHash();
                break;
            case '6':
                this.loadSampleDocuments();
                break;
            case '7':
                this.exportStoredData();
                break;
            case '8':
                await this.syncLatestBlock();
                break;
            case '0':
                console.log('Exiting...');
                process.exit(0);
            default:
                console.log('Invalid choice. Please try again.');
        }
    }

    async requestMerkleTreeData() {
        try {
            const policyID = await this.promptForNumber('Enter policy ID:');
            const blockNumber = await this.promptForNumber('Enter block number:');
            
            console.log('Requesting Merkle tree data...');
            const tx = await this.contract.requestMerkleTree(policyID, blockNumber);
            console.log(`Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log('Merkle tree request sent successfully!');

            // Store the request locally
            const docHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['uint256', 'address'], [policyID, this.wallet.address]));
            const requestKey = `${blockNumber}_${docHash}`;
            
            const verificationRequest: VerificationRequest = {
                policyID: policyID,
                blockNumber: blockNumber,
                docHash: docHash,
                requestedAt: new Date().toISOString(),
                status: 'pending'
            };
            
            this.verificationRequests.set(requestKey, verificationRequest);
            this.saveOffChainData();

        } catch (error) {
            console.error('Error requesting Merkle tree data:', error instanceof Error ? error.message : 'Unknown error');
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

    viewStoredBlocks() {
        console.log('\n=== Stored Blocks ===');
        if (this.storedBlocks.size === 0) {
            console.log('No blocks stored off-chain.');
            return;
        }

        this.storedBlocks.forEach((block, blockNumber) => {
            console.log(`\nBlock ${blockNumber}:`);
            console.log(`  Merkle Root: ${block.merkleRoot}`);
            console.log(`  Timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);
            console.log(`  Insurer: ${block.insurer}`);
            console.log(`  Insurance Count: ${block.insuranceCount}`);
            console.log(`  Stored At: ${block.storedAt}`);
        });
        console.log('====================');
    }

    viewVerificationRequests() {
        console.log('\n=== Verification Requests ===');
        if (this.verificationRequests.size === 0) {
            console.log('No verification requests.');
            return;
        }

        this.verificationRequests.forEach((request, key) => {
            console.log(`\nRequest: ${key}`);
            console.log(`  Policy ID: ${request.policyID}`);
            console.log(`  Block Number: ${request.blockNumber}`);
            console.log(`  Status: ${request.status}`);
            console.log(`  Requested At: ${request.requestedAt}`);
            if (request.response) {
                console.log(`  Response: ${JSON.stringify(request.response, null, 2)}`);
            }
        });
        console.log('=============================');
    }

    async verifyCoverageWithHash() {
        try {
            const docHash = await this.promptForInput('Enter document hash (0x...):');
            const blockNumber = await this.promptForNumber('Enter block number:');
            
            const storedBlock = this.storedBlocks.get(blockNumber);
            if (!storedBlock) {
                console.log('Block not found in off-chain storage. Please sync blocks first.');
                return;
            }

            console.log('\n=== Coverage Verification ===');
            console.log(`Document Hash: ${docHash}`);
            console.log(`Block Number: ${blockNumber}`);
            console.log(`Block Merkle Root: ${storedBlock.merkleRoot}`);
            console.log(`Block Insurer: ${storedBlock.insurer}`);
            console.log(`Block Timestamp: ${new Date(storedBlock.timestamp * 1000).toISOString()}`);
            
            // In a real implementation, you would verify the Merkle proof here
            console.log('\nNote: This is a simplified verification.');
            console.log('In a real implementation, you would:');
            console.log('1. Request the Merkle proof from the insurer');
            console.log('2. Verify the proof against the stored block root');
            console.log('3. Confirm the document is included in the block');
            
            console.log('==============================');

        } catch (error) {
            console.error('Error verifying coverage:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    loadSampleDocuments() {
        console.log('\n=== Sample Documents ===');
        
        const sampleDocs = [
            {
                policyID: 1,
                description: 'Health Insurance Policy',
                docHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Health Insurance Policy 1'))
            },
            {
                policyID: 2,
                description: 'Auto Insurance Policy',
                docHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Auto Insurance Policy 1'))
            },
            {
                policyID: 3,
                description: 'Life Insurance Policy',
                docHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Life Insurance Policy 1'))
            }
        ];

        sampleDocs.forEach((doc, index) => {
            console.log(`\n${index + 1}. ${doc.description}`);
            console.log(`   Policy ID: ${doc.policyID}`);
            console.log(`   Document Hash: ${doc.docHash}`);
        });

        console.log('\nYou can use these sample documents to test verification.');
        console.log('=====================================');
    }

    exportStoredData() {
        const filename = `verifier_data_export_${Date.now()}.json`;
        const exportData = {
            exportedAt: new Date().toISOString(),
            blocks: Object.fromEntries(this.storedBlocks),
            requests: Object.fromEntries(this.verificationRequests)
        };
        fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
        console.log(`Verifier data exported to ${filename}`);
    }

    async syncLatestBlock() {
        try {
            const currentBlock = await this.contract.getCurrentBlock();
            const blockNumber = Number(currentBlock.blockNumber);
            
            if (this.storedBlocks.has(blockNumber)) {
                console.log(`Block ${blockNumber} is already stored.`);
                return;
            }

            const storedBlock: StoredBlock = {
                blockNumber: blockNumber,
                merkleRoot: currentBlock.merkleRoot,
                timestamp: Number(currentBlock.timestamp),
                insurer: currentBlock.insurer,
                previousBlockHash: currentBlock.previousBlockHash,
                insuranceCount: Number(currentBlock.insuranceCount),
                storedAt: new Date().toISOString()
            };

            this.storedBlocks.set(blockNumber, storedBlock);
            this.saveOffChainData();
            console.log(`Synced block ${blockNumber} to off-chain storage.`);

        } catch (error) {
            console.error('Error syncing latest block:', error instanceof Error ? error.message : 'Unknown error');
        }
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
        console.log('Starting CoverPass Verifier Interface...');
        console.log(`Connected to contract: ${process.env.CONTRACT_ADDRESS}`);
        console.log(`Verifier address: ${this.wallet.address}`);
        console.log('Listening for events...\n');

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

// Run the verifier interface
const verifierUI = new VerifierUI();
verifierUI.run().catch(console.error);
