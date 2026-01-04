# Quick Start Guide - MonkDB Workbench

## 🚨 First Time Setup

### Step 1: Install Docker Desktop

**You MUST have Docker installed to run MonkDB (MonkDB backend)**

**Download Docker Desktop:**
- macOS: https://www.docker.com/products/docker-desktop
- Or use Homebrew: `brew install --cask docker`

**After installation:**
1. Open Docker Desktop application
2. Wait for Docker to start (you'll see 🐋 icon in menu bar)
3. Docker is ready when the icon stops animating

---

### Step 2: Start MonkDB

Open terminal in the project directory and run:

```bash
./scripts/start-monkdb.sh
```

This script will:
- ✅ Check if Docker is running
- ✅ Start MonkDB container
- ✅ Wait for it to be ready
- ✅ Show you the connection details

**Expected output:**
```
✅ MonkDB is running!

📍 Access MonkDB at: http://localhost:4200
```

---

### Step 3: Start the Workbench

```bash
npm install
npm run dev
```

Open: http://localhost:3000

---

### Step 4: Create Account & Connect

1. **Register** - Create your account at http://localhost:3000/register
2. **Login** - Sign in with your credentials
3. **Add Connection:**
   - Go to `/connections` page
   - Click the connection dialog
   - Click **"Check Status"** button - should show 🟢 green "MonkDB is running!"
   - Fill in connection details:
     ```
     Host:     localhost
     Port:     4200
     Database: doc
     Username: (leave empty)
     Password: (leave empty)
     ```
   - Click **"Test Connection"** - should show ✅ "Connection successful!"
   - Click **"Finish"** to save
   - Click **"Use"** to make it active

4. **Start Exploring!**
   - Dashboard: View cluster stats
   - Query Editor: Run SQL queries
   - Schema Browser: Explore tables and data

---

## 🔧 Common Issues

### Issue: "MonkDB is not running"

**Solution:**
```bash
# Check if Docker is running
docker ps

# If Docker is not running:
# 1. Open Docker Desktop application
# 2. Wait for it to start
# 3. Try again

# Start MonkDB
./scripts/start-monkdb.sh
```

---

### Issue: "Docker command not found"

**Solution:**
You need to install Docker Desktop first!

1. Download from: https://www.docker.com/products/docker-desktop
2. Install and open Docker Desktop
3. Wait for Docker to start
4. Run `./scripts/start-monkdb.sh` again

---

### Issue: "Port 4200 already in use"

**Solution:**
```bash
# Find what's using port 4200
lsof -i :4200

# Kill the process or stop existing MonkDB
docker stop monkdb-cratedb
docker rm monkdb-cratedb

# Start fresh
./scripts/start-monkdb.sh
```

---

### Issue: Connection test fails

**Solution:**
```bash
# 1. Check MonkDB is running
curl http://localhost:4200

# 2. Check Docker container status
docker ps | grep cratedb

# 3. Check logs
docker logs monkdb-cratedb

# 4. Restart MonkDB
docker restart monkdb-cratedb

# Wait 10 seconds, then try connection again
```

---

## 📝 Useful Commands

```bash
# Start MonkDB
./scripts/start-monkdb.sh

# Stop MonkDB
docker stop monkdb-cratedb

# Start existing MonkDB
docker start monkdb-cratedb

# View MonkDB logs
docker logs -f monkdb-cratedb

# Remove MonkDB (to start fresh)
docker rm -f monkdb-cratedb

# Access MonkDB Admin UI
open http://localhost:4200
```

---

## ✅ Verification Checklist

Before using the workbench, verify:

- [ ] Docker Desktop is installed and running
- [ ] MonkDB container is running: `docker ps | grep cratedb`
- [ ] MonkDB responds: `curl http://localhost:4200`
- [ ] Workbench is running: `npm run dev`
- [ ] Can access workbench at: http://localhost:3000
- [ ] Connection dialog shows 🟢 green status
- [ ] Test connection succeeds

---

## 🎯 Next Steps

Once connected:

1. **Dashboard** (`/dashboard`)
   - View cluster health
   - Monitor node status
   - Check storage usage

2. **Query Editor** (`/query-editor`)
   - Write and execute SQL queries
   - View results in table or JSON format
   - See execution statistics

3. **Schema Browser** (`/unified-browser`)
   - Browse schemas and tables
   - View table structure
   - Explore column metadata

4. **API Playground** (`/api-playground`)
   - Test MonkDB REST API
   - Execute custom queries
   - View raw responses

---

**Need more help?**
- Full Setup Guide: [SETUP.md](./SETUP.md)
- Documentation: https://crate.io/docs/
- Issues: https://github.com/anthropics/claude-code/issues
