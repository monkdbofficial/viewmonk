# MonkDB: `CREATE SNAPSHOT` Statement

The `CREATE SNAPSHOT` statement creates a new incremental snapshot inside a repository. This snapshot captures the current state of specified tables and/or partitions, along with the cluster metadata.

---

## SQL Statement

```sql
CREATE SNAPSHOT repository_name.snapshot_name
{ TABLE table_ident [ PARTITION (partition_column = value [, ...])] [, ...] | ALL }
[ WITH (snapshot_parameter [= value], [, ...]) ]
```

---

## Description

The `CREATE SNAPSHOT` statement creates a point-in-time backup of your data. Snapshots are incremental, meaning they only store data that has changed since the last snapshot, optimizing storage usage and snapshot creation time.

### Key Features:
- **Incremental Backups:** Snapshots only store changes since the last snapshot.
- **Table or Partition Specificity:** You can snapshot individual tables, specific partitions of partitioned tables, or all tables in the cluster.
- **Metadata Inclusion:** Snapshots include table schemas, settings, and cluster metadata.
- **Non-Blocking:** By default, the statement returns once the snapshot process starts, allowing you to continue working.

### Limitations:
- **System Tables:** System tables, blob tables, and tables within the `information_schema` schema are excluded when using `ALL`.
- **In-Progress Relocations:** Snapshots are created on primary shards that are not currently being relocated.
- **Data Consistency:** Changes made to data *after* the snapshot process begins will not be included in the snapshot.

---

## Parameters

| Parameter        | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| **repository_name** | The name of the repository where the snapshot will be stored.             |
| **snapshot_name**   | The name of the snapshot. Must be unique within the repository.           |
| **table_ident**     | The name of a table to include in the snapshot (optionally schema-qualified). |

---

## Clauses

### **PARTITION**

If the table is partitioned, the optional `PARTITION` clause can be used to create a snapshot from a specific partition.

```sql
[ PARTITION ( partition_column = value [ , ... ] ) ]
```


#### Parameters:
- **partition_column**: One of the column names used for table partitioning
- **value**: The respective column value.

All partition columns (specified by the `PARTITIONED BY` clause) must be listed inside the parentheses along with their respective values using the `partition_column = value` syntax (separated by commas).

### **WITH**

You can use the optional `WITH` clause to specify snapshot parameter values.

```sql
[ WITH (snapshot_parameter [= value], [, ...]) ]
```


#### Parameters:
- **wait_for_completion**:
  - *Type:* boolean
  - *Default:* `false`
  - If `true`, the request returns after the entire snapshot has been created or an error occurs. If `false`, the request returns immediately, and you can monitor the snapshot progress using `sys.snapshots`.
- **ignore_unavailable**:
  - *Type:* boolean
  - *Default:* `false`
  - If `true`, missing tables will be ignored, and the snapshot creation will continue. If `false`, the command will fail if any specified table does not exist.

---

## Examples

### Example 1: Snapshotting a Single Table
Create a snapshot named `users_backup` of the `users` table in the `my_repo` repository:

```sql
CREATE SNAPSHOT my_repo.users_backup
TABLE users;
```

### Example 2: Snapshotting a Partitioned Table
Create a snapshot of a specific partition from a partitioned table:

```sql
CREATE SNAPSHOT my_repo.sales_q1_2024
TABLE sales
PARTITION (year = 2024, quarter = 'Q1');
```


### Example 3: Snapshotting All Tables
Create a snapshot of all tables in the cluster:

```sql
CREATE SNAPSHOT my_repo.full_backup
ALL;
```


### Example 4: Waiting for Completion
Create a snapshot and wait for it to complete before returning:

```sql
CREATE SNAPSHOT my_repo.full_backup_sync
ALL
WITH (wait_for_completion = true);
```


### Example 5: Ignoring Unavailable Tables
Create a snapshot that continues even if some tables are missing:

```sql
CREATE SNAPSHOT my_repo.partial_backup
TABLE users, non_existent_table
WITH (ignore_unavailable = true);
```


---

## Notes

1. **Snapshot Names:** Follow the same naming restrictions as for table names (valid filenames).
2. **Performance:** Snapshotting large tables can impact cluster performance. Consider scheduling snapshots during off-peak hours.
3. **Monitoring:** Use the `sys.snapshots` table to monitor the progress of snapshot creation.
4. **Repositories:** Ensure a repository exists before creating snapshots (see `CREATE REPOSITORY`).
5. **Permissions Required:** You need `AL` (Admin Level) privileges on the cluster to create snapshots.

---

## 🔐 Permissions

- **Creating Snapshots**:
  - Requires `AL` (Admin Level) privileges on the cluster.
- **Repository Access**:
  - The specified repository must already exist and be accessible by all nodes in the cluster.
- **Table Access**:
  - You do not need `DQL`/`DML` permissions on the tables being snapshotted, but you must have cluster-level privileges to execute the snapshot command.
- **Partition Access**:
  - If snapshotting partitions, ensure the table and all specified partition values are valid.

> 🔐 Security Tip: Use access controls to restrict snapshot creation to trusted operators, as it grants read-level access to full table contents.

---

## 🏁 Summary

| Feature                       | Supported / Required                                     |
|-------------------------------|----------------------------------------------------------|
| Incremental Snapshots         | ✅ Yes (only changed data since last snapshot is stored) |
| Snapshot Specific Tables      | ✅ Yes                                                   |
| Snapshot Specific Partitions  | ✅ Yes                                                   |
| Snapshot All Tables           | ✅ Yes (`ALL`)                                           |
| Wait for Completion           | ✅ Optional (`WITH (wait_for_completion = true)`)        |
| Ignore Missing Tables         | ✅ Optional (`ignore_unavailable = true`)                |
| Includes Schema + Metadata    | ✅ Yes                                                   |
| Snapshot System Tables        | ❌ No                                                    |
| Permissions Required          | ✅ `AL` (Admin Level)                                    |
| Monitoring via System Views   | ✅ `sys.snapshots`                                       |
| Repository Must Exist         | ✅ Yes (`CREATE REPOSITORY` required beforehand)         |

---

## See Also

- [Create Repository](./30_CREATE_REPOSITORY.md)
- [Drop Snapshot](./52_DROP_SNAPSHOT.md)

