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

interface EventHistory {
    type: string;
    timestamp: number;
    data: any;
    blockNumber: number;
}

class AdminUI {
    private provider!: ethers.providers.JsonRpcProvider;
    private wallet!: ethers.Wallet;
    private contract!: ethers.Contract;
    private eventHistory: EventHistory[] = [];
    private abi: any;

    constructor() {
        this.loadEnvironment();
        this.loadABI();
        this.setupProvider();
        this.setupWallet();
        this.setupContract();
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

    private setupEventListeners() {
        // Listen for InsuranceBlockCreated events
        this.contract.on('InsuranceBlockCreated', (merkleRoot, timestamp, blockNumber, insurer, previousBlockHash, insuranceCount, event) => {
            const eventData = {
                type: 'InsuranceBlockCreated',
                timestamp: Number(timestamp),
                data: {
                    merkleRoot,
                    blockNumber: Number(blockNumber),
                    insurer,
                    previousBlockHash,
                    insuranceCount: Number(insuranceCount)
                },
                blockNumber: event.blockNumber
            };
            this.eventHistory.push(eventData);
            console.log(`\n[EVENT] New insurance block created: Block #${blockNumber} by ${insurer}`);
        });

        // Listen for MerkleTreeRequest events
        this.contract.on('MerkleTreeRequest', (sender, blockNumber, docHash, timestamp, event) => {
            const eventData = {
                type: 'MerkleTreeRequest',
                timestamp: Number(timestamp),
                data: {
                    sender,
                    blockNumber: Number(blockNumber),
                    docHash
                },
                blockNumber: event.blockNumber
            };
            this.eventHistory.push(eventData);
            console.log(`\n[EVENT] Merkle tree requested: Block #${blockNumber} by ${sender}`);
        });

        // Listen for MerkleTreeResponse events
        this.contract.on('MerkleTreeResponse', (insurer, blockNumber, merkleRoot, proof, timestamp, event) => {
            const eventData = {
                type: 'MerkleTreeResponse',
                timestamp: Number(timestamp),
                data: {
                    insurer,
                    blockNumber: Number(blockNumber),
                    merkleRoot,
                    proofLength: proof.length
                },
                blockNumber: event.blockNumber
            };
            this.eventHistory.push(eventData);
            console.log(`\n[EVENT] Merkle tree response: Block #${blockNumber} by ${insurer}`);
        });

        // Listen for role changes
        this.contract.on('RoleGranted', (role, account, sender, event) => {
            const eventData = {
                type: 'RoleGranted',
                timestamp: Date.now(),
                data: {
                    role,
                    account,
                    sender
                },
                blockNumber: event.blockNumber
            };
            this.eventHistory.push(eventData);
            console.log(`\n[EVENT] Role granted: ${role} to ${account} by ${sender}`);
        });

        this.contract.on('RoleRevoked', (role, account, sender, event) => {
            const eventData = {
                type: 'RoleRevoked',
                timestamp: Date.now(),
                data: {
                    role,
                    account,
                    sender
                },
                blockNumber: event.blockNumber
            };
            this.eventHistory.push(eventData);
            console.log(`\n[EVENT] Role revoked: ${role} from ${account} by ${sender}`);
        });
    }

    async showMenu() {
        console.log('\n=== CoverPass Admin Interface ===');
        console.log('1. Whitelist Insurer');
        console.log('2. Whitelist Verifier');
        console.log('3. Revoke Insurer');
        console.log('4. Revoke Verifier');
        console.log('5. View Current Block');
        console.log('6. View Statistics');
        console.log('7. View Event History');
        console.log('8. Export Event History');
        console.log('9. Clear Event History');
        console.log('10. Check Role Status');
        console.log('0. Exit');
        console.log('================================');
    }

    async handleChoice(choice: string) {
        switch (choice) {
            case '1':
                await this.whitelistInsurer();
                break;
            case '2':
                await this.whitelistVerifier();
                break;
            case '3':
                await this.revokeInsurer();
                break;
            case '4':
                await this.revokeVerifier();
                break;
            case '5':
                await this.viewCurrentBlock();
                break;
            case '6':
                await this.viewStatistics();
                break;
            case '7':
                this.viewEventHistory();
                break;
            case '8':
                this.exportEventHistory();
                break;
            case '9':
                this.clearEventHistory();
                break;
            case '10':
                await this.checkRoleStatus();
                break;
            case '0':
                console.log('Exiting...');
                process.exit(0);
            default:
                console.log('Invalid choice. Please try again.');
        }
    }

    async whitelistInsurer() {
        try {
            const address = await this.promptForAddress('Enter insurer address to whitelist:');
            const tx = await this.contract.whitelistInsurer(address);
            console.log(`Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log('Insurer whitelisted successfully!');
        } catch (error) {
            console.error('Error whitelisting insurer:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    async whitelistVerifier() {
        try {
            const address = await this.promptForAddress('Enter verifier address to whitelist:');
            const tx = await this.contract.whitelistVerifier(address);
            console.log(`Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log('Verifier whitelisted successfully!');
        } catch (error) {
            console.error('Error whitelisting verifier:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    async revokeInsurer() {
        try {
            const address = await this.promptForAddress('Enter insurer address to revoke:');
            const tx = await this.contract.revokeInsurer(address);
            console.log(`Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log('Insurer revoked successfully!');
        } catch (error) {
            console.error('Error revoking insurer:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    async revokeVerifier() {
        try {
            const address = await this.promptForAddress('Enter verifier address to revoke:');
            const tx = await this.contract.revokeVerifier(address);
            console.log(`Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log('Verifier revoked successfully!');
        } catch (error) {
            console.error('Error revoking verifier:', error instanceof Error ? error.message : 'Unknown error');
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

    viewEventHistory() {
        console.log('\n=== Event History ===');
        if (this.eventHistory.length === 0) {
            console.log('No events recorded yet.');
            return;
        }

        this.eventHistory.forEach((event, index) => {
            console.log(`\n${index + 1}. ${event.type}`);
            console.log(`   Timestamp: ${new Date(event.timestamp * 1000).toISOString()}`);
            console.log(`   Block: ${event.blockNumber}`);
            console.log(`   Data: ${JSON.stringify(event.data, null, 2)}`);
        });
        console.log('====================');
    }

    exportEventHistory() {
        const filename = `event_history_${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(this.eventHistory, null, 2));
        console.log(`Event history exported to ${filename}`);
    }

    clearEventHistory() {
        this.eventHistory = [];
        console.log('Event history cleared.');
    }

    async checkRoleStatus() {
        try {
            const address = await this.promptForAddress('Enter address to check roles:');
            
            const hasInsurerRole = await this.contract.hasRole(this.contract.INSURER_ROLE(), address);
            const hasVerifierRole = await this.contract.hasRole(this.contract.VERIFIER_ROLE(), address);
            const hasAdminRole = await this.contract.hasRole(await this.contract.DEFAULT_ADMIN_ROLE(), address);

            console.log('\n=== Role Status ===');
            console.log(`Address: ${address}`);
            console.log(`Admin Role: ${hasAdminRole ? 'Yes' : 'No'}`);
            console.log(`Insurer Role: ${hasInsurerRole ? 'Yes' : 'No'}`);
            console.log(`Verifier Role: ${hasVerifierRole ? 'Yes' : 'No'}`);
            console.log('==================');
        } catch (error) {
            console.error('Error checking role status:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    private async promptForAddress(prompt: string): Promise<string> {
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

    async run() {
        console.log('Starting CoverPass Admin Interface...');
        console.log(`Connected to contract: ${process.env.CONTRACT_ADDRESS}`);
        console.log(`Admin address: ${this.wallet.address}`);
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

// Run the admin interface
const adminUI = new AdminUI();
adminUI.run().catch(console.error);
