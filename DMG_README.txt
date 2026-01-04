╔════════════════════════════════════════════════════════════════════╗
║                    MonkDB Workbench v1.1.0                         ║
║              Professional Database Management Tool                 ║
╚════════════════════════════════════════════════════════════════════╝

INSTALLATION INSTRUCTIONS
=========================

1. Drag the "MonkDB Workbench" icon to the Applications folder
2. Eject this disk image
3. Open MonkDB Workbench from your Applications folder

FIRST LAUNCH
============

For unsigned builds, you may need to:
1. Right-click the app in Applications
2. Select "Open" from the menu
3. Click "Open" in the security dialog

This only needs to be done once.

SYSTEM REQUIREMENTS
===================

• macOS 10.15 Catalina or later
• 4 GB RAM minimum (8 GB recommended)
• 150 MB free disk space

GETTING STARTED
===============

After launching MonkDB Workbench:

1. Click "New Connection"
2. Enter your MonkDB server details:
   - Host: localhost (or your server IP)
   - Port: 4200 (default)
   - Username: crate (default)
   - Password: (leave empty for default)
3. Click "Test Connection"
4. Click "Save"

FEATURES
========

• SQL Query Editor with syntax highlighting
• Schema Browser and table management
• Vector Search and similarity queries
• Geo-Spatial data visualization
• BLOB Storage management
• API Playground for REST endpoints
• Real-time monitoring and metrics
• Time Series data analysis
• Full Text Search capabilities

TROUBLESHOOTING
===============

Cannot Open App (Security Warning)
-----------------------------------
Run this command in Terminal:
  xattr -cr /Applications/MonkDB\ Workbench.app

Connection Failed
-----------------
• Verify MonkDB is running
• Check host and port settings
• Test network connectivity: telnet localhost 4200
• Check firewall settings

App Crashes
-----------
Reset application data:
  rm -rf ~/Library/Application\ Support/com.monkdb.workbench
Then reinstall the application.

DOCUMENTATION
=============

Full installation guide: See INSTALL_INSTRUCTIONS.md
User documentation: https://docs.monkdb.io/workbench
API reference: https://docs.monkdb.io/api

SUPPORT
=======

• GitHub Issues: https://github.com/monkdb/workbench/issues
• Community Forum: https://community.monkdb.io
• Email: support@monkdb.io

UNINSTALL
=========

To remove MonkDB Workbench:

1. Drag app from Applications to Trash
2. (Optional) Remove application data:
   rm -rf ~/Library/Application\ Support/com.monkdb.workbench
   rm -rf ~/Library/Caches/com.monkdb.workbench
   rm -rf ~/.monkdb-workbench

LICENSE
=======

MonkDB Workbench is licensed under the MIT License.
Copyright © 2024-2025 MonkDB Project Contributors

ACKNOWLEDGMENTS
===============

Built with Tauri, Next.js, React, and TypeScript.
Special thanks to the MonkDB community and all contributors.

═══════════════════════════════════════════════════════════════════

Thank you for using MonkDB Workbench!

For the latest updates and news, visit: https://monkdb.io

═══════════════════════════════════════════════════════════════════
