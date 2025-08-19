let provider, wallet, contract;
let eventListener = null;

const adminAbi = [
	"function whitelistInsurer(address insurer) external",
	"function whitelistVerifier(address verifier) external",
	"function revokeInsurer(address insurer) external",
	"function revokeVerifier(address verifier) external",
	"function getStatistics() external view returns (uint256, uint256)",
	"function getCurrentBlock() external view returns (tuple(bytes32 merkleRoot, uint256 timestamp, uint256 blockNumber, address insurer, bytes32 previousBlockHash, uint256 insuranceCount))",
	"event InsuranceBlockCreated(bytes32 indexed merkleRoot, uint256 timestamp, uint256 indexed blockNumber, address indexed insurer, bytes32 previousBlockHash, uint256 insuranceCount)",
	"event MerkleTreeRequest(address indexed sender, uint256 indexed blockNumber, bytes32 docHash, uint256 timestamp)",
	"event MerkleTreeResponse(address indexed insurer, uint256 indexed blockNumber, bytes32 merkleRoot, bytes32[] proof, uint256 timestamp)",
	"event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
	"event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)"
];

async function connectWithMetaMask() {
	try {
		if (!window.ethereum) {
			showStatus('connectionStatus', 'MetaMask not detected. Please install MetaMask.', 'error');
			return;
		}
		await window.ethereum.request({ method: 'eth_requestAccounts' });
		provider = new ethers.providers.Web3Provider(window.ethereum);
		const signer = provider.getSigner();
		const contractAddress = document.getElementById('contractAddress').value;
		if (!contractAddress) {
			showStatus('connectionStatus', 'Please enter the contract address', 'error');
			return;
		}
		contract = new ethers.Contract(contractAddress, adminAbi, signer);
		const account = await signer.getAddress();
		const net = await provider.getNetwork();
		showStatus('connectionStatus', `Connected with MetaMask (chain ${net.chainId})`, 'success');
		const acctEl = document.getElementById('accountAddress');
		if (acctEl) acctEl.innerText = `Account: ${account}`;
	} catch (e) {
		showStatus('connectionStatus', `MetaMask connect failed: ${e.message}`, 'error');
	}
}

async function whitelistInsurer() {
	try {
		const address = document.getElementById('insurerAddress').value;
		if (!address) return showStatus('roleStatus', 'Enter insurer address', 'error');
		await (await contract.whitelistInsurer(address)).wait();
		showStatus('roleStatus', `Insurer ${address} whitelisted`, 'success');
	} catch (e) { showStatus('roleStatus', e.message, 'error'); }
}

async function revokeInsurer() {
	try {
		const address = document.getElementById('insurerAddress').value;
		if (!address) return showStatus('roleStatus', 'Enter insurer address', 'error');
		await (await contract.revokeInsurer(address)).wait();
		showStatus('roleStatus', `Insurer ${address} revoked`, 'success');
	} catch (e) { showStatus('roleStatus', e.message, 'error'); }
}

async function whitelistVerifier() {
	try {
		const address = document.getElementById('verifierAddress').value;
		if (!address) return showStatus('roleStatus', 'Enter verifier address', 'error');
		await (await contract.whitelistVerifier(address)).wait();
		showStatus('roleStatus', `Verifier ${address} whitelisted`, 'success');
	} catch (e) { showStatus('roleStatus', e.message, 'error'); }
}

async function revokeVerifier() {
	try {
		const address = document.getElementById('verifierAddress').value;
		if (!address) return showStatus('roleStatus', 'Enter verifier address', 'error');
		await (await contract.revokeVerifier(address)).wait();
		showStatus('roleStatus', `Verifier ${address} revoked`, 'success');
	} catch (e) { showStatus('roleStatus', e.message, 'error'); }
}

async function startListening() {
	if (!contract) return showStatus('eventsList', 'Please connect first', 'error');
	contract.on('InsuranceBlockCreated', (merkleRoot, timestamp, blockNumber, insurer, previousBlockHash, insuranceCount) => {
		addEventCard('eventsList', 'InsuranceBlockCreated', {
			merkleRoot,
			timestamp: timestamp.toString(),
			blockNumber: blockNumber.toString(),
			insurer,
			previousBlockHash,
			insuranceCount: insuranceCount.toString()
		});
	});
	contract.on('MerkleTreeRequest', (sender, blockNumber, docHash, timestamp) => {
		addEventCard('eventsList', 'MerkleTreeRequest', { sender, blockNumber: blockNumber.toString(), docHash, timestamp: timestamp.toString() });
	});
	contract.on('MerkleTreeResponse', (insurer, blockNumber, merkleRoot, proof, timestamp) => {
		addEventCard('eventsList', 'MerkleTreeResponse', { insurer, blockNumber: blockNumber.toString(), merkleRoot, proof, timestamp: timestamp.toString() });
	});
	contract.on('RoleGranted', (role, account, sender) => addEventCard('eventsList', 'RoleGranted', { role, account, sender }));
	contract.on('RoleRevoked', (role, account, sender) => addEventCard('eventsList', 'RoleRevoked', { role, account, sender }));
	showStatus('eventsList', 'Listening for events...', 'info');
}

function stopListening() {
	if (contract) {
		contract.removeAllListeners();
		showStatus('eventsList', 'Stopped listening for events', 'info');
	}
}
