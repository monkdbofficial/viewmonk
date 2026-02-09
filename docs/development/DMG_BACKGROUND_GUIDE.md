# DMG Background Image Creation Guide

This guide explains how to create a custom background image for the MonkDB Workbench DMG installer.

## Overview

A custom DMG background enhances the installation experience by providing visual guidance for the drag-and-drop installation process.

## Specifications

### Image Dimensions
- **Width**: 540 pixels
- **Height**: 380 pixels
- **Format**: PNG (recommended) or TIFF
- **Resolution**: 144 DPI (2x for Retina displays)

### Design Requirements

1. **App Icon Position**: Left side at coordinates (140, 120)
2. **Applications Folder**: Right side at coordinates (400, 120)
3. **Visual Flow**: Arrow or line connecting app to Applications folder
4. **Text**: "Drag to Install" or similar installation instruction
5. **Branding**: MonkDB logo and color scheme

## Design Tools

### Option 1: Figma (Recommended)
1. Create a 540x380px frame
2. Add background gradient or solid color
3. Place MonkDB icon mockup at (140, 120)
4. Place Applications folder icon at (400, 120)
5. Add arrow between icons
6. Add "Drag to Install" text
7. Export as PNG @2x

### Option 2: Sketch
1. Create a new artboard (540x380px)
2. Follow same layout as Figma
3. Export as PNG @2x

### Option 3: Adobe Photoshop
1. New document: 540x380px, 144 DPI
2. Create background layer
3. Add icon placeholders
4. Add arrow and text
5. Save as PNG

### Option 4: GIMP (Free)
1. File → New → 540x380px
2. Use layers for each element
3. Export as PNG

## Design Template

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                     MonkDB Workbench                    │
│                                                         │
│                                                         │
│         [App Icon]  ─────────►  [Applications]         │
│            140,120                   400,120            │
│                                                         │
│                   Drag to Install                       │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Color Scheme (MonkDB Brand)

- **Primary Purple**: `#7C3AED` (purple-600)
- **Light Purple**: `#C4B5FD` (purple-300)
- **Background**: White `#FFFFFF` or light gray `#F9FAFB`
- **Text**: Dark gray `#1F2937`

## Design Guidelines

### Background
- Use subtle gradient from light gray to white
- OR solid white background
- Avoid busy patterns that distract from icons

### Icons
- Use actual app icon (from `src-tauri/icons/icon.png`)
- Applications folder: Use macOS standard folder icon
- Size: 128x128px icons work well

### Arrow
- Color: Purple (#7C3AED) or light gray
- Style: Simple curved arrow or straight line
- Width: 2-3px
- Optional: Add slight shadow for depth

### Text
- Font: System font (San Francisco) or Helvetica
- Size: 18-24px for "Drag to Install"
- Size: 12-14px for secondary text
- Color: Dark gray (#1F2937)
- Position: Below or between icons

### Examples of Text

**Simple**:
```
Drag to Install
```

**Detailed**:
```
Drag MonkDB Workbench to Applications
to install
```

**Minimal**:
```
↓  Install  →
```

## Implementation Steps

### 1. Create the Image

Follow one of the design tool workflows above to create your background image.

### 2. Save the File

Save the image as:
```
src-tauri/icons/dmg-background.png
```

OR

```
src-tauri/icons/dmg-background.tiff
```

### 3. Update Tauri Configuration

Edit `src-tauri/tauri.conf.json`:

```json
"dmg": {
  "background": "icons/dmg-background.png",
  "windowSize": {
    "width": 540,
    "height": 380
  },
  "appPosition": {
    "x": 140,
    "y": 120
  },
  "applicationFolderPosition": {
    "x": 400,
    "y": 120
  }
}
```

### 4. Rebuild the Application

```bash
npm run tauri:build:mac
```

The DMG will now include your custom background.

## Testing

1. Build the DMG with custom background
2. Open the DMG file
3. Verify:
   - Background displays correctly
   - Icons are positioned correctly
   - Text is readable
   - Arrow guides the installation flow
   - Works on both light and dark mode (if applicable)

## Tips for Best Results

### Visual Hierarchy
1. App icon should be prominent
2. Arrow draws attention to installation direction
3. Text provides clear instruction

### Accessibility
- Ensure sufficient contrast (WCAG AA minimum)
- Text should be readable at standard screen distance
- Consider color-blind users (don't rely on color alone)

### Branding
- Maintain MonkDB brand consistency
- Use official logo assets
- Follow brand guidelines for colors and fonts

### File Size
- Keep PNG under 500KB
- Use PNG compression tools if needed
- Avoid unnecessary transparency

## Example Resources

### Icon Sources
- MonkDB App Icon: `src-tauri/icons/icon.png`
- macOS Applications Icon: System folder icons
- Arrow Graphics: SF Symbols or custom SVG

### Design Inspiration
- Look at professional DMG installers (Adobe, Microsoft, etc.)
- Keep it simple and functional
- Focus on clear installation instructions

## Without Custom Background

If you choose not to create a custom background:
- The DMG will use the default macOS appearance
- Icons will still be positioned correctly
- Installation via drag-and-drop still works
- Leave `"background": null` in tauri.conf.json

This is perfectly acceptable for development builds or internal distribution.

## Automated Background Generation (Advanced)

For teams wanting to automate this:

```bash
# Using ImageMagick
convert -size 540x380 xc:white \
  -font Helvetica -pointsize 24 \
  -draw "text 170,350 'Drag to Install'" \
  src-tauri/icons/dmg-background.png
```

This creates a basic white background with text. You can enhance it with gradients, icons, and arrows using more complex ImageMagick commands.

## Version Control

**Recommendation**: Commit the background image to git
- Small file size (< 500KB typically)
- Ensures consistent branding across builds
- Team members get same installer appearance

```bash
git add src-tauri/icons/dmg-background.png
git commit -m "Add DMG installer background image"
```

## Questions?

For design help or questions about DMG background creation, please consult:
- [Tauri DMG Documentation](https://tauri.app/v1/guides/building/macos)
- MonkDB brand guidelines (if available)
- Your design team or UX lead

---

**Optional**: Creating the background is not required for functionality. The installer works perfectly without a custom background. This is purely for enhanced visual presentation.
