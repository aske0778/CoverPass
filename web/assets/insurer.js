let provider, wallet, contract;
let eventListener = null;

const insurerAbi = [
	"function createInsuranceBlock(bytes32 newRoot, uint256 insuranceCount) external",
	"function respondMerkleTree(uint256 blockNumber, bytes32 merkleRoot, bytes32 docHash, bytes32[] calldata proof) external",
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
		contract = new ethers.Contract(contractAddress, insurerAbi, signer);
		const account = await signer.getAddress();
		const net = await provider.getNetwork();
		showStatus('connectionStatus', `Connected with MetaMask (chain ${net.chainId})`, 'success');
		const acctEl = document.getElementById('accountAddress');
		if (acctEl) acctEl.innerText = `Account: ${account}`;
	} catch (e) { showStatus('connectionStatus', `MetaMask connect failed: ${e.message}`, 'error'); }
}

async function createInsuranceBlock() {
	try {
		const merkleRoot = document.getElementById('merkleRoot').value;
		const insuranceCount = document.getElementById('insuranceCount').value;
		if (!merkleRoot || !insuranceCount) return showStatus('blockStatus', 'Fill all fields', 'error');
		await (await contract.createInsuranceBlock(merkleRoot, insuranceCount)).wait();
		const block = await contract.getCurrentBlock();
		storeMerkleTree(block.blockNumber.toString(), merkleRoot, insuranceCount);
		showStatus('blockStatus', `Block created! #${block.blockNumber}`, 'success');
		document.getElementById('merkleRoot').value = '';
		document.getElementById('insuranceCount').value = '';
	} catch (e) { showStatus('blockStatus', e.message, 'error'); }
}

async function respondMerkleTree() {
	try {
		const blockNumber = document.getElementById('requestBlockNumber').value;
		const merkleRoot = document.getElementById('requestMerkleRoot').value;
		const docHash = document.getElementById('requestDocHash').value;
		const proofText = document.getElementById('requestProof').value;
		if (!blockNumber || !merkleRoot || !docHash || !proofText) return showStatus('responseStatus', 'Fill all fields', 'error');
		let proof = JSON.parse(proofText);
		await (await contract.respondMerkleTree(blockNumber, merkleRoot, docHash, proof)).wait();
		showStatus('responseStatus', 'Response sent!', 'success');
		document.getElementById('requestBlockNumber').value = '';
		document.getElementById('requestMerkleRoot').value = '';
		document.getElementById('requestDocHash').value = '';
		document.getElementById('requestProof').value = '';
	} catch (e) { showStatus('responseStatus', e.message, 'error'); }
}

function storeMerkleTree(blockNumber, merkleRoot, insuranceCount) {
	const stored = JSON.parse(localStorage.getItem('merkleTrees') || '{}');
	stored[blockNumber] = { merkleRoot, insuranceCount, timestamp: new Date().toISOString() };
	localStorage.setItem('merkleTrees', JSON.stringify(stored));
}

function loadStoredMerkleTrees() {
	const stored = JSON.parse(localStorage.getItem('merkleTrees') || '{}');
	const container = document.getElementById('storedMerkleTrees');
	if (Object.keys(stored).length === 0) return container.innerHTML = '<div class="status info">No stored merkle trees found</div>';
	container.innerHTML = '';
	Object.entries(stored).forEach(([blockNumber, data]) => {
		const item = document.createElement('div');
		item.className = 'merkle-item';
		item.innerHTML = `
			<div class="merkle-header">Block #${blockNumber}</div>
			<div class="merkle-data"><strong>Merkle Root:</strong> ${data.merkleRoot}<br><strong>Insurance Count:</strong> ${data.insuranceCount}<br><strong>Stored:</strong> ${new Date(data.timestamp).toLocaleString()}</div>`;
		container.appendChild(item);
	});
}

function clearStoredMerkleTrees() {
	localStorage.removeItem('merkleTrees');
	document.getElementById('storedMerkleTrees').innerHTML = '<div class="status info">Storage cleared</div>';
}

async function startListening() {
	if (!contract) return showStatus('eventsList', 'Please connect first', 'error');
	contract.on('InsuranceBlockCreated', (merkleRoot, timestamp, blockNumber, insurer, previousBlockHash, insuranceCount) => {
		addEventCard('eventsList', 'InsuranceBlockCreated', { merkleRoot, timestamp: timestamp.toString(), blockNumber: blockNumber.toString(), insurer, previousBlockHash, insuranceCount: insuranceCount.toString() });
	});
	contract.on('MerkleTreeRequest', (sender, blockNumber, docHash, timestamp) => {
		addEventCard('eventsList', 'MerkleTreeRequest', { sender, blockNumber: blockNumber.toString(), docHash, timestamp: timestamp.toString() });
	});
	contract.on('MerkleTreeResponse', (insurer, blockNumber, merkleRoot, proof, timestamp) => {
		addEventCard('eventsList', 'MerkleTreeResponse', { insurer, blockNumber: blockNumber.toString(), merkleRoot, proof, timestamp: timestamp.toString() });
	});
	showStatus('eventsList', 'Listening for events...', 'info');
}

function stopListening() {
	if (contract) {
		contract.removeAllListeners();
		showStatus('eventsList', 'Stopped listening for events', 'info');
	}
}

function randomBytes32() {
	const bytes = new Uint8Array(32);
	if (window.crypto && window.crypto.getRandomValues) {
		window.crypto.getRandomValues(bytes);
	} else {
		for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
	}
	let hex = '0x';
	for (const b of bytes) hex += b.toString(16).padStart(2, '0');
	return hex;
}

async function createDummyInsuranceBlock() {
	try {
		if (!contract) return showStatus('blockStatus', 'Connect first', 'error');
		const dummyRoot = randomBytes32();
		const dummyCount = 5;
		showStatus('blockStatus', 'Sending dummy block tx…', 'info');
		await (await contract.createInsuranceBlock(dummyRoot, dummyCount)).wait();
		const block = await contract.getCurrentBlock();
		storeMerkleTree(block.blockNumber.toString(), dummyRoot, dummyCount);
		showStatus('blockStatus', `Dummy block created! #${block.blockNumber}`, 'success');
	} catch (e) { showStatus('blockStatus', e.message, 'error'); }
}

window.connectWithMetaMask = connectWithMetaMask;
window.createInsuranceBlock = createInsuranceBlock;
window.createDummyInsuranceBlock = createDummyInsuranceBlock;
window.respondMerkleTree = respondMerkleTree;
window.startListening = startListening;
window.stopListening = stopListening;
