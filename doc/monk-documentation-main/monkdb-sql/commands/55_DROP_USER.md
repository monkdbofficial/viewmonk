# MonkDB: `DROP USER` Statement

## SQL Statement

```sql
DROP USER [ IF EXISTS ] username;
```

## Description

The `DROP USER` statement in MonkDB is used to remove an existing database user or role. Its syntax and functionality are identical to the `DROP ROLE` statement in MonkDB.

## Parameters
- **IF EXISTS**: This clause prevents the statement from failing if the specified user does not exist. Instead, it returns a warning for each non-existent user.
- **username**: The unique name of the database user or role to be removed. The name must follow SQL identifier principles.

## Usage Notes
- **Role Dependencies**: If a role is granted to other roles or users, it cannot be dropped until these grants are revoked.
- **Permissions**: The user executing this command must have appropriate permissions to manage users or roles in the database.
- **Effect on Sessions**: Dropping a user does not automatically close any open sessions. The user is effectively dropped after their session is closed.

## Examples

To drop a user named `exampleuser`, you would use:

```sql
DROP USER exampleuser;
```

If you want to avoid errors when dropping a user that might not exist, use the `IF EXISTS` clause:

```sql
DROP USER IF EXISTS exampleuser;
```

## Additional Considerations
- **Security Context**: Dropping a user does not automatically invalidate or drop databases or objects created by that user. You may need to manually manage these resources after dropping the user.
- **Scripting**: The `IF EXISTS` clause is particularly useful in scripts to prevent errors when attempting to drop non-existent users.


---

## See Also

- [Drop Role](./50_DROP_ROLE.md)
- [Create User](./37_CREATE_USER.md)
- [Alter User](./18_ALTER_USER.md)





