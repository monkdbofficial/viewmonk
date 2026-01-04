#!/bin/bash

# Build script for MonkDB Workbench - All platforms
# This script builds the application for the current platform

set -e

echo "🏗️  Building MonkDB Workbench..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed${NC}"
    echo "   Please install Node.js from https://nodejs.org"
    exit 1
fi

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Error: Rust is not installed${NC}"
    echo "   Please install Rust from https://rustup.rs"
    exit 1
fi

# Detect platform
OS="$(uname -s)"
case "${OS}" in
    Linux*)     PLATFORM=linux;;
    Darwin*)    PLATFORM=macos;;
    CYGWIN*|MINGW*|MSYS*) PLATFORM=windows;;
    *)          PLATFORM="UNKNOWN"
esac

echo -e "${GREEN}📍 Platform detected: $PLATFORM${NC}"
echo ""

# Install Node dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Build Next.js frontend
echo ""
echo "⚛️  Building Next.js frontend..."
npm run build

# Build Tauri backend
echo ""
echo "🦀 Building Tauri backend for $PLATFORM..."

case "${PLATFORM}" in
    macos)
        echo -e "${YELLOW}Building Universal binary (Intel + Apple Silicon)...${NC}"

        # Check if targets are installed
        if ! rustup target list | grep -q "aarch64-apple-darwin (installed)"; then
            echo "Installing aarch64-apple-darwin target..."
            rustup target add aarch64-apple-darwin
        fi

        if ! rustup target list | grep -q "x86_64-apple-darwin (installed)"; then
            echo "Installing x86_64-apple-darwin target..."
            rustup target add x86_64-apple-darwin
        fi

        npm run tauri build -- --target universal-apple-darwin
        ;;

    windows)
        echo -e "${YELLOW}Building for Windows x64...${NC}"
        npm run tauri build -- --target x86_64-pc-windows-msvc
        ;;

    linux)
        echo -e "${YELLOW}Building for Linux x64...${NC}"

        # Check for required dependencies
        if ! command -v pkg-config &> /dev/null; then
            echo -e "${RED}❌ Error: pkg-config is not installed${NC}"
            echo "   Install with: sudo apt-get install pkg-config"
            exit 1
        fi

        npm run tauri build -- --target x86_64-unknown-linux-gnu
        ;;

    *)
        echo -e "${RED}❌ Error: Unknown platform: $OS${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo ""
echo "📦 Build artifacts location:"

case "${PLATFORM}" in
    macos)
        echo "   DMG: src-tauri/target/universal-apple-darwin/release/bundle/dmg/"
        echo "   APP: src-tauri/target/universal-apple-darwin/release/bundle/macos/"
        ;;

    windows)
        echo "   MSI: src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/"
        echo "   EXE: src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/"
        ;;

    linux)
        echo "   DEB: src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb/"
        echo "   AppImage: src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage/"
        ;;
esac

echo ""
