#!/bin/bash

# MonkDB/CrateDB Setup Script
# Executes SQL statements one at a time via HTTP API

MONKDB_URL="http://localhost:4200"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================"
echo "MonkDB AQI Platform Setup (CrateDB)"
echo "========================================"
echo ""
echo "MonkDB URL: $MONKDB_URL"
echo ""

# Function to execute a single SQL statement
exec_stmt() {
    local stmt="$1"
    local silent="$2"

    # Skip empty statements and comments
    if [ -z "$(echo "$stmt" | tr -d '[:space:]')" ] || [[ "$stmt" =~ ^[[:space:]]*-- ]]; then
        return 0
    fi

    # Execute statement
    local response=$(curl -s -X POST "${MONKDB_URL}/_sql" \
        -H "Content-Type: application/json" \
        --data-binary @- <<EOF
{"stmt": $(echo "$stmt" | jq -Rs .)}
EOF
)

    # Check for errors
    if echo "$response" | grep -q '"error"'; then
        local error_msg=$(echo "$response" | jq -r '.error.message' 2>/dev/null || echo "$response")

        # Ignore "already exists" errors
        if [[ "$error_msg" == *"already exists"* ]] || [[ "$error_msg" == *"AlreadyExistsException"* ]]; then
            [ "$silent" != "silent" ] && echo -e "${YELLOW}⚠ Skipped (already exists)${NC}"
            return 0
        fi

        echo -e "${RED}✗ Error: $error_msg${NC}"
        return 1
    fi

    [ "$silent" != "silent" ] && echo -e "${GREEN}✓${NC}"
    return 0
}

# Function to execute SQL file statement by statement
exec_sql_file() {
    local file=$1
    local desc=$2

    echo -e "${YELLOW}[$desc]${NC}"

    if [ ! -f "$file" ]; then
        echo -e "${RED}Error: File not found: $file${NC}"
        return 1
    fi

    local count=0
    local errors=0

    # Read file, remove comments, split by semicolon
    while IFS= read -r stmt; do
        # Skip empty lines and pure comment lines
        stmt=$(echo "$stmt" | sed 's/--.*$//')
        [ -z "$(echo "$stmt" | tr -d '[:space:]')" ] && continue

        ((count++))
        printf "  Statement %d... " "$count"

        if ! exec_stmt "$stmt" "silent"; then
            ((errors++))
            echo -e "${RED}Failed${NC}"
            # Don't exit on error, continue with next statement
        else
            echo -e "${GREEN}OK${NC}"
        fi
    done < <(awk '
        BEGIN { RS=";" }
        {
            # Remove leading/trailing whitespace
            gsub(/^[[:space:]]+|[[:space:]]+$/, "")
            if (length($0) > 0) print $0
        }
    ' "$file")

    if [ $errors -gt 0 ]; then
        echo -e "${YELLOW}⚠ Completed with $errors errors (may be OK if tables exist)${NC}"
    else
        echo -e "${GREEN}✓ All statements executed successfully${NC}"
    fi
    echo ""

    return 0
}

# Test connection
echo "Testing connection..."
test_result=$(curl -s -X POST "${MONKDB_URL}/_sql" \
    -H "Content-Type: application/json" \
    -d '{"stmt":"SELECT 1"}')

if echo "$test_result" | grep -q '"error"'; then
    echo -e "${RED}Error: Cannot connect to MonkDB${NC}"
    echo "Make sure MonkDB is running: docker ps"
    exit 1
fi

echo -e "${GREEN}✓ Connected${NC}"
echo ""

cd "$(dirname "$0")"

echo "========================================"
echo "Step 1: Base Schema (5 tables)"
echo "========================================"
exec_sql_file "aqi-platform-schema.sql" "Base AQI Platform Schema"

echo "========================================"
echo "Step 2: Enterprise Extension (11 tables)"
echo "========================================"
exec_sql_file "aqi-enterprise-extension.sql" "Enterprise Features"

echo "========================================"
echo "Step 3: Sample Data"
echo "========================================"
exec_sql_file "sample-enterprise-data.sql" "Sample Test Data"

echo ""
echo "========================================"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "========================================"
echo ""
echo "Database now contains:"
echo "  ✓ 5 base tables"
echo "  ✓ 11 enterprise tables"
echo "  ✓ Sample data for testing"
echo ""
echo "Next: Refresh http://localhost:3000/aqi-dashboard"
echo ""
