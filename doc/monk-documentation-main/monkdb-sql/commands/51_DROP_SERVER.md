# MonkDB: `DROP SERVER` Statement

`DROP SERVER` is a DDL statement used in MonkDB to remove one or more foreign servers. Dropping a server requires AL (Admin Level) permission on the cluster level.

## SQL Statement

```sql
DROP SERVER [ IF EXISTS ] name [, ...] [ CASCADE | RESTRICT ]
```

## Parameters
- **name**: The name of the server to drop. Multiple server names can be specified by separating them with commas.

## Clauses

### IF EXISTS

By default, `DROP SERVER` raises an error if the specified server does not exist. Using the `IF EXISTS` clause prevents this error and instead issues a notice if the server does not exist.

### CASCADE | RESTRICT
- **RESTRICT**: This is the default behavior. It causes `DROP SERVER` to raise an error if any foreign tables or user mappings depend on the server being dropped.
- **CASCADE**: Drops the server and automatically deletes all dependent foreign tables and user mappings.

## Example

To drop a server named my_server if it exists, without raising an error if it does not exist, and also delete any dependent objects:

```sql
DROP SERVER IF EXISTS my_server CASCADE;
```

This command will drop `my_server` and remove any foreign tables or user mappings that depend on it, provided you have the necessary permissions.

---

## See Also

- [Create Server](./32_CREATE_SERVER.md)


