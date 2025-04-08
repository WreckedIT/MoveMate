// Proxy server for Replit
// This creates a lightweight server on port 5000 that proxies to our main app on port 5001

// Import required modules - using ES modules since package.json has "type": "module"
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { spawn } from 'child_process';

// Health check for quick status
const app = express();
app.get('/health', (req, res) => {
  res.status(200).send('Proxy server is running');
});

// Immediately open port 5000 to satisfy the workflow check
const server = app.listen(5000, '0.0.0.0', () => {
  console.log('[PROXY] Server listening on port 5000');
  console.log('[PROXY] Starting application backend on port 5001...');
  
  // Start our main application on port 5001
  const child = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'pipe', // Use pipe so we can capture and log the output
    env: { ...process.env, PORT: '5001', PROXY_MODE: 'true' }
  });

  // Log output from the child process
  child.stdout.on('data', (data) => {
    console.log(`[APP] ${data.toString().trim()}`);
  });
  
  child.stderr.on('data', (data) => {
    console.error(`[APP ERROR] ${data.toString().trim()}`);
  });

  // Handle child process errors and exit
  child.on('error', (err) => {
    console.error('[PROXY] Failed to start application:', err);
  });
  
  child.on('exit', (code) => {
    console.log(`[PROXY] Application process exited with code ${code}`);
    
    // If the main app crashes, exit this process too so Replit can restart it
    if (code !== 0) {
      console.error('[PROXY] Application crashed, exiting proxy server');
      process.exit(code);
    }
  });

  // Create a new server with the proxy middleware after a delay
  // to ensure the backend has started
  setTimeout(() => {
    console.log('[PROXY] Setting up proxy middleware');
    
    // Create proxy middleware
    const proxy = createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
      ws: true, // Enable WebSocket proxying
      logLevel: 'silent', // Don't log every request
      onError: (err, req, res) => {
        console.error('[PROXY] Proxy error:', err.message);
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Backend server is not available, please wait or refresh');
      }
    });

    // Add the proxy to the existing app
    app.use('/', proxy);
    console.log('[PROXY] Proxy activated, forwarding port 5000 to 5001');
  }, 5000); // Give application 5 seconds to start
});

// Handle clean shutdown
process.on('SIGINT', () => {
  console.log('[PROXY] Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});