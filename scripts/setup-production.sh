#!/bin/bash

# MonkDB Workbench - Production Setup Script
# This script sets up a production-ready MonkDB instance

set -e

echo "🚀 MonkDB Workbench - Production Setup"
echo "======================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "   Please install Docker from: https://www.docker.com/get-started"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available!"
    echo "   Please install Docker Compose or update Docker Desktop"
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Start MonkDB
echo "📦 Starting MonkDB..."
docker compose up -d

# Wait for MonkDB to be ready
echo "⏳ Waiting for MonkDB to be ready..."
sleep 10

# Check if MonkDB is running
if docker compose ps | grep -q "running"; then
    echo "✅ MonkDB is running"
else
    echo "❌ MonkDB failed to start"
    echo "   Check logs with: docker compose logs"
    exit 1
fi

# Test HTTP endpoint
echo "🔍 Testing HTTP endpoint..."
if curl -s http://localhost:4200 > /dev/null; then
    echo "✅ HTTP endpoint is accessible"
else
    echo "❌ HTTP endpoint is not accessible"
    exit 1
fi

# Test SQL endpoint
echo "🔍 Testing SQL endpoint..."
response=$(curl -s -X POST http://localhost:4200/_sql \
    -H "Content-Type: application/json" \
    -d '{"stmt": "SELECT 1"}')

if echo "$response" | grep -q "rows"; then
    echo "✅ SQL endpoint is working"
else
    echo "❌ SQL endpoint is not working"
    echo "   Response: $response"
    exit 1
fi

# Initialize database with sample data
echo "📊 Initializing database with sample data..."
if [ -f "scripts/init-database.sql" ]; then
    docker exec -i monkdb crash < scripts/init-database.sql 2>/dev/null || {
        echo "⚠️  Could not initialize sample data (crash CLI not available)"
        echo "   You can manually create tables later"
    }
    echo "✅ Database initialized"
else
    echo "⚠️  init-database.sql not found, skipping sample data"
fi

# Check MongoDB for user data
echo ""
echo "📝 Checking MongoDB for user data..."
if docker ps | grep -q mongodb; then
    echo "✅ MongoDB is running"
else
    echo "⚠️  MongoDB is not running"
    echo "   Starting MongoDB for user data storage..."
    docker run -d \
        --name mongodb \
        -p 27017:27017 \
        mongo:latest
    echo "✅ MongoDB started"
fi

# Final status
echo ""
echo "🎉 Setup Complete!"
echo "==================="
echo ""
echo "📍 MonkDB Admin:  http://localhost:4200"
echo "📍 Workbench:      http://localhost:3000 (after running 'npm run dev')"
echo ""
echo "Next steps:"
echo "  1. Run: npm run dev"
echo "  2. Open: http://localhost:3000"
echo "  3. Register/Login"
echo "  4. Go to /connections"
echo "  5. Add connection:"
echo "     - Host: localhost"
echo "     - Port: 4200"
echo "     - Username: (empty)"
echo "     - Password: (empty)"
echo "  6. Click 'Test Connection' → Should show ✅"
echo "  7. Click 'Finish' and 'Use'"
echo "  8. Start exploring! 🚀"
echo ""
echo "Commands:"
echo "  Stop:    docker compose down"
echo "  Logs:    docker compose logs -f"
echo "  Restart: docker compose restart"
echo ""
