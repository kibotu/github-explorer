#!/bin/bash

# Simple script to start a local web server
# Choose the first available method

PORT=8000

echo "Starting local web server on port $PORT..."
echo "Open your browser to: http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Try Python 3 first (most common)
if command -v python3 &> /dev/null; then
    echo "Using Python 3..."
    python3 -m http.server $PORT
# Try Python 2
elif command -v python &> /dev/null; then
    echo "Using Python 2..."
    python -m SimpleHTTPServer $PORT
# Try PHP
elif command -v php &> /dev/null; then
    echo "Using PHP..."
    php -S localhost:$PORT
# Try Node.js with npx
elif command -v npx &> /dev/null; then
    echo "Using Node.js (http-server)..."
    npx -y http-server -p $PORT
else
    echo "Error: No suitable web server found!"
    echo "Please install Python, PHP, or Node.js"
    exit 1
fi

