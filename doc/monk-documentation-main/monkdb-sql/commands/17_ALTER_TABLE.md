# MonkDB: `ALTER TABLE` Statement

The `ALTER TABLE` statement in MonkDB is used to modify the structure and properties of existing tables. It provides a variety of options to add or remove columns, modify constraints, adjust table parameters, and manage partitions.

---

## SQL Statement

```sql
ALTER [ BLOB ] TABLE { ONLY table_ident
                     | table_ident [ PARTITION (partition_column = value [, ...]) ] }
  { SET ( parameter = value [, ...] )
    | RESET ( parameter [, ...] )
    | ADD [ COLUMN ] column_name data_type [ column_constraint [ ... ] ] [, ...]
    | DROP [ COLUMN ] [ IF EXISTS ] column_name [, ...]
    | RENAME [ COLUMN ] column_name TO new_name [, ...]
    | OPEN
    | CLOSE
    | RENAME TO new_table_ident
    | REROUTE reroute_option
    | DROP CONSTRAINT constraint_name
  }
```

---

## 🚀 Clauses and Options

### 1. `SET` and `RESET`
Modify or reset table parameters.

```sql
ALTER TABLE my_table SET (number_of_replicas = '2');
```

### 2. `ADD COLUMN`
Add new columns to a table.

```sql
ALTER TABLE my_table ADD COLUMN new_column TEXT;
```

### 3. `DROP COLUMN`
Remove existing columns.

```sql
ALTER TABLE my_table DROP COLUMN old_column;
```

### 4. `RENAME COLUMN`
Rename an existing column.

```sql
ALTER TABLE my_table RENAME COLUMN old_name TO new_name;
```

### 5. `OPEN` and `CLOSE`
Manage table availability.

```sql
ALTER TABLE my_table CLOSE;
```

### 6. `RENAME TO`
Rename the table.

```sql
ALTER TABLE my_table RENAME TO new_table_name;
```

### 7. `PARTITION`
Alter specific partitions of a partitioned table.

```sql
ALTER TABLE partitioned_table PARTITION (region = 'us') SET (number_of_replicas = '2');
```

---

## 📋 Notes

- **Blob Tables**: Cannot have custom columns; `ADD COLUMN` is not valid for BLOB tables.
- **Partitioned Tables**:
  - Use `ONLY` to apply changes only to the main table.
  - Schema changes apply to both new and existing partitions.
- **Constraints**:
  - Dropping columns used in keys, indices, or constraints is restricted.
- **Shard Management**:
  - Changing `number_of_shards` only affects future partitions.

---

## 🔐 Permissions

- Must be the **owner** of the table to execute `ALTER TABLE`.
- Some operations might require **superuser** privileges depending on context.

---

## 🏁 Summary

| Command                            | Description                               | Requires Ownership | Requires Superuser |
|------------------------------------|-------------------------------------------|--------------------|--------------------|
| `ALTER TABLE SET/RESET`            | Modify or reset table parameters          | Yes                | No                 |
| `ALTER TABLE ADD COLUMN`           | Add new columns                           | Yes                | No                 |
| `ALTER TABLE DROP COLUMN`          | Remove existing columns                   | Yes                | No                 |
| `ALTER TABLE RENAME COLUMN`        | Rename a column                           | Yes                | No                 |
| `ALTER TABLE OPEN/CLOSE`           | Change availability of the table          | Yes                | No                 |
| `ALTER TABLE RENAME TO`            | Rename the table                          | Yes                | No                 |
| `ALTER TABLE PARTITION ...`        | Modify properties of a specific partition | Yes                | No                 |

---

## 📚 See Also

- [CREATE TABLE](./35_CREATE_TABLE.md)
- [DROP TABLE](./54_DROP_TABLE.md)

---

Using `ALTER TABLE`, you can evolve table schemas, tune performance, and manage partitions in MonkDB with flexibility and precision.
