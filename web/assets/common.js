// Ethers loader with fallback
(function ensureEthers() {
	const primary = 'https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js';
	const fallback = 'https://unpkg.com/ethers@5.7.2/dist/ethers.umd.min.js';
	function load(src) {
		return new Promise((resolve, reject) => {
			const s = document.createElement('script');
			s.src = src;
			s.onload = resolve;
			s.onerror = reject;
			document.head.appendChild(s);
		});
	}
	if (typeof window.ethers === 'undefined') {
		load(primary).catch(() => load(fallback)).catch(() => {
			console.error('Failed to load Ethers.js');
			alert('Failed to load Ethers.js library. Please check your internet connection.');
		});
	}
})();

// Shared helpers
function showStatus(elementId, message, type = 'info') {
	const element = document.getElementById(elementId);
	if (!element) return;
	element.innerHTML = `<div class="status ${type}">${message}</div>`;
}

function addEventCard(listId, title, data) {
	const list = document.getElementById(listId);
	if (!list) return;
	const item = document.createElement('div');
	item.className = 'event-item';
	item.innerHTML = `
		<strong>${title}</strong><br>
		<small>${new Date().toLocaleTimeString()}</small><br>
		<pre>${JSON.stringify(data, null, 2)}</pre>
	`;
	list.insertBefore(item, list.firstChild);
}

async function viewCurrentBlock() {
	try {
		const block = await contract.getCurrentBlock();
		document.getElementById('currentBlock').innerHTML = `
			<div class="stat-card"><div class="stat-label">Merkle Root</div><div class="stat-value">${block.merkleRoot}</div></div>
			<div class="stat-card"><div class="stat-label">Block Number</div><div class="stat-value">${block.blockNumber}</div></div>
			<div class="stat-card"><div class="stat-label">Insurer</div><div class="stat-value">${block.insurer}</div></div>
			<div class="stat-card"><div class="stat-label">Insurance Count</div><div class="stat-value">${block.insuranceCount}</div></div>`;
	} catch (e) {
		document.getElementById('currentBlock').innerHTML = `<div class="status error">${e.message}</div>`;
	}
}

async function viewStatistics() {
	try {
		const [totalBlocks, totalInsurance] = await contract.getStatistics();
		document.getElementById('statistics').innerHTML = `
			<div class="stats-grid">
				<div class="stat-card"><div class="stat-value">${totalBlocks}</div><div class="stat-label">Total Blocks</div></div>
				<div class="stat-card"><div class="stat-value">${totalInsurance}</div><div class="stat-label">Total Insurance</div></div>
			</div>`;
	} catch (e) { document.getElementById('statistics').innerHTML = `<div class="status error">${e.message}</div>`; }
}