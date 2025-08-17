import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import 'dotenv/config';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Event storage
interface ContractEvent {
  type: string;
  blockNumber: number;
  timestamp: string;
  transactionHash: string;
  data: any;
}

let eventHistory: ContractEvent[] = [];
let isListening = false;
let eventListener: any = null;

async function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main(): Promise<void> {
  console.log('CoverPass Admin Interface\n');
  
  // Configuration
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
  const RPC_URL = process.env.RPC_URL || 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID';
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  
  if (!CONTRACT_ADDRESS) {
    console.log('CONTRACT_ADDRESS environment variable is required.');
    console.log('Please set it in your .env file or run:');
    console.log('CONTRACT_ADDRESS=0x... npm run admin');
    rl.close();
    return;
  }
  
  if (!PRIVATE_KEY) {
    console.log('PRIVATE_KEY environment variable is required.');
    console.log('Please set it in your .env file or run:');
    console.log('PRIVATE_KEY=0x... npm run admin');
    rl.close();
    return;
  }
  
  try {
    // Connect to provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`Connected to: ${RPC_URL}`);
    console.log(`Admin address: ${wallet.address}`);
    console.log(`Contract: ${CONTRACT_ADDRESS}\n`);
    
    // Load contract ABI
    const abiPath = path.join(__dirname, '../bin/contracts/CoverPass.abi');
    if (!fs.existsSync(abiPath)) {
      throw new Error('CoverPass.abi not found. Please compile the contract first.');
    }
    
    const contractAbi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, wallet);
    
    // Check if user is admin
    const adminRole = await contract.DEFAULT_ADMIN_ROLE();
    const isAdmin = await contract.hasRole(adminRole, wallet.address);
    
    if (!isAdmin) {
      console.log('Access denied. This address does not have admin privileges.');
      rl.close();
      return;
    }
    
    console.log('Admin access confirmed!\n');
    
    // Start listening to events
    await startEventListening(contract, provider);
    
    // Main admin menu
    await showAdminMenu(contract, wallet);
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    // Clean up event listener
    if (eventListener) {
      eventListener.removeAllListeners();
    }
    rl.close();
  }
}

async function startEventListening(contract: ethers.Contract, provider: ethers.providers.JsonRpcProvider): Promise<void> {
  try {
    console.log('Setting up event listeners...');
    
    // Listen to InsurancePublished events
    contract.on('InsurancePublished', (insurer, docHash, index, newRoot, event) => {
      const contractEvent: ContractEvent = {
        type: 'InsurancePublished',
        blockNumber: event.blockNumber,
        timestamp: new Date().toISOString(),
        transactionHash: event.transactionHash,
        data: {
          insurer,
          docHash,
          index: index.toString(),
          newRoot
        }
      };
      
      eventHistory.unshift(contractEvent); // Add to beginning of array
      if (eventHistory.length > 100) { // Keep only last 100 events
        eventHistory = eventHistory.slice(0, 100);
      }
      
      console.log(`\nNew Event: Insurance Published by ${insurer}`);
      console.log(`   Document Hash: ${docHash}`);
      console.log(`   Index: ${index.toString()}`);
      console.log(`   New Root: ${newRoot}`);
      console.log(`   Block: ${event.blockNumber}`);
      console.log(`   TX: ${event.transactionHash}`);
    });
    
    // Listen to CoverageVerified events
    contract.on('CoverageVerified', (verifier, user, docHash, valid, event) => {
      const contractEvent: ContractEvent = {
        type: 'CoverageVerified',
        blockNumber: event.blockNumber,
        timestamp: new Date().toISOString(),
        transactionHash: event.transactionHash,
        data: {
          verifier,
          user,
          docHash,
          valid
        }
      };
      
      eventHistory.unshift(contractEvent);
      if (eventHistory.length > 100) {
        eventHistory = eventHistory.slice(0, 100);
      }
      
      console.log(`\nNew Event: Coverage Verified by ${verifier}`);
      console.log(`   User: ${user}`);
      console.log(`   Document Hash: ${docHash}`);
      console.log(`   Valid: ${valid}`);
      console.log(`   Block: ${event.blockNumber}`);
      console.log(`   TX: ${event.transactionHash}`);
    });
    
    // Listen to RoleGranted events
    contract.on('RoleGranted', (role, account, sender, event) => {
      const contractEvent: ContractEvent = {
        type: 'RoleGranted',
        blockNumber: event.blockNumber,
        timestamp: new Date().toISOString(),
        transactionHash: event.transactionHash,
        data: {
          role,
          account,
          sender
        }
      };
      
      eventHistory.unshift(contractEvent);
      if (eventHistory.length > 100) {
        eventHistory = eventHistory.slice(0, 100);
      }
      
      console.log(`\nNew Event: Role Granted`);
      console.log(`   Role: ${role}`);
      console.log(`   Account: ${account}`);
      console.log(`   Sender: ${sender}`);
      console.log(`   Block: ${event.blockNumber}`);
      console.log(`   TX: ${event.transactionHash}`);
    });
    
    // Listen to RoleRevoked events
    contract.on('RoleRevoked', (role, account, sender, event) => {
      const contractEvent: ContractEvent = {
        type: 'RoleRevoked',
        blockNumber: event.blockNumber,
        timestamp: new Date().toISOString(),
        transactionHash: event.transactionHash,
        data: {
          role,
          account,
          sender
        }
      };
      
      eventHistory.unshift(contractEvent);
      if (eventHistory.length > 100) {
        eventHistory = eventHistory.slice(0, 100);
      }
      
      console.log(`\nNew Event: Role Revoked`);
      console.log(`   Role: ${role}`);
      console.log(`   Account: ${account}`);
      console.log(`   Sender: ${sender}`);
      console.log(`   Block: ${event.blockNumber}`);
      console.log(`   TX: ${event.transactionHash}`);
    });
    
    isListening = true;
    console.log('Event listeners active! You will see real-time updates.\n');
    
  } catch (error) {
    console.log(`Warning: Could not set up event listeners: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('   Event monitoring will not be available.\n');
  }
}

async function showAdminMenu(contract: ethers.Contract, wallet: ethers.Wallet): Promise<void> {
  while (true) {
    console.log('\n=== Admin Menu ===');
    console.log('1. Whitelist Insurer');
    console.log('2. Whitelist Verifier');
    console.log('3. Revoke Insurer');
    console.log('4. Revoke Verifier');
    console.log('5. View Current Roles');
    console.log('6. View Event History');
    console.log('7. View Recent Events');
    console.log('8. Export Event History');
    console.log('9. Clear Event History');
    console.log('10. Exit');
    
    const choice = await question('\nSelect an option (1-10): ');
    
    switch (choice) {
      case '1':
        await whitelistInsurer(contract);
        break;
      case '2':
        await whitelistVerifier(contract);
        break;
      case '3':
        await revokeInsurer(contract);
        break;
      case '4':
        await revokeVerifier(contract);
        break;
      case '5':
        await viewCurrentRoles(contract);
        break;
      case '6':
        await viewEventHistory();
        break;
      case '7':
        await viewRecentEvents();
        break;
      case '8':
        await exportEventHistory();
        break;
      case '9':
        await clearEventHistory();
        break;
      case '10':
        console.log('Goodbye!');
        return;
      default:
        console.log('Invalid option. Please try again.');
    }
  }
}

async function whitelistInsurer(contract: ethers.Contract): Promise<void> {
  console.log('\n=== Whitelist Insurer ===');
  
  const address = await question('Enter insurer address (0x...): ');
  
  if (!ethers.utils.isAddress(address)) {
    console.log('Invalid Ethereum address format.');
    return;
  }
  
  try {
    console.log('Whitelisting insurer...');
    const tx = await contract.whitelistInsurer(address);
    console.log(`Transaction hash: ${tx.hash}`);
    
    console.log('Waiting for confirmation...');
    await tx.wait();
    
    console.log('Insurer whitelisted successfully!');
  } catch (error) {
    console.log(`Failed to whitelist insurer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function whitelistVerifier(contract: ethers.Contract): Promise<void> {
  console.log('\n=== Whitelist Verifier ===');
  
  const address = await question('Enter verifier address (0x...): ');
  
  if (!ethers.utils.isAddress(address)) {
    console.log('Invalid Ethereum address format.');
    return;
  }
  
  try {
    console.log('Whitelisting verifier...');
    const tx = await contract.whitelistVerifier(address);
    console.log(`Transaction hash: ${tx.hash}`);
    
    console.log('Waiting for confirmation...');
    await tx.wait();
    
    console.log('Verifier whitelisted successfully!');
  } catch (error) {
    console.log(`Failed to whitelist verifier: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function revokeInsurer(contract: ethers.Contract): Promise<void> {
  console.log('\n=== Revoke Insurer ===');
  
  const address = await question('Enter insurer address to revoke (0x...): ');
  
  if (!ethers.utils.isAddress(address)) {
    console.log('Invalid Ethereum address format.');
    return;
  }
  
  try {
    console.log('Revoking insurer...');
    const tx = await contract.revokeInsurer(address);
    console.log(`Transaction hash: ${tx.hash}`);
    
    console.log('Waiting for confirmation...');
    await tx.wait();
    
    console.log('Insurer revoked successfully!');
  } catch (error) {
    console.log(`Failed to revoke insurer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function revokeVerifier(contract: ethers.Contract): Promise<void> {
  console.log('\n=== Revoke Verifier ===');
  
  const address = await question('Enter verifier address to revoke (0x...): ');
  
  if (!ethers.utils.isAddress(address)) {
    console.log('Invalid Ethereum address format.');
    return;
  }
  
  try {
    console.log('Revoking verifier...');
    const tx = await contract.revokeVerifier(address);
    console.log(`Transaction hash: ${tx.hash}`);
    
    console.log('Waiting for confirmation...');
    await tx.wait();
    
    console.log('Verifier revoked successfully!');
  } catch (error) {
    console.log(`Failed to revoke verifier: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function viewCurrentRoles(contract: ethers.Contract): Promise<void> {
  console.log('\n=== Current Roles ===');
  
  try {
    const adminRole = await contract.DEFAULT_ADMIN_ROLE();
    const insurerRole = await contract.INSURER_ROLE();
    const verifierRole = await contract.VERIFIER_ROLE();
    
    console.log(`Admin Role: ${adminRole}`);
    console.log(`Insurer Role: ${insurerRole}`);
    console.log(`Verifier Role: ${verifierRole}`);
    
    // Note: In a real implementation, you'd want to track which addresses have which roles
    // This would require additional contract functions or events
    console.log('\nNote: To see which addresses have specific roles, you would need to');
    console.log('   check the contract state or implement role tracking.');
    
  } catch (error) {
    console.log(`Failed to read roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function viewEventHistory(): Promise<void> {
  console.log('\n=== Event History ===');
  
  if (eventHistory.length === 0) {
    console.log('No events recorded yet.');
    return;
  }
  
  console.log(`Total events recorded: ${eventHistory.length}\n`);
  
  eventHistory.forEach((event, index) => {
    console.log(`${index + 1}. ${event.type} (Block ${event.blockNumber})`);
    console.log(`   Time: ${event.timestamp}`);
    console.log(`   TX: ${event.transactionHash}`);
    
    // Display event-specific data
    switch (event.type) {
      case 'InsurancePublished':
        console.log(`   Insurer: ${event.data.insurer}`);
        console.log(`   Doc Hash: ${event.data.docHash}`);
        console.log(`   Index: ${event.data.index}`);
        break;
      case 'CoverageVerified':
        console.log(`   Verifier: ${event.data.verifier}`);
        console.log(`   User: ${event.data.user}`);
        console.log(`   Valid: ${event.data.valid}`);
        break;
      case 'RoleGranted':
        console.log(`   Role: ${event.data.role}`);
        console.log(`   Account: ${event.data.account}`);
        break;
      case 'RoleRevoked':
        console.log(`   Role: ${event.data.role}`);
        console.log(`   Account: ${event.data.account}`);
        break;
    }
    console.log('');
  });
}

async function viewRecentEvents(): Promise<void> {
  console.log('\n=== Recent Events (Last 10) ===');
  
  if (eventHistory.length === 0) {
    console.log('No events recorded yet.');
    return;
  }
  
  const recentEvents = eventHistory.slice(0, 10);
  
  recentEvents.forEach((event, index) => {
    console.log(`${index + 1}. ${event.type} (Block ${event.blockNumber})`);
    console.log(`   Time: ${event.timestamp}`);
    console.log(`   TX: ${event.transactionHash}`);
    
    // Display event-specific data
    switch (event.type) {
      case 'InsurancePublished':
        console.log(`   Insurer: ${event.data.insurer}`);
        console.log(`   Doc Hash: ${event.data.docHash.slice(0, 10)}...`);
        break;
      case 'CoverageVerified':
        console.log(`   Verifier: ${event.data.verifier}`);
        console.log(`   User: ${event.data.user}`);
        console.log(`   Valid: ${event.data.valid}`);
        break;
      case 'RoleGranted':
        console.log(`   Role: ${event.data.role.slice(0, 10)}...`);
        console.log(`   Account: ${event.data.account}`);
        break;
      case 'RoleRevoked':
        console.log(`   Role: ${event.data.role.slice(0, 10)}...`);
        console.log(`   Account: ${event.data.account}`);
        break;
    }
    console.log('');
  });
}

async function exportEventHistory(): Promise<void> {
  console.log('\n=== Export Event History ===');
  
  if (eventHistory.length === 0) {
    console.log('No events to export.');
    return;
  }
  
  try {
    const exportPath = path.join(__dirname, '../event_history.json');
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalEvents: eventHistory.length,
      events: eventHistory
    };
    
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`Event history exported to: ${exportPath}`);
    console.log(`Exported ${eventHistory.length} events`);
    
  } catch (error) {
    console.log(`Failed to export events: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function clearEventHistory(): Promise<void> {
  console.log('\n=== Clear Event History ===');
  
  if (eventHistory.length === 0) {
    console.log('No events to clear.');
    return;
  }
  
  const confirm = await question(`Are you sure you want to clear ${eventHistory.length} events? (y/N): `);
  
  if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
    eventHistory = [];
    console.log('Event history cleared.');
  } else {
    console.log('Event history clear cancelled.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Admin UI failed:', error);
    process.exit(1);
  });
