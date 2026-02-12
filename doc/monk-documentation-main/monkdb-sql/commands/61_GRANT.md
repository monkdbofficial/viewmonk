# MonkDB: `GRANT` Statement

The `GRANT` statement is a powerful SQL command used across various database systems to assign privileges or roles to users or roles.

## SQL Statement

```sql
GRANT { { DQL | DML | DDL | AL [,...] } | ALL [ PRIVILEGES ] }
[ON {SCHEMA | TABLE | VIEW} identifier [, ...]]
TO name [, ...]
```

```sql
GRANT role_name_to_grant [, ...] TO name [, ...]
```

## Description

In MonkDB, the `GRANT` statement serves two main purposes:

- **Granting Privileges**: Assign one or more privileges (e.g., `DQL`, `DML`, `DDL`) on the cluster level or specific objects (schemas, tables, views) to users or roles.
- **Granting Roles**: Assign roles to users or other roles, allowing inheritance of privileges.

## Key Parameters

- **Privileges**: Includes operations like Data Query Language (DQL), Data Manipulation Language (DML), Data Definition Language (DDL), etc.
- **Object Scope**: The ON clause specifies the target object (e.g., schema, table, view). If omitted, privileges are granted at the cluster level.
- **Roles**: Allows granting one or more roles to users or other roles for privilege inheritance.

## Examples

Granting DQL privileges on a table:

```sql
GRANT DQL ON TABLE monkdb.my_table TO user1;
```

Granting a role to another user. 

However, please note that a role must have been created using `CREATE ROLE` prior to execution of the below example.

```sql
GRANT admin_role TO user2;
```

## Key Features:

- Supports granular privilege levels.
- Requires the `GRANT OPTION` privilege for granting permissions.

---

## See Also

- [Create a role](./31_CREATE_ROLE.md)
- [Revoke](./67_REVOKE.md)

