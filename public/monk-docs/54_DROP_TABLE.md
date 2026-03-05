# MonkDB: `ALTER CLUSTER` Statement

## SQL Statement

```sql
DROP [BLOB] TABLE [IF EXISTS] table_ident
```

## Description

The `DROP TABLE` statement in MonkDB is used to remove tables from the cluster. This command can be applied to both regular tables and blob tables. If you want to remove a blob table, you must specify the `BLOB` keyword.

- **BLOB Keyword**: This is used specifically for removing blob tables. Blob tables are used for storing large binary data.
- **IF EXISTS Clause**: This optional clause prevents the statement from failing if the specified table does not exist. It is useful in scripts where you might not know if a table has already been created or dropped.

## Parameters
- **table_ident**: This is the name of the table you want to drop. The name can be optionally schema-qualified, meaning you can specify the schema name along with the table name (e.g., monkdb.my_table).

## Important Considerations
- **Data Loss**: Dropping a table results in the permanent loss of all data stored in that table.
- **Schema**: If a table is created without specifying a schema, it defaults to the doc schema in MonkDB.
- **Permissions**: You need appropriate permissions to drop a table, typically requiring access to the schema or cluster level.

## Examples

To drop a table named `my_table` without checking if it exists

```sql
DROP TABLE my_table;
```

To drop a blob table named `my_blob_table`

```sql
DROP BLOB TABLE my_blob_table;
```

To drop a table named my_table using the `IF EXISTS` clause

```sql
DROP TABLE IF EXISTS my_table;
```

---

## See Also

- [Create Table](./35_CREATE_TABLE.md)
- [Alter Table](./17_ALTER_TABLE.md)



