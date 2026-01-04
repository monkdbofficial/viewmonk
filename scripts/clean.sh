#!/bin/bash

# Clean script for MonkDB Workbench
# Removes all build artifacts and dependencies

set -e

echo "🧹 Cleaning MonkDB Workbench build artifacts..."
echo ""

# Remove Next.js build output
if [ -d "out" ]; then
    echo "Removing Next.js build output (out/)..."
    rm -rf out
fi

if [ -d ".next" ]; then
    echo "Removing Next.js cache (.next/)..."
    rm -rf .next
fi

# Remove Tauri build output
if [ -d "src-tauri/target" ]; then
    echo "Removing Tauri build output (src-tauri/target/)..."
    rm -rf src-tauri/target
fi

# Remove Node modules (optional, commented out by default)
# if [ -d "node_modules" ]; then
#     echo "Removing Node modules..."
#     rm -rf node_modules
# fi

# Remove Cargo.lock (optional, commented out by default)
# if [ -f "src-tauri/Cargo.lock" ]; then
#     echo "Removing Cargo.lock..."
#     rm src-tauri/Cargo.lock
# fi

echo ""
echo "✅ Clean completed!"
echo ""
echo "To do a full clean including dependencies, run:"
echo "   rm -rf node_modules src-tauri/Cargo.lock"
