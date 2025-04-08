// Ultra-simple quick-start.js for Replit
// This immediately opens port 5000, then starts the real server

// Use ESM-compatible imports
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');

// Create a simple express app for immediate port binding
const app = express();
app.get('/health', (req, res) => {
  res.status(200).send('OK - QuickStart is running');
});

// Create the simplest possible server
const port = parseInt(process.env.PORT || '5000', 10);
const mainAppPort = port + 1; // Use port 5001 for main app

// Start listening immediately to satisfy Replit
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`QuickStart: Port ${port} is now open and responding`);

  // Start our main application on port 5001
  console.log(`QuickStart: Starting main application on port ${mainAppPort}...`);
  
  // Set this environment variable to tell our app to use a different port
  process.env.PORT = mainAppPort.toString();
  process.env.QUICKSTART = 'true';
  
  const child = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'pipe', // Use pipe so we can capture the output
    env: process.env
  });
  
  // Log output from the child process
  child.stdout.on('data', (data) => {
    console.log(`[APP] ${data.toString().trim()}`);
  });
  
  child.stderr.on('data', (data) => {
    console.error(`[APP ERROR] ${data.toString().trim()}`);
  });
  
  // Handle process exit
  child.on('exit', (code) => {
    console.log(`QuickStart: Child process exited with code ${code}`);
    process.exit(code || 0);
  });
  
  // Setup proxy after a short delay to ensure main app is running
  setTimeout(() => {
    console.log('QuickStart: Setting up proxy to main application...');
    
    // Create proxy middleware
    const proxy = createProxyMiddleware({
      target: `http://localhost:${mainAppPort}`,
      changeOrigin: true,
      ws: true, // Enable WebSocket proxying
      logLevel: 'warn'
    });
    
    // Add the proxy to our express app
    app.use('/', proxy);
    console.log(`QuickStart: Proxy ready - forwarding port ${port} to ${mainAppPort}`);
  }, 5000); // Give our app 5 seconds to start
});

// Handle clean shutdown
process.on('SIGINT', () => {
  console.log('QuickStart: Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});