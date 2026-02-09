# MonkDB Workbench - macOS Installation Guide

![MonkDB Workbench](https://img.shields.io/badge/macOS-Compatible-blue)
![Version](https://img.shields.io/badge/version-1.1.0-green)

## System Requirements

- **macOS Version**: 10.15 Catalina or later
- **Architecture**: Apple Silicon (M1/M2/M3) or Intel x64
- **Disk Space**: 150 MB free space
- **Memory**: 4 GB RAM minimum (8 GB recommended)

---

## Installation Steps

### 1. Download the DMG Package

Download the latest `MonkDB-Workbench-[version]-[arch].dmg` file from:
- [GitHub Releases](https://github.com/monkdb/workbench/releases)
- Or your distribution source

### 2. Open the DMG File

Double-click the downloaded `.dmg` file to mount the disk image. A new window will appear showing the MonkDB Workbench application icon.

### 3. Install the Application

**Drag and drop** the MonkDB Workbench icon onto the Applications folder icon in the same window.

```
┌─────────────────────────────────────┐
│                                     │
│   [MonkDB Icon]  ──►  [Apps Folder] │
│                                     │
│      Drag to Install                │
└─────────────────────────────────────┘
```

The application will be copied to your `/Applications` folder.

### 4. Eject the DMG

After installation is complete:
- Right-click the mounted disk image in Finder
- Select "Eject"

Or drag the disk image to the Trash.

---

## First Launch

### For Signed Builds

Simply double-click **MonkDB Workbench** in your Applications folder to launch.

### For Unsigned/Developer Builds

macOS Gatekeeper may block the first launch of unsigned applications:

1. **Right-click** (or Control-click) the MonkDB Workbench app in Applications
2. Select **"Open"** from the context menu
3. In the security dialog, click **"Open"** again to confirm
4. The app will launch and remember this permission for future use

**Alternative method:**
1. Go to **System Settings** → **Privacy & Security**
2. Scroll to the **Security** section
3. Click **"Open Anyway"** next to the MonkDB Workbench message
4. Confirm by clicking **"Open"**

---

## Connecting to MonkDB

After launching MonkDB Workbench:

1. Click **"New Connection"** on the dashboard
2. Enter your MonkDB connection details:
   - **Host**: Your MonkDB server address (e.g., `localhost` or `192.168.1.100`)
   - **Port**: Default is `4200` for HTTP
   - **Username**: Your MonkDB username (default: `crate`)
   - **Password**: Your MonkDB password (leave empty for default setups)
3. Click **"Test Connection"** to verify
4. Click **"Save"** to store the connection

---

## Features

MonkDB Workbench provides a comprehensive interface for:

- 📊 **Dashboard** - Monitor cluster health and performance metrics
- 🔍 **Query Editor** - Execute SQL queries with syntax highlighting
- 📋 **Schema Browser** - Explore tables, columns, and data
- 🔎 **Vector Search** - Perform similarity searches on vector embeddings
- 🗺️ **Geo-Spatial Tools** - Query and visualize geographic data
- 📦 **BLOB Storage** - Manage binary large objects
- 🔌 **API Playground** - Test MonkDB REST API endpoints
- ⏱️ **Time Series** - Analyze temporal data
- 🔤 **Full Text Search** - Search text columns efficiently
- ⚙️ **Settings** - Configure application preferences

---

## Troubleshooting

### "App is damaged and can't be opened"

This error occurs when macOS quarantine attributes are set on the app:

```bash
# Remove quarantine attribute
xattr -cr /Applications/MonkDB\ Workbench.app
```

Then try opening the app again.

### Permission Denied Errors

Ensure the app has necessary permissions:

1. Go to **System Settings** → **Privacy & Security**
2. Check permissions for:
   - **Files and Folders** - Allow access to your data
   - **Network** - Required for database connections

### Connection Issues

If you can't connect to your MonkDB instance:

1. **Verify MonkDB is running**: Check if the database server is active
2. **Check host and port**: Default is `localhost:4200`
3. **Firewall settings**: Ensure port 4200 is not blocked
4. **Network connectivity**: Test with `telnet localhost 4200` or `curl http://localhost:4200`
5. **Authentication**: Verify username and password are correct

### Application Crashes

If the app crashes on launch:

1. Check **Console.app** for error messages (search for "MonkDB")
2. Try resetting application data:
   ```bash
   rm -rf ~/Library/Application\ Support/com.monkdb.workbench
   rm -rf ~/Library/Caches/com.monkdb.workbench
   ```
3. Reinstall the application

---

## Uninstall Instructions

To completely remove MonkDB Workbench:

### 1. Remove the Application

```bash
# Move app to Trash
rm -rf /Applications/MonkDB\ Workbench.app
```

Or drag the app from Applications to Trash.

### 2. Remove Application Data (Optional)

```bash
# Remove application support files
rm -rf ~/Library/Application\ Support/com.monkdb.workbench

# Remove caches
rm -rf ~/Library/Caches/com.monkdb.workbench

# Remove preferences
rm -rf ~/Library/Preferences/com.monkdb.workbench.plist

# Remove saved connections (if desired)
rm -rf ~/.monkdb-workbench
```

### 3. Empty Trash

Right-click Trash and select **"Empty Trash"**.

---

## Getting Help

### Documentation

- **User Guide**: [docs.monkdb.io/workbench](https://docs.monkdb.io/workbench)
- **MonkDB Docs**: [docs.monkdb.io](https://docs.monkdb.io)
- **API Reference**: [docs.monkdb.io/api](https://docs.monkdb.io/api)

### Support Channels

- **GitHub Issues**: [github.com/monkdb/workbench/issues](https://github.com/monkdb/workbench/issues)
- **Community Forum**: [community.monkdb.io](https://community.monkdb.io)
- **Email Support**: support@monkdb.io

### Reporting Bugs

When reporting issues, please include:

1. **System Information**:
   - macOS version (`sw_vers`)
   - MonkDB Workbench version (Help → About)
   - MonkDB server version

2. **Console Logs**:
   - Open Console.app
   - Filter for "MonkDB"
   - Copy relevant error messages

3. **Steps to Reproduce**:
   - Detailed description of the issue
   - Steps to trigger the problem
   - Expected vs actual behavior

---

## Version History

### v1.1.0 (Current)
- Enhanced API Playground with pagination and security warnings
- Improved Blob Storage with connection validation
- Added Vector Search dropdown selectors
- Fixed Geo-Spatial query builder
- Improved error handling across all components

### v1.0.0
- Initial release
- Core features: Query Editor, Schema Browser, Dashboard
- Vector Search and Geo-Spatial tools
- BLOB Storage management
- API Playground

---

## Security Considerations

- **Default Credentials**: Change default MonkDB credentials (`crate` with no password) in production
- **Network Access**: Restrict MonkDB access to trusted networks only
- **Firewall Rules**: Configure firewall to allow only necessary connections
- **SSL/TLS**: Use HTTPS/SSL for remote connections to MonkDB
- **Regular Updates**: Keep MonkDB Workbench updated to the latest version

---

## License

MonkDB Workbench is licensed under the [MIT License](LICENSE).

Copyright © 2024-2025 MonkDB Project Contributors

---

## Acknowledgments

Built with:
- [Tauri](https://tauri.app) - Desktop application framework
- [Next.js](https://nextjs.org) - React framework
- [React](https://react.dev) - UI library
- [TypeScript](https://www.typescriptlang.org) - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS

Special thanks to the MonkDB community and all contributors.

---

**Enjoy using MonkDB Workbench!** 🚀
