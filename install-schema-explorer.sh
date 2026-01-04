#!/bin/bash

# Schema Explorer Installation Script
# MonkDB Workbench

echo "================================================"
echo "Schema Explorer Installation"
echo "MonkDB Workbench - Enhanced Schema Browser"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found!"
    echo "Please run this script from the MonkDB Workbench root directory."
    exit 1
fi

echo "✓ Found package.json"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed!"
    echo "Please install Node.js first: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed!"
    exit 1
fi

echo "✓ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "Installing React DnD dependencies..."
echo ""

npm install react-dnd react-dnd-html5-backend

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "✓ Installation Complete!"
    echo "================================================"
    echo ""
    echo "Schema Explorer has been successfully installed."
    echo ""
    echo "Next steps:"
    echo "  1. Start the development server: npm run dev"
    echo "  2. Or build for Tauri: npm run tauri:dev"
    echo "  3. Navigate to Query Editor and click 'Schema' tab"
    echo ""
    echo "Features:"
    echo "  • Hierarchical tree view of schemas, tables, columns"
    echo "  • Drag-and-drop tables/columns into editor"
    echo "  • Right-click context menu for quick actions"
    echo "  • Visual indicators for primary keys, indexes, etc."
    echo "  • Search and filter functionality"
    echo ""
    echo "Documentation: See SCHEMA_EXPLORER_README.md"
    echo "================================================"
else
    echo ""
    echo "================================================"
    echo "✗ Installation Failed"
    echo "================================================"
    echo ""
    echo "Please check the error messages above and try again."
    echo "You may need to run: npm cache clean --force"
    exit 1
fi
