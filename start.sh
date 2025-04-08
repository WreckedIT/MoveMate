#!/bin/bash
# Startup script that uses our proxy server to handle the port 5000 requirement

# Log the startup process
echo "Starting application via proxy server on port 5000..."

# Start the proxy server that will handle both the port check and proxying to the main app
node server.js 
