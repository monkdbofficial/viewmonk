# MonkDB: `DEALLOCATE` Statement

## SQL Statement

```sql
DEALLOCATE [PREPARE] { name | ALL }
```

## Description
The `DEALLOCATE` command serves to release resources linked to a previously prepared SQL statement. While prepared statements are automatically deallocated at the conclusion of a session, this command provides a means for explicit deallocation. It is frequently utilized by clients, such as `libpq`, as an alternative to the protocol's `Close (F)` message.

### Key Points:
- **Automatic Deallocation**: Prepared statements are automatically deallocated at the end of a session.
- **Explicit Deallocation**: Use the `DEALLOCATE` command to manually free resources associated with a specific prepared statement or all prepared statements.

## Parameters
- **name**: Specifies the identifier of the prepared statement that is to be deallocated.  
- **ALL**: Removes all prepared statements associated with the current session.

## Examples

### Example 1: Deallocate a Specific Prepared Statement

```sql
DEALLOCATE emp_info;
```

This command explicitly deallocates the prepared statement named `emp_info`.

### Example 2: Deallocate All Prepared Statements

```sql
DEALLOCATE ALL;
```

This command frees resources for all prepared statements in the current session.

### Verification
To confirm that a prepared statement has been deallocated:

```sql
SELECT name, statement FROM pg_prepared_statements;
```

After executing `DEALLOCATE`, the specified statement will no longer appear in this view.

## Notes
- The `PREPARE` keyword in the syntax is optional and ignored.
- The SQL standard includes a `DEALLOCATE` statement, but it is primarily used in embedded SQL contexts.


---

## See Also

- [Create a View](./39_CREATE_VIEW.md)