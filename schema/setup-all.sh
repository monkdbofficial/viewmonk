#!/bin/bash

# MonkDB AQI Platform - Complete Setup Script
# This script sets up all database schemas, tables, and sample data

set -e  # Exit on error

echo "========================================"
echo "MonkDB AQI Platform Setup"
echo "========================================"
echo ""

# Configuration
DB_HOST="${MONKDB_HOST:-localhost}"
DB_PORT="${MONKDB_PORT:-5432}"
DB_NAME="${MONKDB_DATABASE:-monkdb}"
DB_USER="${MONKDB_USER:-crate}"
DB_PASSWORD="${MONKDB_PASSWORD:-}"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to execute SQL file
execute_sql() {
    local file=$1
    local description=$2

    echo -e "${YELLOW}[$description]${NC}"
    echo "Executing: $file"

    if [ -z "$DB_PASSWORD" ]; then
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file"
    else
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file"
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Success${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
        exit 1
    fi
    echo ""
}

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql command not found${NC}"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Setup Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
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
execute_sql "$SCRIPT_DIR/aqi-platform-schema.sql" "Creating base AQI platform schema"

echo "========================================"
echo "Step 2: Enterprise Extension"
echo "========================================"
execute_sql "$SCRIPT_DIR/aqi-enterprise-extension.sql" "Adding enterprise features (agents, mitigation, compliance)"

echo "========================================"
echo "Step 3: Sample Data"
echo "========================================"
execute_sql "$SCRIPT_DIR/sample-enterprise-data.sql" "Loading sample enterprise data"

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
echo "  1. Visit http://localhost:3000/aqi-dashboard"
echo "  2. Test the enterprise features:"
echo "     - 24×7 Agent Activity Monitor"
echo "     - Automated Mitigation Actions Tracker"
echo "     - Pollution Source Classification"
echo "     - Geo-Temporal Correlation"
echo ""
echo "API Documentation:"
echo "  See docs/ENTERPRISE_API_GUIDE.md"
echo ""
