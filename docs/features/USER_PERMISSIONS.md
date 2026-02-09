# User Permissions & Access Control

## Overview

MonkDB Workbench implements a **two-layer permission system**:

1. **UI Layer**: Shows/hides features based on user role (permission-aware UI)
2. **Database Layer**: MonkDB enforces all permissions at the database level (security enforcement)

This means:
- ✅ The UI only shows features you have access to
- ✅ MonkDB validates every query based on your user permissions
- ✅ Even if someone bypasses the UI, MonkDB blocks unauthorized operations

---

## User Roles

When you connect to MonkDB, the workbench automatically detects your role:

### 👁️ Read-Only
- **Can:** View tables, schemas, and data
- **Cannot:** Create, modify, or delete data
- **SQL Grants:** `SELECT` privileges only
- **Use Case:** Analysts, viewers, auditors

### ✏️ Read-Write
- **Can:** View and modify data (INSERT, UPDATE, DELETE)
- **Cannot:** Create/drop tables, manage users, alter schema
- **SQL Grants:** `SELECT, INSERT, UPDATE, DELETE` privileges
- **Use Case:** Application users, data entry staff

### 👑 Administrator (Superuser)
- **Can:** Full database access including schema management
- **Can:** Create/drop tables, manage users, alter settings
- **SQL Grants:** `SUPERUSER` privilege
- **Use Case:** DBAs, system administrators

---

## How Roles Are Detected

When you create a connection, the workbench:

1. Connects to MonkDB with your credentials
2. Queries `pg_user` to check if you're a superuser
3. Queries `information_schema.table_privileges` to check your grants
4. Determines your role based on the results:
   - **Superuser?** → Administrator role
   - **Has INSERT/UPDATE/DELETE?** → Read-Write role
   - **Only SELECT?** → Read-Only role

Your role is saved with the connection and displayed throughout the UI.

---

## Permission-Aware UI

The UI adapts based on your role:

### Read-Only Users See:
- ✅ View tables and schemas
- ✅ SELECT query generator
- ✅ Data preview and export
- ❌ No INSERT/UPDATE/DELETE buttons
- ❌ No table create/drop options
- ⚠️ Yellow warning banner: "Read-Only Mode"

### Read-Write Users See:
- ✅ Everything Read-Only users see
- ✅ INSERT/UPDATE/DELETE query generators
- ✅ Insert and Update forms
- ❌ No CREATE TABLE / DROP TABLE buttons
- ❌ No user management

### Administrators See:
- ✅ Everything Read-Write users see
- ✅ CREATE TABLE / DROP TABLE options
- ✅ User management (if implemented)
- ✅ Schema management

---

## Visual Indicators

### Permission Badges

Badges appear in the Dashboard and Schema Viewer headers:

```
👁️ Read-Only • Can view data only
✏️ Read-Write • Can view and modify data
👑 Administrator • Full database access
```

### Warning Banners

Read-Only users see a yellow warning banner:

```
⚠️ Read-Only Mode: You can view data but cannot modify it.
Contact your administrator for write access.
```

---

## Examples

### Creating a Read-Only User

```sql
-- As superuser (monkdb)
CREATE USER viewer WITH (password = 'secure_password');
GRANT SELECT ON ALL TABLES IN SCHEMA doc TO viewer;
ALTER DEFAULT PRIVILEGES IN SCHEMA doc GRANT SELECT ON TABLES TO viewer;
```

### Creating a Read-Write User

```sql
-- As superuser (monkdb)
CREATE USER app_user WITH (password = 'secure_password');
GRANT ALL PRIVILEGES TO app_user;
```

### Creating an Administrator

```sql
-- As superuser (monkdb)
CREATE USER admin WITH (password = 'secure_password');
ALTER USER admin WITH SUPERUSER;
```

---

## Security Features

### Double Layer Protection

1. **UI Layer** prevents accidental actions by hiding unauthorized buttons
2. **Database Layer** blocks unauthorized queries even if UI is bypassed

Example:
```
Read-Only user tries: DELETE FROM users WHERE id = 1
MonkDB responds: ERROR: Permission denied
```

### Automatic Detection

- No manual role selection needed
- Workbench queries your actual database permissions
- Always reflects current grants

### Per-Connection Roles

- Each connection can have a different role
- Switch connections to use different permissions
- Perfect for testing different access levels

---

## Troubleshooting

### "Why can't I see INSERT/UPDATE buttons?"

Your user has **Read-Only** privileges. Ask your administrator to:
```sql
GRANT ALL PRIVILEGES TO your_username;
```

### "Why can't I create tables?"

Only **Administrators** (superusers) can create tables. Ask your administrator to:
```sql
ALTER USER your_username WITH SUPERUSER;
```

### "My role badge shows the wrong role"

1. Check your actual permissions:
   ```sql
   -- Check if you're superuser
   SELECT usesuper FROM pg_user WHERE usename = current_user;

   -- Check your table privileges
   SELECT privilege_type FROM information_schema.table_privileges
   WHERE grantee = current_user;
   ```

2. Disconnect and reconnect to refresh role detection

---

## Best Practices

### For Administrators

- ✅ Use **Read-Only** users for reporting and analytics
- ✅ Use **Read-Write** users for applications
- ✅ Limit **Administrator** access to DBAs only
- ✅ Regularly audit user permissions
- ✅ Use strong passwords for all users

### For Users

- ✅ Connect with the least privileged account needed for your task
- ✅ Don't share credentials
- ✅ Contact your administrator if you need different permissions
- ❌ Don't try to bypass the UI - MonkDB will block unauthorized operations anyway

---

## FAQ

**Q: Can I change my role after connecting?**
A: No. Disconnect and reconnect with a different user that has the desired permissions.

**Q: Why do I see a permission badge?**
A: To remind you of your current access level and prevent confusion about what you can/cannot do.

**Q: What happens if I try an unauthorized action?**
A: The UI hides the button. If you somehow bypass the UI (e.g., via Query Editor), MonkDB will return a permission denied error.

**Q: Can I have multiple connections with different roles?**
A: Yes! Create separate connections for different users. Switch between them using the Connections page.

---

Last updated: 2026-02-07
