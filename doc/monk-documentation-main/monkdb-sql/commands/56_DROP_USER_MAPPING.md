# MonkDB: `DROP USER MAPPING` Statement

## SQL Statement

```sql
DROP USER MAPPING [ IF EXISTS ] FOR { user_name | USER | CURRENT_ROLE | CURRENT_USER } SERVER server_name
```

## Description
- **Purpose**: This DDL statement deletes an existing user mapping between a MonkDB user and a foreign server.
- **Permissions Required**: To execute this command, the user must have `AL` (Admin Level) permissions at the cluster level.

## Parameters

- **user_name**: Specifies the name of the MonkDB user whose mapping is being removed.
- **server_name**: Identifies the foreign server associated with the user mapping. The server must already exist, typically created using the `CREATE SERVER` statement.

## Clauses

### IF EXISTS:

- Prevents errors if the specified user mapping does not exist.
- Instead of throwing an error, it issues a notice indicating that no action was taken.

### USER:
- Refers to the current user executing the statement.
- Aliases include `CURRENT_USER` and `CURRENT_ROLE`, which match the name of the executing user.

## Examples

To drop a mapping for a specific user and server

```sql
DROP USER MAPPING FOR bob SERVER foo;
```

Using `IF EXISTS` to avoid errors if the mapping does not exist:

```sql
DROP USER MAPPING IF EXISTS FOR bob SERVER foo;
```

## Notes

- Dropping a user mapping is irreversible; once removed, the association between the MonkDB user and the foreign server is lost.
- Ensure proper permissions are granted before attempting this operation, as unauthorized users cannot execute this command.

---

## See Also

- [Create User Mapping](./38_CREATE_USER_MAPPING.md)
- [Create Server](./32_CREATE_SERVER.md)