#!/bin/bash

echo "🚀 Building standalone Next.js application..."

# Clean previous builds
rm -rf .next
rm -rf dist-standalone

# Build the application
echo "📦 Building Next.js app..."
npm run build

# Create distribution directory
echo "📁 Creating distribution package..."
mkdir -p dist-standalone

# Copy the entire .next directory
cp -r .next dist-standalone/
# Copy public directory if it exists
cp -r public dist-standalone/ 2>/dev/null || :
# Copy package.json and package-lock.json for dependencies
cp package.json dist-standalone/
cp package-lock.json dist-standalone/ 2>/dev/null || :
echo "📦 Dependencies will be installed by user..."
# NOTE: node_modules NOT copied - users will run npm install

# Create Node.js server file with runtime env support
cat > dist-standalone/server.js << 'EOF'
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env, .env.local, etc.
function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return;

  const content = fs.readFileSync(filepath, 'utf8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Load env files in order (later files override earlier ones)
const envFiles = ['.env', '.env.local'];
envFiles.forEach(file => {
  loadEnvFile(path.join(__dirname, file));
});

console.log('📋 Loaded environment variables from .env files');

const dev = false;
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      // Inject runtime environment variables for NEXT_PUBLIC_* vars
      if (req.url === '/__ENV__') {
        res.setHeader('Content-Type', 'application/json');
        const publicEnv = {};
        Object.keys(process.env).forEach(key => {
          if (key.startsWith('NEXT_PUBLIC_')) {
            publicEnv[key] = process.env[key];
          }
        });
        res.end(JSON.stringify(publicEnv));
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
EOF

# Create start script with dependency installation
cat > dist-standalone/start.sh << 'EOF'
#!/bin/bash

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies (first time only)..."
  npm ci --production --no-audit
  echo "✅ Dependencies installed!"
fi

PORT=${PORT:-3000}
NODE_ENV=production node server.js
EOF

chmod +x dist-standalone/start.sh

# Create start.bat for Windows
cat > dist-standalone/start.bat << 'EOF'
@echo off

REM Check if node_modules exists
if not exist "node_modules\" (
  echo Installing dependencies (first time only)...
  call npm ci --production --no-audit
  echo Dependencies installed!
)

set PORT=3000
set NODE_ENV=production
node server.js
EOF

# Create README for client
cat > dist-standalone/README.md << 'EOF'
# MonkDB Workbench - Standalone Build

## Requirements
- Node.js 18+ installed ([Download](https://nodejs.org/))
- Port 3000 available (or set custom PORT)

## Quick Start

### 1. Start the Application

**On Linux/Mac:**
```bash
./start.sh
```

**On Windows:**
```cmd
start.bat
```

**Custom Port:**
```bash
PORT=8080 ./start.sh
```

### 2. Access the Application

Open your browser at: **http://localhost:3000**

## Optional Configuration

You can create a `.env.local` file for custom settings:

```bash
# Default MonkDB Connection Settings
NEXT_PUBLIC_DEFAULT_MONKDB_HOST=localhost
NEXT_PUBLIC_DEFAULT_MONKDB_PORT=4200

# Custom Application Port (optional)
PORT=3000
```

## Features

- ✅ Query Editor with Monaco
- ✅ Real-time Dashboard & Metrics
- ✅ Geospatial Mapping (powered by Leaflet & OpenStreetMap - no API keys needed!)
- ✅ Vector Search Operations
- ✅ Full-Text Search
- ✅ User Management
- ✅ Schema Browser & Designer
- ✅ ER Diagram Visualization

## Troubleshooting

### Port already in use?
```bash
# Use a different port
PORT=8080 ./start.sh
```

### Can't connect to database?
- Check your MonkDB server is running
- Verify connection settings in the app

## Support
For issues or questions, contact your administrator.

## Version
Check `VERSION.txt` for build information.
EOF

# Create .env.example file
cat > dist-standalone/.env.example << 'EOF'
# ============================================
# MonkDB Workbench - Environment Configuration
# ============================================
#
# INSTRUCTIONS (OPTIONAL):
# 1. Copy this file: cp .env.example .env.local
# 2. Edit .env.local with your values
# 3. Restart the server
#
# Note: All settings are optional. The app works out of the box!
#

# ============================================
# MonkDB Default Connection
# ============================================
NEXT_PUBLIC_DEFAULT_MONKDB_HOST=localhost
NEXT_PUBLIC_DEFAULT_MONKDB_PORT=4200

# ============================================
# Optional Settings
# ============================================
# Custom application port
# PORT=3000
EOF

echo "✅ Standalone build created in 'dist-standalone' directory"
echo "📦 Build size: ~5MB (without node_modules)"
echo ""
echo "📋 Instructions for users:"
echo "  1. Extract the package"
echo "  2. Add .env.local file with configuration"
echo "  3. Run start.sh (Linux/Mac) or start.bat (Windows)"
echo "     - First run will install dependencies automatically"
echo "  4. Access at http://localhost:3000"
echo ""
echo "💡 Requirements: Node.js 18+ installed"