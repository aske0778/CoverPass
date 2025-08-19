let provider, wallet, contract;
let eventListener = null;

const verifierAbi = [
	"function requestMerkleTree(uint256 blockNumber, bytes32 docHash) external",
	"function getStatistics() external view returns (uint256, uint256)",
	"function getCurrentBlock() external view returns (tuple(bytes32 merkleRoot, uint256 timestamp, uint256 blockNumber, address insurer, bytes32 previousBlockHash, uint256 insuranceCount))",
	"event InsuranceBlockCreated(bytes32 indexed merkleRoot, uint256 timestamp, uint256 indexed blockNumber, address indexed insurer, bytes32 previousBlockHash, uint256 insuranceCount)",
	"event MerkleTreeRequest(address indexed sender, uint256 indexed blockNumber, bytes32 docHash, uint256 timestamp)",
	"event MerkleTreeResponse(address indexed insurer, uint256 indexed blockNumber, bytes32 merkleRoot, bytes32[] proof, uint256 timestamp)"
];

async function connectWithMetaMask() {
	try {
		if (!window.ethereum) return showStatus('connectionStatus', 'MetaMask not detected. Please install MetaMask.', 'error');
		await window.ethereum.request({ method: 'eth_requestAccounts' });
		provider = new ethers.providers.Web3Provider(window.ethereum);
		const signer = provider.getSigner();
		const contractAddress = document.getElementById('contractAddress').value;
		if (!contractAddress) return showStatus('connectionStatus', 'Please enter the contract address', 'error');
		contract = new ethers.Contract(contractAddress, verifierAbi, signer);
		const account = await signer.getAddress();
		const net = await provider.getNetwork();
		showStatus('connectionStatus', `Connected with MetaMask (chain ${net.chainId})`, 'success');
		const acctEl = document.getElementById('accountAddress');
		if (acctEl) acctEl.innerText = `Account: ${account}`;
	} catch (e) { showStatus('connectionStatus', `MetaMask connect failed: ${e.message}`, 'error'); }
}

async function requestMerkleTree() {
	try {
		const blockNumber = document.getElementById('requestBlockNumber').value;
		const docHash = document.getElementById('requestDocHash').value;
		if (!blockNumber || !docHash) return showStatus('requestStatus', 'Fill all fields', 'error');
		await (await contract.requestMerkleTree(blockNumber, docHash)).wait();
		storeVerificationRequest(blockNumber, docHash);
		showStatus('requestStatus', `Request sent for block #${blockNumber}`, 'success');
		document.getElementById('requestBlockNumber').value = '';
		document.getElementById('requestDocHash').value = '';
	} catch (e) { showStatus('requestStatus', e.message, 'error'); }
}

function storeBlock(blockNumber, merkleRoot, insurer, insuranceCount) {
	const stored = JSON.parse(localStorage.getItem('blocks') || '{}');
	stored[blockNumber] = { merkleRoot, insurer, insuranceCount, timestamp: new Date().toISOString() };
	localStorage.setItem('blocks', JSON.stringify(stored));
}

function loadStoredBlocks() {
	const stored = JSON.parse(localStorage.getItem('blocks') || '{}');
	const container = document.getElementById('storedBlocks');
	if (Object.keys(stored).length === 0) return container.innerHTML = '<div class="status info">No stored blocks found</div>';
	container.innerHTML = '';
	Object.entries(stored).forEach(([blockNumber, data]) => {
		const item = document.createElement('div');
		item.className = 'block-item';
		item.innerHTML = `
			<div class="block-header">Block #${blockNumber}</div>
			<div class="block-data"><strong>Merkle Root:</strong> ${data.merkleRoot}<br><strong>Insurer:</strong> ${data.insurer}<br><strong>Insurance Count:</strong> ${data.insuranceCount}<br><strong>Stored:</strong> ${new Date(data.timestamp).toLocaleString()}</div>`;
		container.appendChild(item);
	});
}

function clearStoredBlocks() { localStorage.removeItem('blocks'); document.getElementById('storedBlocks').innerHTML = '<div class="status info">Storage cleared</div>'; }

function storeVerificationRequest(blockNumber, docHash) {
	const stored = JSON.parse(localStorage.getItem('verificationRequests') || '{}');
	const requestId = `${blockNumber}-${docHash}`;
	stored[requestId] = { blockNumber, docHash, timestamp: new Date().toISOString() };
	localStorage.setItem('verificationRequests', JSON.stringify(stored));
}

function loadVerificationRequests() {
	const stored = JSON.parse(localStorage.getItem('verificationRequests') || '{}');
	const container = document.getElementById('verificationRequests');
	if (Object.keys(stored).length === 0) return container.innerHTML = '<div class="status info">No verification requests found</div>';
	container.innerHTML = '';
	Object.entries(stored).forEach(([requestId, data]) => {
		const item = document.createElement('div');
		item.className = 'request-item';
		item.innerHTML = `
			<div class="request-header">Request: ${requestId}</div>
			<div class="request-data"><strong>Block Number:</strong> ${data.blockNumber}<br><strong>Document Hash:</strong> ${data.docHash}<br><strong>Requested:</strong> ${new Date(data.timestamp).toLocaleString()}</div>`;
		container.appendChild(item);
	});
}

function clearVerificationRequests() { localStorage.removeItem('verificationRequests'); document.getElementById('verificationRequests').innerHTML = '<div class="status info">Storage cleared</div>'; }

async function startListening() {
	if (!contract) return showStatus('eventsList', 'Please connect first', 'error');
	contract.on('InsuranceBlockCreated', (merkleRoot, timestamp, blockNumber, insurer, previousBlockHash, insuranceCount) => {
		addEventCard('eventsList', 'InsuranceBlockCreated', { merkleRoot, timestamp: timestamp.toString(), blockNumber: blockNumber.toString(), insurer, previousBlockHash, insuranceCount: insuranceCount.toString() });
		storeBlock(blockNumber.toString(), merkleRoot, insurer, insuranceCount.toString());
	});
	contract.on('MerkleTreeRequest', (sender, blockNumber, docHash, timestamp) => {
		addEventCard('eventsList', 'MerkleTreeRequest', { sender, blockNumber: blockNumber.toString(), docHash, timestamp: timestamp.toString() });
	});
	contract.on('MerkleTreeResponse', (insurer, blockNumber, merkleRoot, proof, timestamp) => {
		addEventCard('eventsList', 'MerkleTreeResponse', { insurer, blockNumber: blockNumber.toString(), merkleRoot, proof, timestamp: timestamp.toString() });
	});
	showStatus('eventsList', 'Listening for events...', 'info');
}

function stopListening() { if (contract) { contract.removeAllListeners(); showStatus('eventsList', 'Stopped listening for events', 'info'); } }
