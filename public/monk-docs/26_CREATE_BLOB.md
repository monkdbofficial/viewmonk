# MonkDB: `CREATE BLOB TABLE` Statement

Creates a new table for storing Binary Large Objects (BLOBs) in monkdb.

---

## SQL Statement

```sql
CREATE BLOB TABLE table_name
[CLUSTERED INTO num_shards SHARDS]
[ WITH ( storage_parameter [= value] [, ... ] ) ]
```

---

## Description

The `CREATE BLOB TABLE` statement creates a dedicated table for storing unstructured binary data (BLOBs). These tables are automatically sharded based on the BLOB's digest (hash) for efficient distribution across nodes.

---

## Clauses

### **CLUSTERED**
Specifies the sharding configuration for the BLOB table:

```sql
CLUSTERED INTO num_shards SHARDS
```
- **num_shards**: 
  - *Type:* integer > 0  
  - Defines how many shards the BLOB table will be split into.  
  - BLOB tables are always sharded by their digest (hash value), not by user-defined columns.

### **WITH**
Configures storage parameters for the BLOB table:
```sql
WITH (
    blobs_path = 'path/to/directory',
    number_of_replicas = value
)
```
### Supported parameters:

| Parameter              | Type     | Default      | Description                                                                 |
|------------------------|----------|--------------|-----------------------------------------------------------------------------|
| **blobs_path**         | text     | Global config | Custom path for BLOB storage (absolute or relative to `MONKDB_HOME`).       |
| **number_of_replicas** | integer  | 1            | Number of replicas per shard. Set to `0` to disable replication.           |

---

## Key Parameters

### **blobs_path**
- Overrides the global BLOB storage path for this table
- Must be writable by the monkdb system user
- Example paths:
  - Absolute: `/mnt/monkdb_blobs/cust_table_data`
  - Relative: `custom_blobs` (resolves to `MONKDB_HOME/custom_blobs`)

---

## Examples

### Basic BLOB Table
Create a BLOB table with 3 shards and default settings:
```sql
CREATE BLOB TABLE my_images 
CLUSTERED INTO 3 SHARDS;
```

### Custom Storage Path
Create a BLOB table with dedicated storage location:
```sql
CREATE BLOB TABLE audit_logs 
CLUSTERED INTO 5 SHARDS 
WITH (
    blobs_path = '/var/lib/monkdb/secure_blobs',
    number_of_replicas = 0
);
```

---

## Additional Operations

### Modify Replica Count
```sql
ALTER BLOB TABLE my_images SET (number_of_replicas = 1);
```

### Delete BLOB Table
```sql
DROP BLOB TABLE my_images;
```

---

## 📋 Notes
1. **Shard Allocation**: BLOBs are automatically distributed based on their SHA-1 digest
2. **Access Control**: Use the `blob` schema prefix for queries (e.g., `SELECT * FROM blob.my_images`)
3. **Backup Limitation**: BLOB tables cannot be backed up via monkdb's snapshot/restore functionality
4. **Path Priority**: Table-specific `blobs_path` overrides global configuration
5. **Security**: Ensure filesystem permissions match monkdb's runtime user

## 🔐 Permissions

- **DDL Rights**: The user must have `CREATE` privileges in the database to define new `BLOB` tables.
- **Filesystem Access**: The MonkDB process must have write permissions on the directory specified in `blobs_path` (if used).
- **`DROP/ALTER` Access**: Only the creator or a superuser can alter or drop the `BLOB` table.

## 🏁 Summary

| Feature                          | Supported / Behavior                              |
|----------------------------------|--------------------------------------------------|
| Stores Binary Data               | ✅ Yes (BLOBs only)                              |
| Digest-Based Sharding            | ✅ Automatic using **SHA-1**                        |
| Custom Storage Path              | ✅ via `blobs_path`                                 |
| Replication                      | ✅ Configurable via `number_of_replicas`           |
| Column Definitions                | ❌ Not supported (binary content only)           |
| Accessible via blob schema       | ✅ Yes                                           |
| Included in Backups              | ❌ No                                            |
| Requires CREATE Privilege        | ✅ Yes                                           |
| Per-Table Storage Path Isolation  | ✅ Optional via `WITH (blobs_path = ...)`          |

