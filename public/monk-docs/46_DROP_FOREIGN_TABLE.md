# MonkDB: `DROP FOREIGN TABLE` Statement

The `DROP FOREIGN TABLE` statement is a **DDL (Data Definition Language)** command used to remove a foreign table from a database. Here's an expanded overview of its syntax, description, parameters, and clauses, focusing on MonkDB and other relevant systems.

## SQL Statement

```sql
DROP FOREIGN TABLE [ IF EXISTS ] name [, ...]
```

## Description

`DROP FOREIGN TABLE` is used to delete a foreign table, which is a table that represents data from an external database accessed through a foreign data wrapper. Dropping a foreign table does not affect the actual data in the external database; it only removes the local reference to that data.

### Parameters

- **name**: The `name` of the foreign table to be dropped. Multiple tables can be specified by separating them with commas.

## Clauses

### IF EXISTS

By default, `DROP FOREIGN TABLE` raises an error if the specified table does not exist. The `IF EXISTS` clause prevents this error and instead issues a notice if the table does not exist.

## Permissions

In MonkDB, dropping a foreign table requires `AL` (Admin Level) permission on the table, schema, or cluster level. In other systems like PostgreSQL and Greenplum, only the owner of the foreign table can remove it.

## Examples

### Example 1. Dropping a Single Foreign Table

```sql
DROP FOREIGN TABLE my_foreign_table;
```

### Example 2. Dropping Multiple Foreign Tables

```sql
DROP FOREIGN TABLE my_foreign_table1, my_foreign_table2;
```

### Example 3. Using IF EXISTS to Avoid Errors

```sql
DROP FOREIGN TABLE IF EXISTS my_foreign_table;
```

---

## See Also

- [Create a foreign table](./27_CREATE_FOREIGN_TABLE.md)