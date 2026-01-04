# MonkDB: `RESTORE SNAPSHOT` Statement

The `RESTORE SNAPSHOT` command in MonkDB is used to restore data, metadata, or specific tables and partitions from a snapshot into the cluster.

## SQL Statement

```sql
RESTORE SNAPSHOT repository_name.snapshot_name
{ ALL |
  METADATA |
  TABLE table_ident [ PARTITION (partition_column = value [, ...])] [, ...] |
  data_section [, ...] }
[ WITH (restore_parameter [= value], [, ...]) ]
```

## Data Section Options
- `TABLES`: Restore all tables without metadata.
- `VIEWS`: Restore views.
- `USERMANAGEMENT`: Restore users, roles, and privileges.
- `ANALYZERS`: Restore custom analyzers.
- `UDFS`: Restore user-defined functions.

## Description

The `RESTORE SNAPSHOT` command allows recovery of data or metadata stored in a snapshot. Snapshots are identified by their repository name and snapshot name. The command supports restoring:

- **All Data and Metadata**: Use the `ALL` keyword to restore everything.
- **Metadata Only**: Use the `METADATA` keyword for *cluster settings*, *views*, *roles*, *privileges*, *analyzers*, and *UDFs*.
- **Specific Tables or Partitions**: Specify tables using `TABLE` and optionally restore specific partitions with the `PARTITION` clause.
- **Multiple Sections**: Combine multiple `data_section` keywords to restore selected parts of the snapshot.

## Parameters

- `repository_name`: Name of the repository containing the snapshot.
- `snapshot_name`: Name of the snapshot to restore.
- `table_ident`: Name of the table (optionally schema-qualified) to restore.
- `data_section`: Specifies what part of the snapshot to restore (e.g., `TABLES`, `VIEWS`).

## Clauses
### PARTITION

Used for restoring specific partitions of a partitioned table. Syntax:

```sql
PARTITION (partition_column = value [, ...])
```
All partition columns must be listed in the order defined by the `PARTITIONED BY` clause. For example,

```sql
RESTORE SNAPSHOT my_repo.my_snapshot
TABLE my_table PARTITION (year = 2025, month = 4);
```
### WITH

Customizes the restore operation with optional parameters:

- ignore_unavailable:
    - Default: false.
    - Ignores missing tables during restoration when set to true.

- wait_for_completion:
    - Default: false.
    - Waits for the operation to complete before returning a response.

- schema_rename_pattern / schema_rename_replacement:
    - Renames schemas during restoration using regex patterns. For example,

    ```sql
    WITH (schema_rename_pattern = '(.+)', schema_rename_replacement = 'new_$1')
    ```

- table_rename_pattern / table_rename_replacement:
    - Renames tables during restoration using regex patterns. For example,

    ```sql
    WITH (table_rename_pattern = '(.+)', table_rename_replacement = 'backup_$1')
    ```

## Caution
- Restoring a table that already exists will result in an error.
- Metadata or cluster settings that already exist will be overwritten.
- Name collisions after applying rename operations will cause restoration failure.

## Examples
Restore All Data and Metadata

```sql
RESTORE SNAPSHOT my_repo.my_snapshot ALL;
```

Restore Specific Table

```sql
RESTORE SNAPSHOT my_repo.my_snapshot TABLE my_table;
```

Restore Metadata Only

```sql
RESTORE SNAPSHOT my_repo.my_snapshot METADATA;
```

Restore Partitioned Table

```sql
RESTORE SNAPSHOT my_repo.my_snapshot TABLE my_partitioned_table PARTITION (year = 2025);
```

Rename Tables During Restoration

```sql
RESTORE SNAPSHOT my_repo.my_snapshot TABLES 
WITH (table_rename_pattern = '(.+)', table_rename_replacement = 'restored_$1');
```

This command is versatile for recovering data efficiently while allowing customization for schema/table renaming and selective restoration of metadata or partitions.
