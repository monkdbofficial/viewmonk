#!/bin/bash

# Development script for MonkDB Workbench
# Runs the app in development mode with hot reload

set -e

echo "🚀 Starting MonkDB Workbench in development mode..."
echo ""

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Error: Rust is not installed"
    echo "   Please install Rust from https://rustup.rs"
    exit 1
fi

# Install Node dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start development server
echo "🔥 Starting development server..."
echo "   Frontend: http://localhost:3000"
echo "   Backend: Tauri (Rust)"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npm run tauri dev
