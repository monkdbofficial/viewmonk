# MonkDB: `DROP ROLE` Statement

The `DROP ROLE` statement in MonkDB is used to remove an existing database user or role from the cluster.

## SQL Statement

```sql
DROP ROLE [ IF EXISTS ] name;
```

## Description

The `DROP ROLE` statement deletes a specified role or user from the MonkDB cluster. It is part of MonkDB's user and role management system, which allows administrators to manage access and permissions effectively

Key Features

- **IF EXISTS**: Prevents errors if the specified role does not exist. Instead, it issues a notice.
- **name**: Represents the unique identifier of the role or user to be removed. This follows SQL identifier principles

## Important Considerations

- **Role Dependencies**: A role cannot be dropped if it has been granted to other roles or users. You must revoke these grants first.
- **Ownership of Objects**: If the role owns database objects (e.g., schemas), those objects must either be reassigned to another role or dropped before removing the role.
- **Revoking Permissions**: Any privileges granted to the role must be revoked prior to using `DROP ROLE`.
- **Superuser Privileges**: To drop a superuser role, you must have superuser privileges. For non-superuser roles, the `CREATE ROLE` privilege is required

## Examples

If you want to drop a user/role in MonkDB:

```sql
DROP USER IF EXISTS role_name;
```

If you granted schema/table-level privileges earlier and want to revoke them.

```sql
REVOKE DQL, DML ON SCHEMA monkdb.{table_name} FROM role_name;
```

Then drop the user.

---

## See Also

- [Create role](./31_CREATE_ROLE.md)