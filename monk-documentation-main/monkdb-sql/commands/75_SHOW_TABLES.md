# MonkDB: `SHOW TABLES` Statements

The `SHOW TABLES` command in MonkDB lists all base tables within a specific schema (or across schemas, depending on how it’s used). It is useful for:

- Discovering what tables exist
- Filtering tables by pattern
- Automating database documentation or schema introspection

## SQL Statement

```sql
SHOW TABLES [{FROM | IN} table_schema] [LIKE 'pattern' | WHERE expression];
```

## Description

- By default, it lists user-defined tables in the `monkdb` schema.
- Results are sorted alphabetically.
- You can narrow down results using a schema name or filter with `LIKE` or `WHERE`.
- `System` and `BLOB` tables are only shown if explicitly specified via `FROM` or `IN` clause.

## Examples
### Example 1. Show tables from the default schema (doc)

```sql
SHOW TABLES;
```

Returns all user-defined tables in doc schema.

### Example 2. Show tables from a specific schema

```sql
SHOW TABLES FROM information_schema;

-- or
SHOW TABLES IN sys;
```

This is how you view system-level metadata or internal tables.

### Example 3. Use LIKE to filter table names

```sql
SHOW TABLES LIKE 'sensor%';
```

This will return tables that start with "sensor" (case-insensitive match).

### Example 4. Use WHERE clause for advanced filtering

```sql
SHOW TABLES WHERE table_name != 'logs';
```
Filter using SQL expressions. Supports conditions like:

`WHERE table_name ~* 'regex'`

## Use Cases
- **Schema Exploration**: Quickly see which tables exist and how they’re named.
- **Automation Scripts**: Use in CI/CD pipelines or migration tools.
- **Monitoring Tools**: Integrate with dashboards or alerting to watch for unexpected table creation/deletion.
- **Multitenant Apps**: Dynamically query tables across schemas to separate customer data.

## Notes

| **Feature**           | **Details**                                                                                 |
|------------------------|---------------------------------------------------------------------------------------------|
| Default Schema         | If schema is not specified, doc is assumed                                                 |
| System Tables          | Shown only when explicitly queried using `FROM pg_catalog or sys`                            |
| BLOB Tables            | Same as system tables — must be queried explicitly                                          |
| Sorting                | Alphabetical by default                                                                    |
| Case Sensitivity       | Filters (`LIKE`/`WHERE`) are case-insensitive unless quoted                                    |

---

## See Also

- [Show Schemas](./74_SHOW_SCHEMAS.md)
- [Create Table](./35_CREATE_TABLE.md)