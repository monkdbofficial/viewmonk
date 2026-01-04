# Production Setup Guide - MonkDB Workbench

## 🚀 Quick Start

### Option 1: One-Command Setup (Easiest)

```bash
# This script does everything for you
./scripts/start-monkdb.sh
```

The script will:
- Check if Docker is installed
- Start MonkDB container (or reuse existing one)
- Wait for MonkDB to be ready
- Display connection settings

---

### Option 2: Using Docker Compose (Recommended)

**1. Start MonkDB:**
```bash
docker-compose up -d
```

**2. Verify it's running:**
```bash
# Check container status
docker-compose ps

# Test HTTP endpoint
curl http://localhost:4200

# Test SQL endpoint
curl http://localhost:4200/_sql \
  -H "Content-Type: application/json" \
  -d '{"stmt": "SELECT 1"}'
```

**3. Initialize database with sample data:**
```bash
# Copy SQL to container and execute
docker exec -i monkdb-monkdb crash < scripts/init-database.sql
```

**4. Start the workbench:**
```bash
npm run dev
```

**5. Add connection:**
- Host: `localhost`
- Port: `4200`
- Username: (leave empty - no auth by default)
- Password: (leave empty)

---

### Option 2: Using Docker Run

```bash
# Start MonkDB
docker run -d \
  --name monkdb \
  -p 4200:4200 \
  -p 5432:5432 \
  -v monkdb-data:/data \
  -e CRATE_HEAP_SIZE=2g \
  monk:latest \
  crate \
  -Ccluster.name=monkdb-cluster \
  -Cnode.name=monkdb-node1 \
  -Cnetwork.host=0.0.0.0 \
  -Cdiscovery.type=single-node

# Check logs
docker logs monkdb

# Initialize database
docker exec -i monkdb crash < scripts/init-database.sql
```

---

### Option 3: Direct Installation (macOS)

**1. Install MonkDB:**
```bash
# Using Homebrew
brew install crate

# Or download from: https://crate.io/download/
```

**2. Start MonkDB:**
```bash
crate
```

**3. Initialize database:**
```bash
# Open another terminal
crash < scripts/init-database.sql
```

---

## 📊 Verify Installation

### Check MonkDB Admin UI
Open: http://localhost:4200

You should see the MonkDB admin interface.

### Test SQL Endpoint
```bash
curl http://localhost:4200/_sql \
  -H "Content-Type: application/json" \
  -d '{"stmt": "SELECT * FROM sys.nodes"}'
```

### Check Tables
```bash
curl http://localhost:4200/_sql \
  -H "Content-Type: application/json" \
  -d '{"stmt": "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = '\''doc'\''"}'
```

---

## 🔧 Configuration

### Environment Variables

Create `.env.local` (already exists):
```env
# MongoDB for user data
MONGODB_URI=mongodb://localhost:27017/monkdb_workbench

# Auth secrets
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# MonkDB defaults
NEXT_PUBLIC_DEFAULT_MONKDB_HOST=localhost
NEXT_PUBLIC_DEFAULT_MONKDB_PORT=4200
```

### MonkDB Configuration

Edit `docker-compose.yml` to customize:
- Heap size: `-e CRATE_HEAP_SIZE=2g`
- Cluster name: `-Ccluster.name=your-cluster`
- Network settings: `-Cnetwork.host=0.0.0.0`

---

## 🔒 Production Security

### 1. Enable Authentication

Add to `docker-compose.yml`:
```yaml
environment:
  - CRATE_HEAP_SIZE=2g
  - "CRATE_JAVA_OPTS=-Dauth.host_based.enabled=true"
command:
  - crate
  # ... existing commands ...
  - -Cauth.host_based.config.0.user=admin
  - -Cauth.host_based.config.0.method=trust
```

### 2. Use HTTPS in Production

Set up nginx or use MonkDB's SSL:
```yaml
command:
  - crate
  # ... existing commands ...
  - -Cssl.http.enabled=true
  - -Cssl.http.keystore.filepath=/path/to/keystore
```

### 3. Firewall Rules

Only expose ports to trusted networks:
```yaml
ports:
  - "127.0.0.1:4200:4200"  # Only localhost
```

---

## 📝 Common Commands

### Docker Commands
```bash
# Start MonkDB
docker-compose up -d

# Stop MonkDB
docker-compose down

# View logs
docker-compose logs -f monkdb

# Restart MonkDB
docker-compose restart monkdb

# Remove everything (including data)
docker-compose down -v
```

### SQL Commands
```bash
# Connect to MonkDB shell
docker exec -it monkdb-monkdb crash

# Execute SQL file
docker exec -i monkdb-monkdb crash < your-script.sql

# Backup data
docker exec monkdb-monkdb crash -c "COPY doc.users TO '/tmp/users.json'"
```

---

## 🎯 Usage Workflow

**1. Start Services:**
```bash
# Terminal 1: Start MonkDB
docker-compose up -d

# Terminal 2: Start MongoDB (for user data)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Terminal 3: Start Workbench
npm run dev
```

**2. First Time Setup:**
1. Open http://localhost:3000
2. Register a new user
3. Go to `/connections`
4. Add MonkDB connection:
   - Host: localhost
   - Port: 4200
   - Username: (empty)
   - Password: (empty)
5. Click "Test Connection" → Should show ✅
6. Click "Finish" → Connection saved
7. Click "Use" → Now active!

**3. Explore Data:**
- Go to `/unified-browser` → See schemas and tables
- Go to `/query-editor` → Run SQL queries
- Go to `/dashboard` → View metrics

---

## 🐛 Troubleshooting

### Connection Refused
```bash
# Check if MonkDB is running
docker ps | grep monkdb

# Check logs
docker logs monkdb-monkdb

# Restart if needed
docker-compose restart monkdb
```

### Port Already in Use
```bash
# Find process using port 4200
lsof -i :4200

# Kill it or change port in docker-compose.yml
```

### Data Not Showing
```bash
# Refresh tables
curl http://localhost:4200/_sql \
  -H "Content-Type: application/json" \
  -d '{"stmt": "REFRESH TABLE doc.users"}'
```

### MongoDB Connection Error
```bash
# Start MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or use existing MongoDB instance
# Update MONGODB_URI in .env.local
```

---

## 📚 Resources

- **MonkDB Docs:** https://crate.io/docs/
- **SQL Reference:** https://crate.io/docs/sql/
- **Docker Docs:** https://docs.docker.com/
- **MonkDB Workbench Issues:** https://github.com/anthropics/claude-code/issues

---

## 🚀 Production Deployment

### Using Docker Swarm
```bash
docker swarm init
docker stack deploy -c docker-compose.yml monkdb
```

### Using Kubernetes
Create deployment manifests for:
- MonkDB StatefulSet
- MongoDB deployment
- Workbench deployment
- Ingress for HTTPS

### Cloud Deployment
- **AWS:** Use ECS or EKS
- **GCP:** Use Cloud Run or GKE
- **Azure:** Use AKS

---

**Your MonkDB Workbench is now production-ready!** 🎉
