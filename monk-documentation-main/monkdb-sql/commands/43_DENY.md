# MonkDB: `DENY` Statement

In MonkDB, the `DENY` statement is used to restrict privileges for existing users on specific objects or the entire cluster. It serves as a management tool to enforce access control and security policies.

## SQL Statement

```sql
DENY { { DQL | DML | DDL | AL [,...] } | ALL [ PRIVILEGES ] }
[ON {SCHEMA | TABLE} identifier [, ...]]
TO user_name [, ...];
```

## Description

The `DENY` statement explicitly denies one or more privileges to a user. If applied without specifying an object (e.g., schema or table), the denial affects privileges at the cluster level.

The `DENY` statement overrides any previously granted privileges, ensuring that users cannot perform restricted actions even if they inherit permissions through roles or other grants.

The specification of `{SCHEMA | TABLE}` is optional; if it is not provided, the privilege will be restricted at the `CLUSTER` level.

## Parameters

- **identifier**: This refers to the unique identifier of the related object. 
    + When `TABLE` is specified, the identifier must contain the fully qualified name of the table. If not, the system will search for the table within the current schema.
- **user_name**: The name of a user that already exists.

## Examples

### Example 1: Denying DQL Privilege on a Specific Table

This statement denies the DQL (Data Query Language) privilege for the user riley on the table `monkdb.accounting`.

```sql
DENY DQL ON TABLE monkdb.accounting TO riley;
```

The user `riley` cannot query the `monkdb.accounting` table, but retains DQL privileges on other tables in the schema.

### Example 2: Denying DQL Privilege on a Schema

This statement denies the DQL privilege for the user wolfgang on the schema `sys`.

```sql
DENY DQL ON SCHEMA sys TO wolfgang;
```

The user wolfgang is restricted from querying any tables within the `sys` schema

### Example 3: Denying All Privileges at Cluster Level

This statement denies `all` privileges for the user will across the cluster.

```sql
DENY ALL TO will;
```

The user `will` is restricted from performing any actions across the cluster

### Example 4: Denying Privileges with Role Inheritance

In this example, a user inherits privileges through roles, but an explicit denial overrides them.

```sql
GRANT DQL ON TABLE sys.users TO role_a;
GRANT role_a TO john;
DENY DQL ON TABLE sys.users TO john;
```

Although `role_a` grants DQL privileges to query `sys.users`, the explicit denial prevents the user `john` from querying it.