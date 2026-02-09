# MonkDB User Isolation - How It Works

## Your Question

**"If user1 and user2 both have full access, can they see each other's databases? Or does each user have their own database/schema?"**

## The Answer

### ⚠️ BY DEFAULT: ALL USERS SEE THE SAME DATA

**MonkDB does NOT automatically isolate users!**

If `user1` and `user2` both have full access (AL or DML privileges), they:
- ✅ See the **SAME schemas**
- ✅ See the **SAME tables**
- ✅ See the **SAME data**
- ✅ Can modify/delete each other's data

**This is BY DESIGN** - MonkDB is like PostgreSQL, not like separate user accounts.

---

## How MonkDB Organizes Data

### 1. No "Databases" - Uses SCHEMAS Instead

MonkDB doesn't have separate "databases". It has **SCHEMAS** (namespaces):

```
MonkDB Cluster
├── Schema: monkdb (default - where user tables go)
│   ├── Table: users
│   ├── Table: products
│   └── Table: orders
├── Schema: sys (system information)
│   ├── Table: nodes
│   ├── Table: users
│   └── Table: privileges
├── Schema: information_schema (metadata)
└── Schema: pg_catalog (PostgreSQL compatibility)
```

### 2. Default Schema: `monkdb`

When you run:
```sql
CREATE TABLE users (id INT, name TEXT);
```

It creates: `monkdb.users` (full name: `schema.table`)

**ALL users** connect to the SAME cluster and by default use the SAME schema.

---

## Current Behavior (What You're Seeing)

### Scenario: Two Full-Access Users

```sql
-- Create two users with full access
CREATE USER alice WITH (password = 'alice123');
GRANT AL TO alice;

CREATE USER bob WITH (password = 'bob123');
GRANT AL TO bob;
```

**What happens:**

1. **Alice connects** → sees schema `monkdb`
2. **Alice creates table:** `CREATE TABLE alice_data (id INT);`
3. **Bob connects** → sees schema `monkdb`
4. **Bob can see Alice's table:** `SELECT * FROM alice_data;` ✅
5. **Bob can delete Alice's table:** `DROP TABLE alice_data;` ✅

**They share everything!**

---

## How to Isolate Users (3 Methods)

### Method 1: Per-User Schemas (Recommended for Multi-Tenancy)

Create a separate schema for each user:

```sql
-- Create schemas
CREATE SCHEMA alice_schema;
CREATE SCHEMA bob_schema;

-- Create users
CREATE USER alice WITH (password = 'alice123');
CREATE USER bob WITH (password = 'bob123');

-- Grant permissions ONLY on their own schema
GRANT DQL, DML, DDL ON SCHEMA alice_schema TO alice;
GRANT DQL, DML, DDL ON SCHEMA bob_schema TO bob;

-- DENY access to other schemas
DENY ALL ON SCHEMA bob_schema TO alice;
DENY ALL ON SCHEMA alice_schema TO bob;
```

**Result:**
- Alice can only create/see tables in `alice_schema`
- Bob can only create/see tables in `bob_schema`
- They are isolated ✅

**Alice's tables:**
```sql
-- Alice connects
CREATE TABLE alice_schema.users (id INT, name TEXT);
SELECT * FROM alice_schema.users; -- ✅ Works

-- Alice tries to access Bob's schema
SELECT * FROM bob_schema.users; -- ❌ Permission denied
```

---

### Method 2: Shared Schema with Table-Level Permissions

Use the default `monkdb` schema but restrict table access:

```sql
-- Create users
CREATE USER alice WITH (password = 'alice123');
CREATE USER bob WITH (password = 'bob123');

-- Alice creates a table
-- (as superuser first, then grant)
CREATE TABLE monkdb.alice_data (id INT);
GRANT DQL, DML ON TABLE monkdb.alice_data TO alice;
DENY ALL ON TABLE monkdb.alice_data TO bob;

-- Bob creates a table
CREATE TABLE monkdb.bob_data (id INT);
GRANT DQL, DML ON TABLE monkdb.bob_data TO bob;
DENY ALL ON TABLE monkdb.bob_data TO alice;
```

**Result:**
- Both use `monkdb` schema
- Alice can only access `alice_data`
- Bob can only access `bob_data`
- Partially isolated ⚠️ (but tedious - must set per table)

---

### Method 3: Row-Level Security with Views

Multiple users share tables but see different rows:

```sql
-- Shared table with tenant_id column
CREATE TABLE monkdb.users (
  id INT,
  tenant_id TEXT,
  name TEXT
);

-- Insert data for different tenants
INSERT INTO monkdb.users VALUES (1, 'alice', 'Alice User');
INSERT INTO monkdb.users VALUES (2, 'bob', 'Bob User');

-- Create views for each user
CREATE VIEW alice_users AS
  SELECT id, name FROM monkdb.users WHERE tenant_id = 'alice';

CREATE VIEW bob_users AS
  SELECT id, name FROM monkdb.users WHERE tenant_id = 'bob';

-- Grant access to views only
GRANT DQL ON VIEW alice_users TO alice;
GRANT DQL ON VIEW bob_users TO bob;

-- Deny access to raw table
DENY ALL ON TABLE monkdb.users TO alice;
DENY ALL ON TABLE monkdb.users TO bob;
```

**Result:**
- Alice queries `alice_users` → only sees her rows
- Bob queries `bob_users` → only sees his rows
- Row-level isolation ✅

---

## What Your Workbench Should Show

### Current (Wrong - Confusing)

```
Alice connects → Sees:
  Schema: monkdb
    ├── alice_data
    ├── bob_data      ← Should NOT see this!
    └── shared_table
```

### Correct (Filter by Permissions)

```
Alice connects → Sees:
  Schema: monkdb
    ├── alice_data      ← Has access
    └── shared_table    ← Has access

  (bob_data is hidden because Alice has DENY on it)
```

---

## How to Fix the Workbench

### Problem

Currently, the workbench shows **ALL schemas and ALL tables** regardless of user permissions.

### Solution

Filter schemas and tables based on user's actual grants:

```sql
-- Query to get schemas user can access
SELECT DISTINCT table_schema
FROM information_schema.table_privileges
WHERE grantee = current_user
  AND privilege_type IN ('DQL', 'DML', 'DDL', 'AL');

-- Query to get tables user can access in a schema
SELECT DISTINCT table_name
FROM information_schema.table_privileges
WHERE grantee = current_user
  AND table_schema = 'monkdb'
  AND privilege_type IN ('DQL', 'DML', 'DDL', 'AL');
```

**Important:** If user has DENY on a table, it won't appear in `table_privileges` (or will have explicit DENY).

---

## Recommended Multi-Tenant Setup

For proper user isolation (each user sees only their data):

### Step 1: Create Per-User Schemas

```sql
-- For each new user
CREATE SCHEMA user1_schema;
CREATE USER user1 WITH (password = 'pass123');
GRANT DML, DQL, DDL ON SCHEMA user1_schema TO user1;
DENY ALL ON SCHEMA user2_schema TO user1; -- Block other users' schemas

CREATE SCHEMA user2_schema;
CREATE USER user2 WITH (password = 'pass456');
GRANT DML, DQL, DDL ON SCHEMA user2_schema TO user2;
DENY ALL ON SCHEMA user1_schema TO user2;
```

### Step 2: Set Default Schema for Each User

```sql
-- Set default search_path so user doesn't need to specify schema
ALTER USER user1 SET (search_path = 'user1_schema');
ALTER USER user2 SET (search_path = 'user2_schema');
```

Now:
- `user1` runs `CREATE TABLE data (id INT);` → creates `user1_schema.data`
- `user2` runs `CREATE TABLE data (id INT);` → creates `user2_schema.data`
- They are isolated! ✅

### Step 3: Update Workbench to Filter

```typescript
// In SchemaViewer component
async function getVisibleSchemas(username: string) {
  const result = await client.query(`
    SELECT DISTINCT table_schema
    FROM information_schema.table_privileges
    WHERE grantee = ?
      AND privilege_type IN ('DQL', 'DML', 'DDL', 'AL')
    ORDER BY table_schema
  `, [username]);

  return result.rows.map(r => r[0]);
}

// Only show schemas the user has access to
```

---

## Example: Full Multi-Tenant Setup

```sql
-- Admin creates tenant schemas
CREATE SCHEMA tenant_acme;
CREATE SCHEMA tenant_widgets;

-- Admin creates users for each tenant
CREATE USER acme_admin WITH (password = 'acme123');
CREATE USER widget_admin WITH (password = 'widget123');

-- Grant ONLY their own schema
GRANT DML, DQL, DDL ON SCHEMA tenant_acme TO acme_admin;
GRANT DML, DQL, DDL ON SCHEMA tenant_widgets TO widget_admin;

-- Explicitly deny other schemas
DENY ALL ON SCHEMA tenant_widgets TO acme_admin;
DENY ALL ON SCHEMA tenant_acme TO widget_admin;

-- Set default schema
ALTER USER acme_admin SET (search_path = 'tenant_acme');
ALTER USER widget_admin SET (search_path = 'tenant_widgets');
```

**Result:**

```
acme_admin connects →
  Shows ONLY: tenant_acme schema
  Can create tables in tenant_acme
  Cannot see tenant_widgets ✅

widget_admin connects →
  Shows ONLY: tenant_widgets schema
  Can create tables in tenant_widgets
  Cannot see tenant_acme ✅
```

---

## Summary

| Aspect | Current Behavior | Recommended Approach |
|--------|------------------|---------------------|
| **Data Isolation** | ❌ All users see all data | ✅ Per-user schemas with GRANT/DENY |
| **Schema Visibility** | ❌ Shows all schemas | ✅ Filter by table_privileges |
| **Table Visibility** | ❌ Shows all tables | ✅ Filter by table_privileges |
| **Default Behavior** | ❌ Shared everything | ✅ Isolated by schema |
| **Multi-Tenancy** | ❌ Not supported out-of-box | ✅ Create schema per tenant |

---

## Action Items for Workbench

1. **Filter schemas** - Only show schemas user has privileges on
2. **Filter tables** - Only show tables user can access
3. **Add "Create Schema" button** - For superusers to create tenant schemas
4. **Schema selector** - Let users switch between schemas they have access to
5. **Show current schema** - Display which schema queries will run in

---

## Testing

### Test 1: Shared Access (Current)
```sql
CREATE USER test1 WITH (password = 'test1');
CREATE USER test2 WITH (password = 'test2');
GRANT AL TO test1;
GRANT AL TO test2;
```
**Result:** Both see everything ❌

### Test 2: Isolated Access (Recommended)
```sql
CREATE SCHEMA test1_data;
CREATE SCHEMA test2_data;

CREATE USER test1 WITH (password = 'test1');
CREATE USER test2 WITH (password = 'test2');

GRANT DML, DQL, DDL ON SCHEMA test1_data TO test1;
GRANT DML, DQL, DDL ON SCHEMA test2_data TO test2;

DENY ALL ON SCHEMA test2_data TO test1;
DENY ALL ON SCHEMA test1_data TO test2;
```
**Result:** Each user only sees their schema ✅

---

**Bottom Line:**
- MonkDB does NOT automatically isolate users
- You must explicitly create schemas and grant/deny access
- The workbench should filter schemas/tables based on `information_schema.table_privileges`

---

Last updated: 2026-02-07
