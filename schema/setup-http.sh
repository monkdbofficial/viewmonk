#!/bin/bash

# MonkDB AQI Platform - HTTP API Setup Script
# Uses MonkDB's HTTP endpoint (_sql) instead of PostgreSQL wire protocol

set -e  # Exit on error

echo "========================================"
echo "MonkDB AQI Platform Setup (HTTP API)"
echo "========================================"
echo ""

# Configuration
MONKDB_URL="${MONKDB_URL:-http://localhost:4200}"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Setup Configuration:"
echo "  MonkDB URL: $MONKDB_URL"
echo ""

# Function to execute SQL file via HTTP
execute_sql() {
    local file=$1
    local description=$2

    echo -e "${YELLOW}[$description]${NC}"
    echo "Executing: $file"

    # Read SQL file and execute via HTTP API
    # Split into individual statements and execute one by one
    local response=$(curl -s -X POST "${MONKDB_URL}/_sql" \
        -H "Content-Type: application/json" \
        -d @- <<EOF
{
  "stmt": $(cat "$file" | jq -Rs .)
}
EOF
)

    # Check for errors in response
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        local error_msg=$(echo "$response" | jq -r '.error.message')
        echo -e "${RED}✗ Failed: $error_msg${NC}"

        # If error is about table already existing, that's OK
        if [[ "$error_msg" == *"already exists"* ]] || [[ "$error_msg" == *"AlreadyExistsException"* ]]; then
            echo -e "${YELLOW}  (Table already exists - skipping)${NC}"
            return 0
        fi

        return 1
    fi

    echo -e "${GREEN}✓ Success${NC}"
    echo ""
    return 0
}

# Check if jq is available (needed for JSON processing)
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq command not found${NC}"
    echo "Please install jq:"
    echo "  macOS: brew install jq"
    echo "  Ubuntu: sudo apt-get install jq"
    exit 1
fi

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl command not found${NC}"
    echo "Please install curl"
    exit 1
fi

# Test MonkDB connection
echo "Testing MonkDB connection..."
response=$(curl -s -w "\n%{http_code}" -X POST "${MONKDB_URL}/_sql" \
    -H "Content-Type: application/json" \
    -d '{"stmt":"SELECT 1"}')

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" != "200" ]; then
    echo -e "${RED}Error: Cannot connect to MonkDB at ${MONKDB_URL}${NC}"
    echo "Please make sure MonkDB is running on port 4200"
    echo "Check with: docker ps"
    exit 1
fi
echo -e "${GREEN}✓ Connected to MonkDB${NC}"
echo ""

read -p "Continue with setup? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled"
    exit 0
fi

echo ""
echo "========================================"
echo "Step 1: Base Schema"
echo "========================================"
execute_sql "$SCRIPT_DIR/aqi-platform-schema.sql" "Creating base AQI platform schema" || exit 1

echo "========================================"
echo "Step 2: Enterprise Extension"
echo "========================================"
execute_sql "$SCRIPT_DIR/aqi-enterprise-extension.sql" "Adding enterprise features" || exit 1

echo "========================================"
echo "Step 3: Sample Data"
echo "========================================"
execute_sql "$SCRIPT_DIR/sample-enterprise-data.sql" "Loading sample enterprise data" || exit 1

echo ""
echo "========================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "========================================"
echo ""
echo "Database is now ready with:"
echo "  ✓ Base AQI platform schema"
echo "  ✓ Enterprise features (11 tables)"
echo "  ✓ Sample data for testing"
echo ""
echo "Next steps:"
echo "  1. Refresh your browser at http://localhost:3000/aqi-dashboard"
echo "  2. You should now see:"
echo "     ✓ 24×7 Agent Activity Monitor (with data)"
echo "     ✓ Automated Mitigation Actions Tracker (with data)"
echo "     ✓ Pollution Source Classification (with data)"
echo ""
echo "API Documentation:"
echo "  See docs/ENTERPRISE_API_GUIDE.md"
echo ""
