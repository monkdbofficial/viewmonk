# Standalone Build Guide

This guide explains how to use the GitHub Actions workflow to automatically build and package the MonkDB Workbench standalone application.

## 📋 Overview

The `build-standalone.yml` workflow automatically:
- ✅ Builds the Next.js application
- ✅ Creates a standalone package with all dependencies
- ✅ Generates ZIP and TAR.GZ archives
- ✅ Calculates SHA256 checksums for verification
- ✅ Creates GitHub releases (when tagged)
- ✅ Uploads artifacts for easy download

## 🚀 How to Use

### Option 1: Automatic Build (Recommended)

The workflow runs automatically when you:

1. **Push to main/develop branches**
   ```bash
   git push origin main
   ```
   - Artifacts will be available in the Actions tab

2. **Create a release tag**
   ```bash
   git tag standalone-v1.0.0
   git push origin standalone-v1.0.0
   ```
   - This creates a full GitHub Release with downloadable files

### Option 2: Manual Trigger

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select **Build Standalone Package** workflow
4. Click **Run workflow** button
5. Select the branch and click **Run workflow**

## 📦 Downloading Built Packages

### From Actions (Development Builds)

1. Go to **Actions** tab
2. Click on the latest **Build Standalone Package** run
3. Scroll to **Artifacts** section
4. Download:
   - `monkdb-workbench-standalone-zip` (for Windows/macOS)
   - `monkdb-workbench-standalone-tar` (for Linux)

### From Releases (Production Builds)

1. Go to **Releases** section
2. Find the release (e.g., "MonkDB Workbench Standalone v1.0.0")
3. Download the appropriate file:
   - `monkdb-workbench-standalone.zip`
   - `monkdb-workbench-standalone.tar.gz`

## 🎯 What's Included in the Package

```
monkdb-workbench-standalone/
├── .next/                  # Built Next.js application
├── node_modules/           # All production dependencies
├── public/                 # Static assets
├── server.js              # Node.js server
├── start.sh               # Linux/macOS startup script
├── start.bat              # Windows startup script
├── package.json           # Package configuration
├── README.md              # User instructions
└── VERSION.txt            # Build version info
```

## 📤 Sharing with Others

### Method 1: Direct Artifact Download (Quick)

After pushing code:
1. Wait for Actions to complete (~2-3 minutes)
2. Go to Actions → Latest run
3. Download artifact ZIP
4. Share the ZIP file directly

### Method 2: GitHub Release (Professional)

For official releases:
1. Create and push a tag:
   ```bash
   git tag standalone-v1.0.0 -m "Release v1.0.0"
   git push origin standalone-v1.0.0
   ```

2. Wait for Actions to complete
3. Go to Releases tab
4. Share the release URL with others

### Method 3: External Hosting

Upload to file hosting service:
- Google Drive
- Dropbox
- AWS S3
- Your own server

Include the `.sha256` checksum file for verification!

## 🔧 Verifying Downloads

### Linux/macOS
```bash
sha256sum -c monkdb-workbench-standalone.tar.gz.sha256
```

### Windows (PowerShell)
```powershell
$hash = (Get-FileHash monkdb-workbench-standalone.zip -Algorithm SHA256).Hash.ToLower()
$expected = (Get-Content monkdb-workbench-standalone.zip.sha256).Split(' ')[0]
if ($hash -eq $expected) { "✅ Checksum verified!" } else { "❌ Checksum mismatch!" }
```

## 📋 User Instructions (Share This)

Once someone receives your standalone package:

### Requirements
- Node.js 18+ ([Download](https://nodejs.org/))
- Port 3000 available (or set custom PORT)

### Installation
1. Extract the ZIP/TAR.GZ file
2. Open terminal/command prompt in the extracted folder
3. Run the application:
   - **Linux/macOS**: `./start.sh`
   - **Windows**: Double-click `start.bat`
4. Open browser at http://localhost:3000

### Custom Port
```bash
# Linux/macOS
PORT=8080 ./start.sh

# Windows
set PORT=8080 && node server.js
```

## 🔄 Workflow Triggers

| Trigger | When | Creates Release? | Use Case |
|---------|------|------------------|----------|
| Push to main | Commit to main branch | ❌ No | Development builds |
| Push to develop | Commit to develop branch | ❌ No | Testing builds |
| Tag `standalone-v*` | Create version tag | ✅ Yes | Production releases |
| Manual | Click "Run workflow" | ❌ No | On-demand builds |
| Pull Request | PR to main | ❌ No | PR validation |

## 🏷️ Creating Tags for Releases

```bash
# Create a release tag
git tag standalone-v1.0.0 -m "Release version 1.0.0"

# Push the tag
git push origin standalone-v1.0.0

# List all tags
git tag -l "standalone-v*"

# Delete a tag (if needed)
git tag -d standalone-v1.0.0
git push origin :refs/tags/standalone-v1.0.0
```

## 📊 Build Status

You can add a badge to your README to show build status:

```markdown
![Build Standalone Package](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/build-standalone.yml/badge.svg)
```

## 🐛 Troubleshooting

### Build fails with "Permission denied" on build-standalone.sh
The workflow runs `chmod +x build-standalone.sh` automatically, but if you see issues, ensure the script is committed with execute permissions:
```bash
git add build-standalone.sh
git update-index --chmod=+x build-standalone.sh
git commit -m "Make build script executable"
```

### Artifacts not appearing
- Check the Actions tab for errors
- Ensure the workflow completed successfully
- Artifacts are kept for 90 days by default

### Release not created
- Ensure you pushed a tag starting with `standalone-v`
- Check repository permissions (needs write access)
- Verify GITHUB_TOKEN has proper scopes

## 💡 Best Practices

1. **Version Tags**: Use semantic versioning (e.g., `standalone-v1.2.3`)
2. **Testing**: Test on main/develop before creating release tags
3. **Changelog**: Update CHANGELOG.md before releases
4. **Documentation**: Keep README.md in sync with features
5. **Security**: Review dependencies regularly with `npm audit`

## 🔗 Related Files

- `build-standalone.sh` - Build script
- `.github/workflows/build-standalone.yml` - GitHub Actions workflow
- `dist-standalone/README.md` - User-facing documentation (auto-generated)

## 📞 Support

For issues with:
- **Building locally**: Run `./build-standalone.sh` manually to debug
- **GitHub Actions**: Check the Actions tab for detailed logs
- **Deployment**: Refer to the generated README.md in the package

---

**Happy Building! 🚀**
