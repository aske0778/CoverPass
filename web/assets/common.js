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
