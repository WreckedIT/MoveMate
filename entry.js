// Entry point - delegates to server.js which handles the proxy setup
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('[ENTRY] Starting application proxy server...');

// Run server.js which will handle the proxy and main app startup
const server = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('[ENTRY] Failed to start server:', err);
  process.exit(1);
});

// Ensure clean shutdown
process.on('SIGINT', () => {
  console.log('[ENTRY] Received shutdown signal, closing...');
  server.kill();
  process.exit(0);
});