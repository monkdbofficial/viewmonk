#!/bin/bash
# Enhanced DMG creation script for MonkDB Workbench
# Creates a professional DMG with installation instructions
# Usage: ./scripts/create-dmg.sh

set -e

echo "🔨 Creating professional DMG package..."

APP_NAME="MonkDB Workbench"
VERSION="1.1.0"
BUILD_TARGET="universal-apple-darwin"

APP_PATH="src-tauri/target/${BUILD_TARGET}/release/bundle/macos/${APP_NAME}.app"
DMG_DIR="src-tauri/target/${BUILD_TARGET}/release/bundle/dmg"
DMG_TEMP="$DMG_DIR/dmg_temp"
DMG_PATH="$DMG_DIR/${APP_NAME}_${VERSION}_universal.dmg"

if [ ! -d "$APP_PATH" ]; then
    echo "❌ Error: .app bundle not found at $APP_PATH"
    echo "   Run 'npm run tauri:build:mac' first"
    exit 1
fi

echo "📦 Found .app bundle: $APP_PATH"
echo "📀 Creating DMG: $DMG_PATH"

# Create DMG directory if it doesn't exist
mkdir -p "$DMG_DIR"
mkdir -p "$DMG_TEMP"

# Copy .app to temp directory
echo "📋 Copying application bundle..."
cp -R "$APP_PATH" "$DMG_TEMP/"

# Copy installation instructions if they exist
if [ -f "DMG_INSTALL_INSTRUCTIONS.md" ]; then
    echo "📄 Adding installation instructions..."
    cp "DMG_INSTALL_INSTRUCTIONS.md" "$DMG_TEMP/INSTALL_INSTRUCTIONS.md"
fi

# Copy README if it exists
if [ -f "README.md" ]; then
    echo "📄 Adding README..."
    cp "README.md" "$DMG_TEMP/README.md"
fi

# Copy DMG-specific README if it exists
if [ -f "DMG_README.txt" ]; then
    echo "📄 Adding DMG README..."
    cp "DMG_README.txt" "$DMG_TEMP/README.txt"
fi

# Create Applications symlink for drag-and-drop installation
echo "🔗 Creating Applications folder symlink..."
ln -s /Applications "$DMG_TEMP/Applications"

# Remove old DMG if it exists
if [ -f "$DMG_PATH" ]; then
    echo "🗑️  Removing old DMG..."
    rm "$DMG_PATH"
fi

# Create DMG using hdiutil with better compression
echo "📦 Creating DMG image..."
hdiutil create \
    -volname "$APP_NAME $VERSION" \
    -srcfolder "$DMG_TEMP" \
    -ov \
    -format UDZO \
    -imagekey zlib-level=9 \
    "$DMG_PATH"

# Cleanup temp directory
echo "🧹 Cleaning up..."
rm -rf "$DMG_TEMP"

echo ""
echo "✅ DMG created successfully!"
echo "📍 Location: $DMG_PATH"

# Show file size
DMG_SIZE=$(du -h "$DMG_PATH" | cut -f1)
echo "💾 Size: $DMG_SIZE"

# Calculate checksum
if command -v shasum &> /dev/null; then
    echo ""
    echo "🔐 SHA-256 checksum:"
    shasum -a 256 "$DMG_PATH" | awk '{print $1}'
fi

# Copy to Desktop for easy access
if [ -d ~/Desktop ]; then
    cp "$DMG_PATH" ~/Desktop/
    echo ""
    echo "📋 Copied to Desktop for easy distribution"
fi

echo ""
echo "🎉 DMG package ready for distribution!"
echo ""
echo "Contents:"
echo "  • MonkDB Workbench.app"
echo "  • Applications folder symlink (for drag-and-drop)"
if [ -f "DMG_INSTALL_INSTRUCTIONS.md" ]; then
    echo "  • INSTALL_INSTRUCTIONS.md"
fi
if [ -f "DMG_README.txt" ]; then
    echo "  • README.txt (Quick start guide)"
fi
if [ -f "README.md" ]; then
    echo "  • README.md (Full documentation)"
fi

echo ""
echo "Distribution checklist:"
echo "  ☐ Test DMG installation on clean macOS system"
echo "  ☐ Verify app launches correctly after installation"
echo "  ☐ Test on both Apple Silicon and Intel Macs"
echo "  ☐ Upload DMG to release page"
echo "  ☐ Update download links in documentation"
