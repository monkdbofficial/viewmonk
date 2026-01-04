#!/bin/bash

# MonkDB Workbench - Quick Start MonkDB Script
# This script quickly starts a MonkDB instance for development

set -e

echo "🚀 Starting MonkDB for MonkDB Workbench"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo ""
    echo "Please install Docker first:"
    echo "  macOS:   https://www.docker.com/products/docker-desktop"
    echo "  Linux:   sudo apt-get install docker.io"
    echo "  Windows: https://www.docker.com/products/docker-desktop"
    echo ""
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Check if MonkDB container already exists
if docker ps -a | grep -q monkdb; then
    echo "📦 MonkDB container already exists"

    # Check if it's running
    if docker ps | grep -q monkdb; then
        echo "✅ MonkDB is already running!"
        echo ""
        echo "📍 Access MonkDB:"
        echo "   Admin UI:  http://localhost:4200"
        echo "   SQL Port:  localhost:5432"
        echo ""
        exit 0
    else
        echo "▶️  Starting existing container..."
        docker start monkdb
    fi
else
    echo "📦 Creating new MonkDB container..."
    docker run -d \
        --name monkdb \
        -p 4200:4200 \
        -p 5432:5432 \
        -v monkdb-data:/data \
        -e MONK_HEAP_SIZE=2g \
        monk:latest \
        monk \
        -Ccluster.name=monkdb-cluster \
        -Cnode.name=monkdb-node1 \
        -Cnetwork.host=0.0.0.0 \
        -Cdiscovery.type=single-node
fi

echo ""
echo "⏳ Waiting for MonkDB to be ready..."
sleep 10

# Test if MonkDB is accessible
echo "🔍 Testing connection..."
if curl -s http://localhost:4200 > /dev/null; then
    echo "✅ MonkDB is ready!"
else
    echo "⏱️  MonkDB is starting... (this may take a few more seconds)"
    sleep 5

    if curl -s http://localhost:4200 > /dev/null; then
        echo "✅ MonkDB is ready!"
    else
        echo "⚠️  MonkDB might still be starting. Check logs with:"
        echo "   docker logs monkdb"
    fi
fi

echo ""
echo "🎉 MonkDB is running!"
echo "====================="
echo ""
echo "📍 Access Points:"
echo "   Admin UI:      http://localhost:4200"
echo "   SQL Endpoint:  http://localhost:4200/_sql"
echo "   PostgreSQL:    localhost:5432"
echo ""
echo "🔗 Connection Settings for Workbench:"
echo "   Host:     localhost"
echo "   Port:     4200"
echo "   Database: doc"
echo "   Username: (leave empty)"
echo "   Password: (leave empty)"
echo ""
echo "📝 Useful Commands:"
echo "   Stop:    docker stop monkdb"
echo "   Start:   docker start monkdb"
echo "   Remove:  docker rm -f monkdb"
echo "   Logs:    docker logs -f monkdb"
echo ""
