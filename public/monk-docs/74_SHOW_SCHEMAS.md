# MonkDB: `SHOW SCHEMAS` Statements

The `SHOW SCHEMAS` command in MonkDB is used to list all the schemas (namespaces) defined within the current MonkDB cluster.

In MonkDB, schemas help organize tables, views, and other database objects logically. This is particularly useful in multi-tenant applications or for structuring large databases.

## SQL Statement

```sql
SHOW SCHEMAS [LIKE 'pattern' | WHERE expression];
```

## Description

- Returns a list of schema names, sorted alphabetically.
- Includes default schemas like `monkdb`, `information_schema`, `pg_catalog`, etc.
- You can filter results using `LIKE` or `WHERE`.

## Examples
### Example 1. Show all schemas

```sql
SHOW SCHEMAS;
```

Typical output

```text
monkdb
information_schema
pg_catalog
sys
```

### Example 2. Filter schemas using `LIKE`

```sql
SHOW SCHEMAS LIKE 'monk%';
```

This matches all schema names starting with `monk` (case-insensitive).

### Example 3. Use `WHERE` for complex conditions

```sql
SHOW SCHEMAS WHERE schema_name != 'pg_catalog';
```

## Default Schemas in MonkDB

This uses a boolean condition to filter results. You can use any SQL-compatible [expression](../11_monkdb_value_expressions.md).

| Schema Name          | Purpose                                                        |
|----------------------|----------------------------------------------------------------|
| `monkdb`                | Default schema for user-created tables                        |
| `information_schema` | Metadata about tables, columns, schemas, etc. (read-only)     |
| `pg_catalog`         | PostgreSQL compatibility layer (for clients/tools that expect PG) |
| `sys`                | MonkDB-specific system information (cluster, nodes, tables, etc.) |


## Use Cases

- **Multi-tenancy**: You might create separate schemas per tenant or application domain.
- **Metadata introspection**: Combine with other metadata queries to build a full database map.
- **DevOps/Automation**: Use in tooling/scripts to dynamically fetch and work with schemas.

## 🆚 vs SHOW TABLES

- `SHOW SCHEMAS` → Lists namespaces (organizational level)
- `SHOW TABLES` → Lists tables within a specific schema (typically monkdb)

---

## See Also

- [Show Tables](./75_SHOW_TABLES.md)
