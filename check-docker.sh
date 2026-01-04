#!/bin/bash

echo "🔍 Checking Docker status..."
echo ""

# Check if Docker command exists
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is NOT installed"
    echo ""
    echo "Please install Docker Desktop:"
    echo "  Option 1: brew install --cask docker"
    echo "  Option 2: Download from https://www.docker.com/products/docker-desktop"
    echo ""
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Check if Docker daemon is running
if ! docker ps &> /dev/null; then
    echo "❌ Docker is installed but NOT running"
    echo ""
    echo "Please:"
    echo "  1. Open Docker Desktop application"
    echo "  2. Wait for the whale icon (🐋) to appear in your menu bar"
    echo "  3. Run this script again"
    echo ""
    exit 1
fi

echo "✅ Docker is running!"
echo ""
echo "🎉 You're ready to start MonkDB!"
echo ""
echo "Next step: Run ./scripts/start-monkdb.sh"
echo ""
