# MonkDB Workbench - Professional Database Management

<div align="center">

![MonkDB Workbench](https://img.shields.io/badge/MonkDB-Workbench-blue)
![Version](https://img.shields.io/badge/version-2.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

**A production-ready, feature-rich database management tool for MonkDB**

[Features](#features) • [Installation](#installation) • [Configuration](#configuration) • [Usage](#usage) • [API Documentation](#api-documentation)

</div>

---

## 📦 Download Standalone Build

**Want to run without installing dependencies?** Download the standalone version!

### Latest Release: [v1.0.0](https://github.com/suryakant-monkdb/workbanch-web/releases/latest)

**Choose your version:**

| Version | Size | When to Use | Download |
|---------|------|-------------|----------|
| **LITE** ⚡ | ~10MB | Fast download, auto-installs on first run | [📥 Download](https://github.com/suryakant-monkdb/workbanch-web/releases/download/standalone-v1.0.0/monkdb-workbench-standalone-lite.zip) |
| **FULL** 📦 | ~377MB | Offline use, no internet needed after download | [📥 Download](https://github.com/suryakant-monkdb/workbanch-web/releases/download/standalone-v1.0.0/monkdb-workbench-standalone-full.zip) |

### Quick Start (Standalone):
1. Download and extract the ZIP file
2. Run `./start.sh` (Mac/Linux) or `start.bat` (Windows)
3. Open http://localhost:3000
4. **That's it!** No configuration needed!

> **Note:** Requires Node.js 18+ ([Download here](https://nodejs.org/))

---

## Quick Start (Development)

**Get started in 3 minutes:**

```bash
# 1. Start MonkDB (MonkDB backend)
./scripts/start-monkdb.sh

# 2. Install dependencies and start the workbench
npm install
npm run dev

# 3. Open http://localhost:3000
```

**Connection Settings:**
- Host: `localhost`
- Port: `4200`
- Database: `doc`
- Username/Password: (leave empty)

For detailed setup instructions, see [SETUP.md](./SETUP.md)

---

## Features

### MonkDB Integration
- ✅ **HTTP API Client** - Production-ready REST API client for MonkDB
- ✅ **Multiple Connections** - Manage multiple MonkDB connections simultaneously
- ✅ **Real-time Cluster Monitoring** - Live cluster health and node statistics
- ✅ **Schema Browser** - Interactive schema and table explorer
- ✅ **Query Editor** - Execute SQL queries with syntax highlighting
- ✅ **Visual Results** - Table and JSON view for query results

### Database Operations
- ✅ **Node Management** - Monitor cluster nodes, uptime, and resource usage
- ✅ **Schema Exploration** - Browse schemas, tables, and columns
- ✅ **Metadata Queries** - Complete table metadata including:
  - Columns with data types and constraints
  - Primary keys and indexes
  - Table settings (shards, replicas, clustering)
  - Privileges and partitions
- ✅ **Query Execution** - Execute SQL queries with execution statistics
- ✅ **Performance Metrics** - View query performance and execution times

### UI/UX
- ✅ **Modern Interface** - Clean, professional dark/light theme
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile
- ✅ **Real-time Updates** - Live data updates with loading states
- ✅ **Error Handling** - Comprehensive error handling with user feedback
- ✅ **Keyboard Shortcuts** - Ctrl/Cmd + Enter to execute queries

---

## Installation

### Prerequisites

1. **Node.js** (v18 or higher)
2. **MonkDB** (running instance) - For database operations

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd monkdb/workbanch
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Start MonkDB

Ensure your MonkDB instance is running and accessible:

```bash
# MonkDB should be accessible at http://localhost:4200
```

### Step 4: Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000` to access the workbench.

---

## Configuration

### MonkDB API Configuration

MonkDB connections are configured per-user through the UI:

- **Default HTTP Port**: 4200
- **Default PostgreSQL Port**: 5432
- **SQL Endpoint**: `http://host:4200/_sql`

**API Request Format:**
```json
{
  "stmt": "SELECT * FROM table"
}
```

---

## Usage

### 1. Add a MonkDB Connection

1. Navigate to **Connections** page
2. Click "+ Add Connection"
3. Fill in connection details:
   ```
   Host: localhost (or your MonkDB server IP)
   Port: 4200
   Database: monkdb (optional)
   Username: (optional)
   Password: (optional)
   ```
4. Click "Finish"
5. Click "Use" to set as active connection

### 2. Browse Your Database

**Dashboard:**
- View cluster statistics
- Monitor node health
- Check storage usage
- See cluster uptime

**Schema Viewer:**
- Expand schemas to see tables
- Click tables to view columns
- Search for specific tables
- View data types, nullability, defaults

**Query Editor:**
- Write SQL queries in the editor
- Press `Ctrl/Cmd + Enter` to execute
- View results in table or JSON format
- Check execution time and row counts

### 3. Example Queries

```sql
-- View all cluster nodes
SELECT name, uptime FROM sys.nodes;

-- Get cluster uptime
SELECT min(uptime) AS cluster_uptime_seconds FROM sys.nodes;

-- List all tables
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_type = 'BASE TABLE';

-- View table structure
SELECT ordinal_position, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'doc' AND table_name = 'empmaster'
ORDER BY ordinal_position;

-- Query your data
SELECT * FROM doc.empmaster LIMIT 10;

-- Get table metadata
SELECT
  'COLUMN' AS node_type,
  c.column_name AS name,
  c.data_type AS detail_1,
  c.is_nullable AS detail_2
FROM information_schema.columns c
WHERE c.table_schema = 'doc' AND c.table_name = 'empmaster';
```

---

## API Documentation

### MonkDB Query API

#### Execute Query
```http
POST /api/monkdb/query
Content-Type: application/json

{
  "host": "localhost",
  "port": 4200,
  "protocol": "http",
  "stmt": "SELECT * FROM sys.nodes",
  "args": []
}
```

---

## MonkDB Queries Reference

### System Information

```sql
-- Get all nodes
SELECT name, uptime, hostname, heap_used, heap_max, fs_total, fs_used
FROM sys.nodes;

-- Get cluster uptime
SELECT min(uptime) AS cluster_uptime_seconds
FROM sys.nodes;

-- Get node by name
SELECT * FROM sys.nodes WHERE name = 'node1';
```

### Schema & Tables

```sql
-- List all schemas
SELECT DISTINCT table_schema
FROM information_schema.tables
ORDER BY table_schema;

-- Get tables in schema
SELECT table_name, table_schema, number_of_shards, number_of_replicas
FROM information_schema.tables
WHERE table_schema = 'doc';

-- Get table columns
SELECT ordinal_position, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'doc' AND table_name = 'empmaster'
ORDER BY ordinal_position;
```

### Statistics

```sql
-- Total tables
SELECT COUNT(*) FROM information_schema.tables
WHERE table_type = 'BASE TABLE';

-- Total schemas
SELECT COUNT(DISTINCT table_schema)
FROM information_schema.tables;

-- Total size (primary shards)
SELECT SUM(size) FROM sys.shards
WHERE "primary" = true;

-- Table row count
SELECT COUNT(*) FROM doc.empmaster;
```

---

## Architecture

### Technology Stack

**Frontend:**
- Next.js 15 (React 19)
- TypeScript
- Tailwind CSS
- Lucide Icons

**Backend:**
- Next.js API Routes
- MonkDB HTTP API (database operations)

### Project Structure

```
app/
├── api/
│   └── monkdb/         # MonkDB API proxy endpoints
├── components/         # React components
├── lib/
│   ├── monkdb-client.ts # MonkDB HTTP client
│   ├── monkdb-context.tsx # MonkDB state management
│   └── monkdb-hooks.ts # React hooks for data fetching
├── dashboard/          # Dashboard page
├── connections/        # Connections management
├── query-editor/       # SQL query editor
└── unified-browser/    # Schema browser
```

---

## Security Considerations

### Production Deployment

1. **HTTPS Only**
   - Use HTTPS in production for secure communication

2. **MonkDB Security**
   - Use HTTPS in production
   - Implement proper authentication
   - Restrict network access
   - Use firewall rules

---

## Troubleshooting

### Cannot Connect to MonkDB

```bash
# Test MonkDB HTTP API
curl http://localhost:4200

# Test SQL endpoint
curl -X POST http://localhost:4200/_sql \
  -H "Content-Type: application/json" \
  -d '{"stmt": "SELECT 1"}'
```

### Build Issues

```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run build
```

---

## Development

### Running Tests

```bash
npm test
```

### Code Formatting

```bash
npm run format
```

### Type Checking

```bash
npm run type-check
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## License

MIT License - see LICENSE file for details

---

## Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation
- Review MonkDB official docs

---

<div align="center">

**Built with ❤️ for the MonkDB Community**

</div>
# workbanch-web


  Latest Build Results:

  ✓ No errors during build process
  ✓ MonkDB Workbench.app created successfully
  ✓ DMG (20MB) created and copied to Desktop
  ✓ Universal binary (Intel + Apple Silicon)

  Files on Desktop:

  - MonkDB Workbench.app - Ready to use
  - MonkDB Workbench_1.1.0_universal.dmg - Ready to distribute

  Next Time, Just Run:

  npm run tauri:build:mac:dmg

  All changes committed and pushed to GitHub! 🚀
