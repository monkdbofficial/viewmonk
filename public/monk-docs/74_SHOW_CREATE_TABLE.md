# MonkDB: `SHOW CREATE TABLE` Statements

The `SHOW CREATE TABLE` statement in MonkDB is a useful SQL command that returns the SQL definition used to create an existing table, including its columns, data types, primary key constraints, partitioning, clustering, generated columns, and other table settings.

This command is extremely helpful when:

- You want to inspect the schema of an existing table.
- You're reverse engineering a table's definition for backup, documentation, or recreation in another environment.
- You're debugging schema-related issues or reviewing how certain table-level options were configured.

> It gives you the `CREATE TABLE` or `CREATE FOREIGN TABLE` statement that you would use to recreate the same table structure.

## SQL Statement

```sql
SHOW CREATE TABLE <schema_name>.<table_name>;
```

Or if you're working in the default `monkdb` schema:

```sql
SHOW CREATE TABLE <table_name>;
```

> **PS**: MonkDB contains only one schema- `monkdb`, and the tables, etc are created under it.

Where `table_name` is the name of the table (optionally schema-qualified) whose schema needs to be displayed.

## Key Features
- **Schema Retrieval**: Displays the complete schema of a table, including column definitions, indexes, constraints, and other properties.

## Things to Note

- **Only shows current schema**: If a table was altered after creation, the output reflects the latest state.
- **Doesn’t show data**: This is purely about schema, not the contents.
- No `IF NOT EXISTS` or `CREATE OR REPLACE`: The generated SQL is suitable for fresh creation, not necessarily for schema diff-based migrations.

## Use Cases

- **Migration & Portability**: You can copy the output and use it to recreate the table in another MonkDB cluster.
- **Versioning Schema**: Useful for maintaining schema versions in version control systems.
- **Auditing**: When managing large MonkDB deployments, quickly reviewing table definitions across databases can help spot inconsistencies or misconfigurations.

## Example

If you have a table called `sensor_data` in `monkdb` schema, and you run:

```sql
SHOW CREATE TABLE sensor_data;
```

You might get something like:

```sql
CREATE TABLE "doc"."sensor_data" (
   "id" TEXT,
   "temperature" DOUBLE PRECISION,
   "timestamp" TIMESTAMP WITH TIME ZONE,
   PRIMARY KEY ("id", "timestamp")
)
CLUSTERED INTO 4 SHARDS
PARTITIONED BY ("timestamp")
WITH ("number_of_replicas" = '1');
```

This tells you:
- Table columns and types
- Composite primary key (id, timestamp)
- It’s clustered into 4 shards
- Partitioned by the timestamp column
- Replication is set to 1 replica

---

## See Also

- [Create Table](./35_CREATE_TABLE.md)
- [Create Foreign Table](./27_CREATE_FOREIGN_TABLE.md)