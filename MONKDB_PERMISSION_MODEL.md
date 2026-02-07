# MonkDB Permission Model - Deep Dive

Based on official MonkDB documentation analysis.

## Core Concepts

### 1. Users vs Roles

**USER:**
- ✅ Can login to database
- ✅ Can have password
- ✅ Cannot be granted to other users/roles
- ✅ Can belong to roles (via `GRANT role TO user`)

**ROLE:**
- ❌ Cannot login
- ❌ Cannot have password
- ✅ Can be granted to users/roles
- ✅ Used for privilege inheritance

### 2. Privilege Types

MonkDB uses 4 privilege levels:

| Privilege | Full Name | Operations | Maps To |
|-----------|-----------|------------|---------|
| **DQL** | Data Query Language | SELECT | Read-Only |
| **DML** | Data Manipulation Language | INSERT, UPDATE, DELETE | Read-Write |
| **DDL** | Data Definition Language | CREATE, ALTER, DROP | Admin/Superuser |
| **AL** | Admin Level | All cluster operations | Superuser |

### 3. The "monkdb" Superuser

```
Special built-in superuser:
- Username: "monkdb"
- Authentication: Trust (no password)
- Access: Localhost only
- Purpose: Initial cluster setup and admin tasks
```

### 4. Privilege Scopes

Privileges can be granted at:
- **CLUSTER** level (default if no ON clause)
- **SCHEMA** level
- **TABLE** level
- **VIEW** level

```sql
-- Cluster level (most permissive)
GRANT DQL TO john;

-- Schema level
GRANT DQL ON SCHEMA doc TO john;

-- Table level (most restrictive)
GRANT DQL ON TABLE doc.users TO john;
```

## System Tables

### `sys.users`

Query user information:
```sql
SELECT name, superuser FROM sys.users WHERE name = 'john';
```

**Columns:**
- `name` - Username
- `superuser` - Boolean (true if user has AL privileges)

### `information_schema.table_privileges`

Query table-level privileges:
```sql
SELECT privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'john';
```

**Returns:**
- `DQL`, `DML`, `DDL`, `AL` (as strings)

## Permission Detection Strategy

### Approach 1: Check AL Privilege (Recommended)

A user with **AL** privilege is a superuser:

```sql
-- Check if user has AL at any level
SELECT COUNT(*) FROM information_schema.table_privileges
WHERE grantee = 'john' AND privilege_type = 'AL';
```

If count > 0 → User is superuser

### Approach 2: Check sys.users.superuser

```sql
SELECT superuser FROM sys.users WHERE name = 'john';
```

If `superuser = true` → User is superuser

**⚠️ Note:** The `superuser` column in `sys.users` likely reflects AL privilege status.

## Mapping to Workbench Roles

### Our Simplified Model

We use 3 roles for UI simplicity:

| Workbench Role | MonkDB Privileges | Can Do |
|----------------|-------------------|---------|
| **👁️ Read-Only** | DQL only | SELECT |
| **✏️ Read-Write** | DQL + DML | SELECT, INSERT, UPDATE, DELETE |
| **👑 Administrator** | AL or (DQL + DML + DDL) | Everything |

### Detection Logic

```typescript
async function detectUserRole(username: string): Promise<Role> {
  // Special case: "monkdb" is always superuser
  if (username === 'monkdb' || !username) {
    return 'superuser';
  }

  try {
    // Method 1: Check sys.users.superuser column
    const result = await client.query(
      `SELECT superuser FROM sys.users WHERE name = ?`,
      [username]
    );

    if (result.rows[0]?.[0] === true) {
      return 'superuser';
    }

    // Method 2: Check privileges
    const privResult = await client.query(`
      SELECT DISTINCT privilege_type
      FROM information_schema.table_privileges
      WHERE grantee = ?
    `, [username]);

    const privileges = new Set(privResult.rows.map(r => r[0]));

    // Has AL → Superuser
    if (privileges.has('AL')) {
      return 'superuser';
    }

    // Has DDL → Superuser (can create/drop tables)
    if (privileges.has('DDL')) {
      return 'superuser';
    }

    // Has DML → Read-Write
    if (privileges.has('DML')) {
      return 'read-write';
    }

    // Only DQL → Read-Only
    if (privileges.has('DQL')) {
      return 'read-only';
    }

    // No privileges found → Default to superuser (fail-safe)
    return 'superuser';

  } catch (error) {
    console.error('Permission detection failed:', error);
    // Fail-safe: Grant full access, database will enforce actual permissions
    return 'superuser';
  }
}
```

## Example Permission Scenarios

### Scenario 1: Full Superuser

```sql
CREATE USER admin WITH (password = 'secure123');
GRANT AL TO admin;
```

**Detection:**
- `sys.users.superuser = true` OR
- `privilege_type = 'AL'` found
- **Result:** Role = `'superuser'`

### Scenario 2: Schema Admin

```sql
CREATE USER schema_admin WITH (password = 'secure123');
GRANT DDL ON SCHEMA doc TO schema_admin;
GRANT DML ON SCHEMA doc TO schema_admin;
GRANT DQL ON SCHEMA doc TO schema_admin;
```

**Detection:**
- Has DDL privilege
- **Result:** Role = `'superuser'` (can create tables in schema)

### Scenario 3: Application User

```sql
CREATE USER app_user WITH (password = 'secure123');
GRANT DML ON SCHEMA doc TO app_user;
GRANT DQL ON SCHEMA doc TO app_user;
```

**Detection:**
- Has DML privilege (no DDL)
- **Result:** Role = `'read-write'`

### Scenario 4: Read-Only Analyst

```sql
CREATE USER analyst WITH (password = 'secure123');
GRANT DQL ON SCHEMA doc TO analyst;
```

**Detection:**
- Only has DQL privilege
- **Result:** Role = `'read-only'`

### Scenario 5: Role-Based User

```sql
CREATE ROLE data_engineer;
GRANT DML ON SCHEMA doc TO data_engineer;
GRANT DQL ON SCHEMA doc TO data_engineer;

CREATE USER john WITH (password = 'secure123');
GRANT data_engineer TO john;
```

**Detection:**
- User inherits DML + DQL from role
- Queries return inherited privileges
- **Result:** Role = `'read-write'`

## DENY Statement Impact

```sql
CREATE ROLE admin_role;
GRANT AL TO admin_role;

CREATE USER restricted_admin WITH (password = 'secure123');
GRANT admin_role TO restricted_admin;

-- Explicitly deny access to sys.users
DENY DQL ON TABLE sys.users TO restricted_admin;
```

**Impact:**
- User has AL (superuser)
- But CANNOT query `sys.users` table
- **Workbench:** Still shows as superuser (based on AL privilege)
- **Database:** Blocks `SELECT FROM sys.users` at runtime

This is OK because:
- UI shows user's general role
- Database enforces specific restrictions
- Two-layer security model

## Testing Queries

### Check Your Own Privileges

```sql
-- Check if you're a superuser
SELECT superuser FROM sys.users WHERE name = current_user;

-- List all your privileges
SELECT DISTINCT privilege_type, table_schema, table_name
FROM information_schema.table_privileges
WHERE grantee = current_user
ORDER BY privilege_type;

-- Check specific privilege
SELECT COUNT(*) > 0 AS has_dml
FROM information_schema.table_privileges
WHERE grantee = current_user AND privilege_type = 'DML';
```

### Check Another User's Privileges (AL required)

```sql
-- Check if user is superuser
SELECT superuser FROM sys.users WHERE name = 'john';

-- List user's privileges
SELECT DISTINCT privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'john';
```

## Best Practices

### For Administrators

1. **Use specific users, not "monkdb"** - Create admin users with AL privilege
2. **Principle of least privilege** - Grant only needed privileges
3. **Use roles for groups** - Create roles for job functions, grant to users
4. **Schema-level grants** - Grant on SCHEMA instead of individual tables
5. **DENY for exceptions** - Use DENY to override role-based grants

### For Workbench Implementation

1. **Fail-safe defaults** - Default to 'superuser' if detection fails
2. **Trust the database** - MonkDB enforces permissions regardless of UI
3. **Query sys.users first** - Most reliable source for superuser status
4. **Fallback to privilege check** - Use table_privileges as secondary check
5. **Log extensively** - Debug permission detection in console
6. **Handle role inheritance** - Queries automatically include inherited privileges

## Summary

✅ **MonkDB Permission System:**
- 4 privilege levels: DQL, DML, DDL, AL
- Privileges can be granted at cluster/schema/table level
- Roles for privilege inheritance
- DENY for explicit restrictions
- `sys.users` table for user metadata
- `information_schema.table_privileges` for privilege queries

✅ **Workbench Mapping:**
- AL or DDL → Superuser
- DML (no DDL) → Read-Write
- Only DQL → Read-Only
- Detection fails → Superuser (fail-safe)

✅ **Enterprise Approach:**
- Default to trust (superuser)
- Only restrict when confirmed
- Database enforces actual permissions
- UI provides helpful guidance

---

Last updated: 2026-02-07

**Status: DOCUMENTED ✅ - Official MonkDB documentation reviewed**
