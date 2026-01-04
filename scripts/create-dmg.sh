#!/bin/bash
# Script to create DMG from .app bundle
# Usage: ./scripts/create-dmg.sh

set -e

echo "🔨 Creating DMG from .app bundle..."

APP_NAME="MonkDB Workbench"
VERSION="1.1.0"
BUILD_TARGET="universal-apple-darwin"

APP_PATH="src-tauri/target/${BUILD_TARGET}/release/bundle/macos/${APP_NAME}.app"
DMG_PATH="src-tauri/target/${BUILD_TARGET}/release/bundle/dmg/${APP_NAME}_${VERSION}_universal.dmg"

if [ ! -d "$APP_PATH" ]; then
    echo "❌ Error: .app bundle not found at $APP_PATH"
    echo "   Run 'npm run tauri:build:mac' first"
    exit 1
fi

echo "📦 Found .app bundle: $APP_PATH"
echo "📀 Creating DMG: $DMG_PATH"

# Create DMG directory if it doesn't exist
mkdir -p "src-tauri/target/${BUILD_TARGET}/release/bundle/dmg"

# Create DMG using hdiutil
hdiutil create \
    -volname "$APP_NAME" \
    -srcfolder "$APP_PATH" \
    -ov \
    -format UDZO \
    "$DMG_PATH"

echo "✅ DMG created successfully!"
echo "📍 Location: $DMG_PATH"

# Copy to Desktop
if [ -d ~/Desktop ]; then
    cp "$DMG_PATH" ~/Desktop/
    echo "📋 Copied to Desktop"
fi

# Show file size
DMG_SIZE=$(du -h "$DMG_PATH" | cut -f1)
echo "💾 Size: $DMG_SIZE"
