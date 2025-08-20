const express = require('express');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

const webDir = path.join(__dirname, 'web');
app.use(express.static(webDir));

const binDir = path.join(__dirname, 'bin');
app.use('/bin', express.static(binDir));

// Default route to index.html
app.get('/', (_req, res) => {
	res.sendFile(path.join(webDir, 'index.html'));
});

// Start server
app.listen(PORT, () => {
	console.log(`CoverPass web server listening on http://localhost:${PORT}`);
	console.log(`Serving static files from: ${webDir}`);
	console.log(`Exposing artifacts under /bin from: ${binDir}`);

	const arg = process.argv.find((a) => a.startsWith('--open='));
	if (arg) {
		const page = arg.split('=')[1] || 'index';
		const map = { admin: 'admin.html', insurer: 'insurer.html', verifier: 'verifier.html', index: 'index.html' };
		const file = map[page] || 'index.html';
		const url = `http://localhost:${PORT}/${file}`;
		openUrl(url);
	}
});

function openUrl(url) {
	const platform = process.platform;
	if (platform === 'win32') {
		exec(`start "" "${url}"`, { shell: 'cmd.exe' });
	} else if (platform === 'darwin') {
		exec(`open "${url}"`);
	} else {
		exec(`xdg-open "${url}"`);
	}
}
