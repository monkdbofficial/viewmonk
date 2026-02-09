# Enterprise Database User Isolation - Industry Analysis & Recommendation

## How Major Enterprise Databases Handle User Isolation

### 1. PostgreSQL (Most Similar to MonkDB)

**Architecture:**
```
Server (Cluster)
├── Database: postgres (default)
├── Database: app1
│   ├── Schema: public (default)
│   ├── Schema: tenant1
│   └── Schema: tenant2
└── Database: app2
```

**Approach:**
- **Databases** for complete isolation (separate catalogs)
- **Schemas** within databases for logical grouping
- **Row-Level Security (RLS)** for same-table multi-tenancy

**Enterprise Pattern:**
```sql
-- Option 1: Database per tenant (strongest isolation)
CREATE DATABASE tenant_acme;
CREATE DATABASE tenant_widgets;

-- Option 2: Schema per tenant (same database)
CREATE SCHEMA tenant_acme;
CREATE SCHEMA tenant_widgets;

-- Option 3: Shared tables with RLS
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.tenant_id'));
```

**Used by:** Citus (multi-tenant PostgreSQL), Heroku Postgres, AWS RDS

---

### 2. Oracle Database

**Architecture:**
```
Database Instance
├── User: ACME (owns ACME schema)
│   ├── Table: CUSTOMERS
│   └── Table: ORDERS
├── User: WIDGETS (owns WIDGETS schema)
│   ├── Table: CUSTOMERS
│   └── Table: ORDERS
└── Common schemas (SYSTEM, SYS)
```

**Approach:**
- **Each user has their own schema** (user = schema)
- Users CANNOT access other users' schemas by default
- Must explicitly grant cross-schema access

**Enterprise Pattern:**
```sql
-- Create user (automatically creates schema)
CREATE USER acme_app IDENTIFIED BY password;
GRANT CREATE TABLE TO acme_app;

-- acme_app creates tables in their schema
CREATE TABLE customers (id NUMBER, name VARCHAR2(100));
-- Creates: acme_app.customers

-- Other users CANNOT see it unless granted
```

**Used by:** Oracle Cloud, Oracle Multitenant, Autonomous Database

---

### 3. SQL Server

**Architecture:**
```
Server
├── Database: master
├── Database: TenantA
│   ├── Schema: dbo (default)
│   ├── Schema: sales
│   └── Schema: hr
└── Database: TenantB
```

**Approach:**
- **Databases** for tenant isolation
- **Schemas** for application modules within database
- **Contained Databases** for complete portability

**Enterprise Pattern:**
```sql
-- Option 1: Database per tenant
CREATE DATABASE TenantA;
CREATE DATABASE TenantB;

-- Option 2: Shared database with schemas
USE SharedDB;
CREATE SCHEMA TenantA;
CREATE SCHEMA TenantB;
```

**Used by:** Azure SQL Database, SQL Server Multi-Tenant SaaS

---

### 4. MySQL

**Architecture:**
```
Server
├── Database: tenant_acme
│   ├── Table: users
│   └── Table: orders
└── Database: tenant_widgets
    ├── Table: users
    └── Table: orders
```

**Approach:**
- **Databases** = **Schemas** (same thing in MySQL)
- No sub-schemas within databases
- Users granted per-database access

**Enterprise Pattern:**
```sql
-- Create databases (= schemas)
CREATE DATABASE tenant_acme;
CREATE DATABASE tenant_widgets;

-- Create users with database-specific access
CREATE USER 'acme_user'@'%' IDENTIFIED BY 'password';
GRANT ALL ON tenant_acme.* TO 'acme_user'@'%';

CREATE USER 'widgets_user'@'%' IDENTIFIED BY 'password';
GRANT ALL ON tenant_widgets.* TO 'widgets_user'@'%';
```

**Used by:** AWS RDS MySQL, Google Cloud SQL

---

### 5. MongoDB

**Architecture:**
```
Server
├── Database: tenant_acme
│   ├── Collection: users
│   └── Collection: orders
└── Database: tenant_widgets
```

**Approach:**
- **Databases** for isolation
- No schemas (document model)
- Role-based access per database

**Enterprise Pattern:**
```javascript
// Create databases
use tenant_acme;
db.createCollection("users");

use tenant_widgets;
db.createCollection("users");

// Create users with database-specific roles
db.createUser({
  user: "acme_user",
  pwd: "password",
  roles: [{ role: "readWrite", db: "tenant_acme" }]
});
```

**Used by:** MongoDB Atlas Multi-Tenant

---

### 6. Snowflake (Most Enterprise)

**Architecture:**
```
Account
├── Database: PROD
│   ├── Schema: TENANT_ACME
│   │   ├── Table: USERS
│   │   └── Table: ORDERS
│   └── Schema: TENANT_WIDGETS
└── Database: DEV
```

**Approach:**
- **Databases** for environments (prod, dev, test)
- **Schemas** for tenants or modules
- **Role hierarchy** for access control
- **Data sharing** across accounts

**Enterprise Pattern:**
```sql
-- Databases for environments
CREATE DATABASE PRODUCTION;
CREATE DATABASE DEVELOPMENT;

-- Schemas per tenant within environment
USE DATABASE PRODUCTION;
CREATE SCHEMA TENANT_ACME;
CREATE SCHEMA TENANT_WIDGETS;

-- Role-based access
CREATE ROLE ACME_ROLE;
GRANT USAGE ON SCHEMA TENANT_ACME TO ROLE ACME_ROLE;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA TENANT_ACME TO ROLE ACME_ROLE;

-- Assign role to user
GRANT ROLE ACME_ROLE TO USER acme_user;
```

**Used by:** Snowflake Cloud Data Platform

---

## Industry Patterns Summary

| Database | Primary Isolation | Secondary | Multi-Tenant Pattern | Enterprise Grade |
|----------|------------------|-----------|---------------------|------------------|
| **PostgreSQL** | Database | Schema | Schema per tenant | ⭐⭐⭐⭐⭐ |
| **Oracle** | Schema (= User) | Tablespace | User = Schema | ⭐⭐⭐⭐⭐ |
| **SQL Server** | Database | Schema | Database per tenant | ⭐⭐⭐⭐ |
| **MySQL** | Database (= Schema) | None | Database per tenant | ⭐⭐⭐ |
| **MongoDB** | Database | None | Database per tenant | ⭐⭐⭐⭐ |
| **Snowflake** | Schema | Database | Schema per tenant | ⭐⭐⭐⭐⭐ |
| **MonkDB/CrateDB** | Schema | None | **Schema per tenant** | ⭐⭐⭐⭐ |

---

## Enterprise-Grade Approaches (3 Patterns)

### Pattern 1: Shared Database, Separate Schemas (RECOMMENDED ✅)

**Best for:** SaaS applications, internal multi-tenant systems

**Pros:**
- ✅ Cost-effective (shared resources)
- ✅ Easy to manage (one cluster)
- ✅ Scales well (1000+ tenants)
- ✅ Fast tenant provisioning
- ✅ Schema-level security

**Cons:**
- ⚠️ Shared resources (noisy neighbor)
- ⚠️ All tenants on same version

**Implementation:**
```sql
-- One MonkDB cluster
-- Schema per tenant

CREATE SCHEMA tenant_acme;
CREATE SCHEMA tenant_widgets;
CREATE SCHEMA tenant_enterprise;

-- User per tenant (or shared user per tenant)
CREATE USER acme_admin WITH (password = 'secure');
GRANT DML, DQL, DDL ON SCHEMA tenant_acme TO acme_admin;
DENY ALL ON SCHEMA tenant_widgets TO acme_admin;
DENY ALL ON SCHEMA tenant_enterprise TO acme_admin;
```

**Used by:** Salesforce, GitHub, Slack

---

### Pattern 2: Database per Tenant (Not Available in MonkDB)

**Best for:** High-value customers, regulated industries

**Pros:**
- ✅ Complete isolation
- ✅ Per-tenant backups
- ✅ Different versions per tenant
- ✅ Easier compliance

**Cons:**
- ❌ High cost (separate instances)
- ❌ Complex management
- ❌ Limited scale (100s, not 1000s)

**Note:** MonkDB doesn't have separate databases - only schemas

---

### Pattern 3: Shared Tables with Row-Level Security

**Best for:** Same schema for all tenants, massive scale

**Pros:**
- ✅ Highest density (millions of tenants)
- ✅ Simple schema management
- ✅ Global queries possible

**Cons:**
- ⚠️ Complex queries (always filter by tenant_id)
- ⚠️ Risk of data leaks (missing WHERE clause)
- ⚠️ Limited per-tenant customization

**Implementation:**
```sql
-- Single shared schema with tenant_id column
CREATE TABLE monkdb.users (
  id INTEGER,
  tenant_id TEXT,
  name TEXT,
  email TEXT
);

-- Create filtered views per tenant
CREATE VIEW tenant_acme_users AS
  SELECT id, name, email FROM monkdb.users
  WHERE tenant_id = 'acme';

-- Grant access to view only
GRANT DQL, DML ON VIEW tenant_acme_users TO acme_user;
DENY ALL ON TABLE monkdb.users TO acme_user;
```

**Used by:** AWS (shared tables), Stripe, Twilio

---

## Recommendation for MonkDB Workbench

### ⭐ **SCHEMA-PER-TENANT APPROACH** (Pattern 1)

**Why:**
1. ✅ MonkDB supports schemas (no databases)
2. ✅ Matches PostgreSQL enterprise pattern
3. ✅ Clean isolation with GRANT/DENY
4. ✅ Scales to 1000+ tenants
5. ✅ Cost-effective (shared cluster)

**Architecture:**
```
MonkDB Cluster
├── Schema: tenant_001 (Company A)
│   ├── users, orders, products
│   └── User: company_a_admin (only sees this)
├── Schema: tenant_002 (Company B)
│   ├── users, orders, products
│   └── User: company_b_admin (only sees this)
├── Schema: tenant_003 (Company C)
└── Schema: shared (optional common data)
```

---

## Implementation Plan for Workbench

### Phase 1: Schema-Based Isolation

**1. Update Schema Browser**
```typescript
// Only show schemas user has access to
async function getUserSchemas(username: string) {
  const result = await client.query(`
    SELECT DISTINCT table_schema
    FROM information_schema.table_privileges
    WHERE grantee = ?
      AND privilege_type IN ('DQL', 'DML', 'DDL', 'AL')
      AND table_schema NOT IN ('sys', 'information_schema', 'pg_catalog')
    ORDER BY table_schema
  `, [username]);

  return result.rows.map(r => r[0]);
}
```

**2. Add Schema Selector**
```typescript
// Let user switch between their schemas
<Select value={activeSchema} onChange={setActiveSchema}>
  {userSchemas.map(schema => (
    <Option value={schema}>{schema}</Option>
  ))}
</Select>
```

**3. Filter Tables by Schema + Permissions**
```typescript
async function getUserTables(schema: string, username: string) {
  const result = await client.query(`
    SELECT DISTINCT table_name
    FROM information_schema.table_privileges
    WHERE grantee = ?
      AND table_schema = ?
      AND privilege_type IN ('DQL', 'DML', 'DDL', 'AL')
    ORDER BY table_name
  `, [username, schema]);

  return result.rows.map(r => r[0]);
}
```

**4. Add "Create Schema" for Superusers**
```typescript
// Only show if user has AL privilege
{isSuperuser && (
  <button onClick={handleCreateSchema}>
    + Create Schema (New Tenant)
  </button>
)}
```

---

### Phase 2: Tenant Management UI

**1. Tenant Creation Wizard**
```typescript
// For superusers - create new tenant
async function createTenant(tenantName: string, adminPassword: string) {
  const schemaName = `tenant_${tenantName.toLowerCase()}`;
  const userName = `${tenantName}_admin`;

  // Create schema
  await client.query(`CREATE SCHEMA ${schemaName}`);

  // Create user
  await client.query(`CREATE USER ${userName} WITH (password = ??)`, [adminPassword]);

  // Grant permissions
  await client.query(`GRANT DML, DQL, DDL ON SCHEMA ${schemaName} TO ${userName}`);

  // Set default schema
  await client.query(`ALTER USER ${userName} SET (search_path = '${schemaName}')`);

  return { schema: schemaName, user: userName };
}
```

**2. Tenant List/Management**
```typescript
// Show all tenants (superuser only)
async function listTenants() {
  const result = await client.query(`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
    ORDER BY schema_name
  `);

  return result.rows.map(r => r[0]);
}
```

---

### Phase 3: Default Schema Support

**1. Detect User's Default Schema**
```typescript
async function getUserDefaultSchema(username: string) {
  // Check if user has search_path set
  const result = await client.query(`
    SELECT setting
    FROM pg_settings
    WHERE name = 'search_path'
  `);

  // Or query user settings (MonkDB specific)
  // Return first accessible schema if not set
}
```

**2. Auto-Select on Login**
```typescript
// When user connects, automatically select their default schema
useEffect(() => {
  if (activeConnection) {
    const defaultSchema = await getUserDefaultSchema(activeConnection.config.username);
    setActiveSchema(defaultSchema);
  }
}, [activeConnection]);
```

---

## Configuration Options

### Option A: Pure Multi-Tenant (SaaS)
```sql
-- Each customer gets their own schema
-- No shared data
-- Complete isolation

tenant_customer1/
tenant_customer2/
tenant_customer3/
```

### Option B: Hybrid (Internal Use + Multi-Tenant)
```sql
-- Some shared schemas for internal use
-- Some tenant schemas for customers

shared/        -- Company-wide data
analytics/     -- Internal analytics
tenant_acme/   -- Customer A
tenant_widgets/-- Customer B
```

### Option C: Department-Based (Enterprise Internal)
```sql
-- Schema per department/team

sales/         -- Sales team
marketing/     -- Marketing team
engineering/   -- Engineering team
finance/       -- Finance team
```

---

## Migration Path

### Step 1: Enable Schema Filtering (This Week)
- Update SchemaViewer to filter by `table_privileges`
- Only show schemas user has access to
- Only show tables user can access

### Step 2: Add Schema Selector (Next Week)
- Dropdown to switch between schemas
- Remember last selected schema
- Show current schema in UI

### Step 3: Create Schema Management (Week 3)
- "Create Schema" button for superusers
- Schema permissions editor
- User-to-schema assignment

### Step 4: Tenant Wizard (Week 4)
- One-click tenant creation
- Automatic user + schema setup
- Pre-configured permissions

---

## Testing Plan

### Test 1: Isolated Tenants
```sql
CREATE SCHEMA tenant_a;
CREATE SCHEMA tenant_b;

CREATE USER user_a WITH (password = 'test');
CREATE USER user_b WITH (password = 'test');

GRANT DML, DQL, DDL ON SCHEMA tenant_a TO user_a;
GRANT DML, DQL, DDL ON SCHEMA tenant_b TO user_b;

DENY ALL ON SCHEMA tenant_b TO user_a;
DENY ALL ON SCHEMA tenant_a TO user_b;
```

**Expected:**
- user_a sees ONLY tenant_a schema ✅
- user_b sees ONLY tenant_b schema ✅

### Test 2: Shared Schema
```sql
CREATE SCHEMA shared;

GRANT DQL ON SCHEMA shared TO user_a;
GRANT DQL ON SCHEMA shared TO user_b;
```

**Expected:**
- Both users see shared schema (read-only) ✅

### Test 3: Superuser
```sql
CREATE USER admin WITH (password = 'admin');
GRANT AL TO admin;
```

**Expected:**
- admin sees ALL schemas ✅
- Can create new schemas ✅

---

## Best Practice Recommendations

1. **✅ Use Schema Per Tenant** - Standard enterprise pattern
2. **✅ Set Default Schema** - Users don't need to specify schema name
3. **✅ Explicit DENY** - Block cross-tenant access
4. **✅ Naming Convention** - `tenant_<name>` or `customer_<id>`
5. **✅ Superuser Management** - Only admins see all schemas
6. **✅ Audit Logging** - Track cross-schema access attempts
7. **✅ Schema Quotas** - Limit tables/data per tenant (if needed)

---

## Summary

| Approach | MonkDB Support | Enterprise Grade | Recommended |
|----------|----------------|------------------|-------------|
| **Schema per tenant** | ✅ Yes | ⭐⭐⭐⭐⭐ | **YES** ✅ |
| Database per tenant | ❌ No (no databases) | ⭐⭐⭐⭐⭐ | N/A |
| Shared tables + RLS | ✅ Via views | ⭐⭐⭐⭐ | Complex |
| No isolation (current) | ✅ Default | ⭐ | **NO** ❌ |

**Final Recommendation:**
**Use Schema-Per-Tenant with filtered UI** - This matches PostgreSQL, Snowflake, and Oracle enterprise patterns, provides clean isolation, and scales well.

---

Last updated: 2026-02-07
