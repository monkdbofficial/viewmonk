# Permission-Aware UI - Implementation Guide

> **Status:** ✅ **IMPLEMENTED** - See `PERMISSION_SYSTEM_IMPLEMENTED.md` for details
>
> This document serves as a reference guide for the implemented permission system.
> For user documentation, see `docs/features/USER_PERMISSIONS.md`

## Current State vs Desired State

### Current (Approach 1):
- ✅ All queries use active connection
- ✅ MonkDB enforces permissions
- ❌ UI shows all buttons to all users
- ❌ Users see errors when trying unauthorized actions
- ❌ Confusing UX

### Desired (Approach 2):
- ✅ All queries use active connection
- ✅ MonkDB enforces permissions
- ✅ UI hides unauthorized buttons
- ✅ Clear visual feedback about permissions
- ✅ Better UX

---

## How to Detect User Permissions

### Option 1: Query Database (Recommended)
```typescript
// Add to monkdb-context.tsx
const [userPermissions, setUserPermissions] = useState<{
  canRead: boolean;
  canWrite: boolean;
  canCreate: boolean;
  canDelete: boolean;
  isSuperuser: boolean;
}>({
  canRead: false,
  canWrite: false,
  canCreate: false,
  canDelete: false,
  isSuperuser: false,
});

// When connection becomes active, check permissions:
async function checkUserPermissions(username: string) {
  try {
    // Check if superuser
    const superuserCheck = await client.query(
      `SELECT usesuper FROM pg_user WHERE usename = $1`,
      [username]
    );
    const isSuperuser = superuserCheck.rows[0]?.[0] || false;

    // Check table privileges
    const privCheck = await client.query(`
      SELECT privilege_type
      FROM information_schema.table_privileges
      WHERE grantee = $1
      LIMIT 100
    `, [username]);

    const privileges = new Set(privCheck.rows.map(r => r[0]));

    setUserPermissions({
      canRead: privileges.has('SELECT'),
      canWrite: privileges.has('INSERT') || privileges.has('UPDATE'),
      canCreate: isSuperuser || privileges.has('CREATE'),
      canDelete: privileges.has('DELETE'),
      isSuperuser: isSuperuser,
    });
  } catch (error) {
    console.error('Failed to check permissions:', error);
  }
}
```

### Option 2: Store Role on Connection (Simpler)
```typescript
// When creating connection, save the role
interface Connection {
  id: string;
  name: string;
  config: {
    host: string;
    port: number;
    username: string;
    password: string;
    role?: 'read-only' | 'read-write' | 'superuser';  // ← Add this
  };
  // ... rest
}

// Then use it:
const { activeConnection } = useMonkDB();
const userRole = activeConnection?.config.role || 'read-only';

const canWrite = userRole === 'read-write' || userRole === 'superuser';
const canCreate = userRole === 'superuser';
```

---

## UI Components to Update

### 1. Table Designer Page
```typescript
// Current:
<button onClick={handleDelete}>Delete Table</button>

// Should be:
{canDelete && (
  <button onClick={handleDelete}>Delete Table</button>
)}

// Or disabled:
<button
  onClick={handleDelete}
  disabled={!canDelete}
  title={!canDelete ? "No permission to delete" : ""}
>
  Delete Table
</button>
```

### 2. Query Editor
```typescript
{!canWrite && (
  <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
    <p className="text-sm text-yellow-800">
      ⚠️ Read-Only Mode: You can view data but cannot modify it.
    </p>
  </div>
)}

<button
  onClick={executeQuery}
  disabled={isModifyQuery && !canWrite}
>
  Execute
</button>
```

### 3. Dashboard
```typescript
const stats = {
  tables: 10,
  rows: 1000,
  permissions: userRole, // Show user's role
};

<div className="permission-badge">
  {userRole === 'read-only' && (
    <span className="text-blue-600">👁️ Read-Only Access</span>
  )}
  {userRole === 'read-write' && (
    <span className="text-green-600">✏️ Read-Write Access</span>
  )}
  {userRole === 'superuser' && (
    <span className="text-purple-600">👑 Admin Access</span>
  )}
</div>
```

### 4. Schema View
```typescript
{isSuperuser && (
  <button onClick={createSchema}>Create Schema</button>
)}

{!isSuperuser && (
  <div className="text-gray-400 text-sm">
    Admin privileges required to create schemas
  </div>
)}
```

---

## Visual Indicators

### Permission Badge Component
```typescript
function PermissionBadge({ role }: { role: string }) {
  const badges = {
    'read-only': {
      icon: '👁️',
      text: 'Read-Only',
      color: 'blue',
      description: 'Can view data only'
    },
    'read-write': {
      icon: '✏️',
      text: 'Read-Write',
      color: 'green',
      description: 'Can view and modify data'
    },
    'superuser': {
      icon: '👑',
      text: 'Administrator',
      color: 'purple',
      description: 'Full database access'
    }
  };

  const badge = badges[role] || badges['read-only'];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-${badge.color}-100 text-${badge.color}-700`}>
      <span>{badge.icon}</span>
      <span className="font-semibold text-sm">{badge.text}</span>
      <span className="text-xs">• {badge.description}</span>
    </div>
  );
}
```

### Page Header with Permission
```typescript
function PageHeader({ title, userRole }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <PermissionBadge role={userRole} />
    </div>
  );
}
```

---

## Smart Feature Display

### Create a Hook
```typescript
// hooks/usePermissions.ts
export function usePermissions() {
  const { activeConnection } = useMonkDB();
  const role = activeConnection?.config.role || 'read-only';

  return {
    canRead: true, // Everyone can read
    canWrite: role !== 'read-only',
    canDelete: role !== 'read-only',
    canCreate: role === 'superuser',
    canManageUsers: role === 'superuser',
    canAlterSchema: role === 'superuser',
    role,
  };
}

// Usage in components:
function TableActions() {
  const { canWrite, canDelete, canCreate } = usePermissions();

  return (
    <>
      <button>View</button>  {/* Always shown */}
      {canWrite && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
      {canCreate && <button>Create Table</button>}
    </>
  );
}
```

---

## Error Messages

### Better Error Handling
```typescript
try {
  await client.query('DELETE FROM users WHERE id = 1');
} catch (error) {
  if (error.message.includes('Permission denied')) {
    showError(
      'Permission Denied',
      'You need write privileges to delete data. Current role: Read-Only',
      'Contact your administrator to upgrade your permissions.'
    );
  } else {
    showError('Error', error.message);
  }
}
```

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Add role field to Connection interface
- [ ] Save role when creating user
- [ ] Create usePermissions() hook
- [ ] Add PermissionBadge component

### Phase 2: Update Pages
- [ ] Dashboard: Show permission badge
- [ ] Table Designer: Hide/disable create/delete for non-admin
- [ ] Query Editor: Show read-only warning
- [ ] Schema View: Hide admin features
- [ ] Time Series: Respect write permissions
- [ ] Geospatial: Respect write permissions

### Phase 3: Polish
- [ ] Improve error messages for permission denials
- [ ] Add tooltips explaining why buttons are disabled
- [ ] Add permission help page
- [ ] Add visual distinction between read-only and write modes

---

## Example: Complete Page Update

```typescript
// Before:
function TableDesigner() {
  return (
    <div>
      <button onClick={createTable}>Create Table</button>
      <button onClick={deleteTable}>Delete Table</button>
      <button onClick={modifyTable}>Modify Table</button>
    </div>
  );
}

// After:
function TableDesigner() {
  const { canCreate, canDelete, canWrite, role } = usePermissions();

  return (
    <div>
      {/* Permission Badge */}
      <PermissionBadge role={role} />

      {/* Conditional Buttons */}
      {canCreate && (
        <button onClick={createTable}>Create Table</button>
      )}

      {canDelete ? (
        <button onClick={deleteTable}>Delete Table</button>
      ) : (
        <button disabled title="Admin privileges required">
          Delete Table 🔒
        </button>
      )}

      {canWrite && (
        <button onClick={modifyTable}>Modify Table</button>
      )}

      {/* Read-Only Warning */}
      {!canWrite && (
        <div className="alert alert-warning">
          ⚠️ You are in read-only mode. Contact admin for write access.
        </div>
      )}
    </div>
  );
}
```

---

## Benefits

✅ **Better UX**: Users don't see features they can't use
✅ **Clear Feedback**: Visual badges show current permissions
✅ **Fewer Errors**: Users can't click disabled buttons
✅ **Security**: UI + Database both enforce permissions
✅ **Transparency**: Users understand their access level

---

## Next Steps

1. Choose Option 1 (query DB) or Option 2 (store role)
2. Implement usePermissions() hook
3. Update each page one by one
4. Test with different user roles
5. Add visual indicators

**Estimated Time:** 3-4 hours to implement across all pages
