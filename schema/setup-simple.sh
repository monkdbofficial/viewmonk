#!/bin/bash

# MonkDB AQI Platform - Simple HTTP Setup
# Executes SQL files via MonkDB HTTP API

set -e

MONKDB_URL="http://localhost:4200"

echo "========================================"
echo "MonkDB AQI Platform Setup"
echo "========================================"
echo ""
echo "MonkDB URL: $MONKDB_URL"
echo ""

# Function to execute SQL file
exec_sql() {
    local file=$1
    local desc=$2

    echo "[$desc]"
    echo "File: $file"

    # Test if file exists
    if [ ! -f "$file" ]; then
        echo "Error: File not found: $file"
        return 1
    fi

    # Read the file content
    local sql_content=$(cat "$file")

    # Execute via HTTP API
    local response=$(curl -s -X POST "${MONKDB_URL}/_sql" \
        -H "Content-Type: application/json" \
        -d "{\"stmt\": $(echo "$sql_content" | jq -Rs .)}")

    # Check for errors
    if echo "$response" | grep -q '"error"'; then
        echo "Error occurred:"
        echo "$response" | jq -r '.error.message' 2>/dev/null || echo "$response"

        # Check if it's just "already exists" error
        if echo "$response" | grep -qi "already.*exist"; then
            echo "⚠️  Tables already exist (this is OK if re-running)"
            return 0
        fi

        return 1
    fi

    echo "✓ Success"
    echo ""
    return 0
}

# Test connection
echo "Testing connection..."
test_result=$(curl -s -X POST "${MONKDB_URL}/_sql" \
    -H "Content-Type: application/json" \
    -d '{"stmt":"SELECT 1"}')

if echo "$test_result" | grep -q '"error"'; then
    echo "Error: Cannot connect to MonkDB at ${MONKDB_URL}"
    echo "Make sure MonkDB is running: docker ps"
    exit 1
fi

echo "✓ Connected to MonkDB"
echo ""

# Confirm
read -p "Continue with setup? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled"
    exit 0
fi

cd "$(dirname "$0")"

echo ""
echo "Step 1: Base Schema"
echo "========================================"
exec_sql "aqi-platform-schema.sql" "Base AQI Platform Schema"

echo "Step 2: Enterprise Extension"
echo "========================================"
exec_sql "aqi-enterprise-extension.sql" "Enterprise Features (11 tables)"

echo "Step 3: Sample Data"
echo "========================================"
exec_sql "sample-enterprise-data.sql" "Sample Data for Testing"

echo ""
echo "========================================"
echo "✓ Setup Complete!"
echo "========================================"
echo ""
echo "Your database now has:"
echo "  • 5 base tables (stations, readings, predictions, etc.)"
echo "  • 11 enterprise tables (agents, mitigation, pollution events, etc.)"
echo "  • Sample data for testing"
echo ""
echo "Next step:"
echo "  Refresh http://localhost:3000/aqi-dashboard"
echo ""
