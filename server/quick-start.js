// Ultra-simple quick-start.js for Replit
// This immediately opens port 5000, then starts the real server

const http = require('http');
const { exec } = require('child_process');
const path = require('path');

// Create the simplest possible server
const port = parseInt(process.env.PORT || '5000', 10);
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('QuickStart OK');
});

// Start listening immediately to satisfy Replit
server.listen(port, '0.0.0.0', () => {
  console.log(`QuickStart: Port ${port} is now open`);

  // Wait a minimal amount of time then start the real server
  setTimeout(() => {
    // Start the actual server with npm run dev
    console.log('QuickStart: Starting the main application...');
    
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = exec(`${npmCmd} run dev`, {
      env: { ...process.env, QUICKSTART: 'true' }
    });
    
    // Log output from the child process
    child.stdout.on('data', (data) => {
      console.log(`[SERVER] ${data.toString().trim()}`);
    });
    
    child.stderr.on('data', (data) => {
      console.error(`[SERVER ERROR] ${data.toString().trim()}`);
    });
    
    // Handle process exit
    child.on('exit', (code) => {
      console.log(`QuickStart: Child process exited with code ${code}`);
      process.exit(code || 0);
    });
  }, 100);
});

// Handle clean shutdown
process.on('SIGINT', () => {
  console.log('QuickStart: Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});