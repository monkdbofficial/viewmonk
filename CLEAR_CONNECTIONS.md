# Clear Existing Connections - Force Role Re-Detection

If you have existing connections with the old (broken) role detection, follow these steps:

## Option 1: Clear Browser Storage (Recommended)

1. Open the application in your browser
2. Open Developer Tools (F12 or Cmd+Option+I)
3. Go to **Console** tab
4. Run this command:

```javascript
localStorage.removeItem('monkdb_connections');
localStorage.removeItem('monkdb_active_connection');
location.reload();
```

5. Reconnect to your database
6. New role will be detected correctly

---

## Option 2: Re-create Connections

1. Go to **Connections** page
2. Delete existing connections
3. Create new connections
4. Role will be auto-detected correctly

---

## Option 3: Force Superuser Role (Quick Fix)

Open Developer Tools Console and run:

```javascript
// Get existing connections
const stored = localStorage.getItem('monkdb_connections');
const connections = JSON.parse(stored || '[]');

// Upgrade all to superuser
const upgraded = connections.map(conn => ({
  ...conn,
  config: {
    ...conn.config,
    role: 'superuser'
  }
}));

// Save back
localStorage.setItem('monkdb_connections', JSON.stringify(upgraded));
console.log('Upgraded', upgraded.length, 'connections to superuser');
location.reload();
```

---

## Verify It Worked

After clearing/upgrading, check the console for:

```
[MonkDBContext] Restoring connection: localhost:4200 (monkdb) with role: superuser
```

You should see `role: superuser` (not `role: read-only`)

---

## For Fresh Start

If you want to completely reset:

```javascript
localStorage.clear();
location.reload();
```

Then reconnect from scratch.

---

Last updated: 2026-02-07
