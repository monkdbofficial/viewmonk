#!/bin/bash

# Script to generate Tauri update signing keys
# This script generates a public/private key pair for signing app updates

set -e

echo "🔐 Generating Tauri Update Signing Keys..."
echo ""

# Check if Tauri CLI is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Error: Cargo is not installed. Please install Rust first."
    echo "   Visit: https://rustup.rs"
    exit 1
fi

# Create .tauri directory in user home
TAURI_DIR="$HOME/.tauri"
KEY_FILE="$TAURI_DIR/monkdb-workbench.key"

mkdir -p "$TAURI_DIR"

# Generate keys using Tauri CLI
echo "📝 Generating key pair..."

# Check if key already exists
if [ -f "$KEY_FILE" ]; then
    echo "⚠️  Warning: Key file already exists at $KEY_FILE"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Install tauri-cli if not already installed
if ! cargo install --list | grep -q "tauri-cli"; then
    echo "📦 Installing Tauri CLI..."
    cargo install tauri-cli
fi

# Generate the keys
echo "🔑 Generating keys..."
tauri signer generate -w "$KEY_FILE"

echo ""
echo "✅ Keys generated successfully!"
echo ""
echo "📍 Key locations:"
echo "   Private key: $KEY_FILE"
echo "   (Keep this secret! Never commit to Git!)"
echo ""

# Extract public key
PUBKEY=$(cat "$KEY_FILE" | grep -A 10000 "pub:" | tail -n +2 | head -n 1 | tr -d ' ')

echo "🔓 Public key (add this to tauri.conf.json):"
echo ""
echo "   $PUBKEY"
echo ""
echo "📝 Next steps:"
echo "   1. Add the public key to src-tauri/tauri.conf.json:"
echo "      Replace PLACEHOLDER_PUBLIC_KEY_WILL_BE_GENERATED with the key above"
echo ""
echo "   2. Set environment variable for CI/CD:"
echo "      TAURI_SIGNING_PRIVATE_KEY=\$(cat $KEY_FILE)"
echo ""
echo "   3. Add private key path to .gitignore:"
echo "      echo '$KEY_FILE' >> .gitignore"
echo ""
echo "⚠️  IMPORTANT: Keep the private key secure!"
echo "   - Never commit it to version control"
echo "   - Store it securely (password manager, CI secrets)"
echo "   - Back it up in a secure location"
echo ""
