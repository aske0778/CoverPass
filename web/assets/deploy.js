let provider, signer;

async function connectWithMetaMask() {
	try {
		if (!window.ethereum) return setStatus('status', 'MetaMask not detected', 'error');
		await window.ethereum.request({ method: 'eth_requestAccounts' });
		provider = new ethers.providers.Web3Provider(window.ethereum);
		signer = provider.getSigner();
		const account = await signer.getAddress();
		const net = await provider.getNetwork();
		setStatus('status', `Connected: ${account} (chain ${net.chainId})`, 'success');
		const acctEl = document.getElementById('accountAddress');
		if (acctEl) acctEl.innerText = `Account: ${account}`;
	} catch (e) { setStatus('status', `MetaMask connect failed: ${e.message}`, 'error'); }
}

async function loadArtifacts() {
	try {
		const abiResp = await fetch('/bin/contracts/CoverPass.abi');
		const binResp = await fetch('/bin/contracts/CoverPass.bin');
		if (!abiResp.ok || !binResp.ok) throw new Error('Artifacts not found in bin/contracts. Ensure CoverPass.abi and CoverPass.bin exist.');
		const abiText = await abiResp.text();
		const binText = await binResp.text();
		document.getElementById('abi').value = abiText.trim();
		document.getElementById('bytecode').value = binText.trim();
		setStatus('status', 'Loaded artifacts from bin/contracts/', 'success');
	} catch (e) { setStatus('status', e.message, 'error'); }
}

async function deploy() {
	try {
		if (!signer) return setStatus('status', 'Connect MetaMask first', 'error');
		const abiText = document.getElementById('abi').value.trim();
		const bytecode = document.getElementById('bytecode').value.trim();
		if (!abiText || !bytecode) return setStatus('status', 'Paste ABI and bytecode (or load artifacts)', 'error');
		const abi = JSON.parse(abiText);
		const factory = new ethers.ContractFactory(abi, bytecode, signer);
		setStatus('status', 'Sending deploy tx…', 'info');
		const contract = await factory.deploy();
		setStatus('status', `Tx sent: ${contract.deployTransaction.hash}`, 'info');
		await contract.deployed();
		document.getElementById('deployedAddress').innerText = `Deployed at: ${contract.address}`;
		setStatus('status', 'Deployment complete', 'success');
	} catch (e) { setStatus('status', `Deploy failed: ${e.message}`, 'error'); }
}

function setStatus(id, msg, type='info') {
	const el = document.getElementById(id);
	if (el) el.innerHTML = `<div class="status ${type}">${msg}</div>`;
}

