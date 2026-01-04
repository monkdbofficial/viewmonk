# MonkDB: `SET AND RESET SESSION AUTHORIZATION` Statements

The `SET SESSION AUTHORIZATION` and `RESET SESSION AUTHORIZATION` commands allow changing or resetting the session user in MonkDB. These commands are particularly useful for superusers who need to temporarily assume the privileges of another user or revert back to their original authenticated user context.

## SQL Statement

```sql
SET [ SESSION | LOCAL ] SESSION AUTHORIZATION username
SET [ SESSION | LOCAL ] SESSION AUTHORIZATION DEFAULT
RESET SESSION AUTHORIZATION
```

## Description
### Changing Session User

The `SET SESSION AUTHORIZATION` command sets the session user to a specified username. This is only possible if the original authenticated user has superuser privileges. If the authenticated user does not have superuser privileges, the command is restricted to setting the session user to the same username as the authenticated user.

### Temporary Privilege Adjustment

Superusers can use this command to temporarily drop their privileges by switching to an unprivileged user. For example:

```sql
SET SESSION AUTHORIZATION '<impersonating_user>';
```

This allows the superuser to act as another user with limited privileges. To restore their original privileges, they can use:

```sql
SET SESSION AUTHORIZATION DEFAULT;
```

or

```sql
RESET SESSION AUTHORIZATION;
```

### Resetting Session User
The DEFAULT and RESET forms restore the session user to the originally authenticated user.

### `SET LOCAL` Behavior
The `SET LOCAL` modifier does not affect session-level changes in MonkDB. Any `SET LOCAL` statements are ignored and logged at the `INFO` level.

## Parameters

- `username`
    - Specifies the new session user as an identifier or string literal.
    - Example:
    ```sql
    SET SESSION AUTHORIZATION 'john';
    ```
- `DEFAULT`
    - Resets the session user back to the initial authenticated user.
    - Example:
    ```sql
    SET SESSION AUTHORIZATION DEFAULT;
    ```

## Key Points

- **Superuser Requirement**- Only superusers can change the session user to a different username. Non-superusers are limited to setting the session user to their own authenticated username.
- **Permission Checks**- Changing the session user impacts permission checks for subsequent SQL commands, which are performed based on the privileges of the current session user.
- `RESET` vs `DEFAULT`- Both forms (`RESET SESSION AUTHORIZATION` and `SET SESSION AUTHORIZATION DEFAULT`) achieve the same result: reverting back to the original authenticated user.
- **Ignored Statements**- Any usage of `SET LOCAL` has no effect on sessions in MonkDB and is logged for informational purposes.

## Examples

Switching Session User

```sql
SELECT SESSION_USER, CURRENT_USER;
-- Output: superuser | superuser

SET SESSION AUTHORIZATION 'john';
SELECT SESSION_USER, CURRENT_USER;
-- Output: john | john
```

Resetting Session User

```sql
RESET SESSION AUTHORIZATION;
SELECT SESSION_USER, CURRENT_USER;
-- Output: superuser | superuser
```

Using `DEFAULT`

```sql
SET SESSION AUTHORIZATION DEFAULT;
SELECT SESSION_USER, CURRENT_USER;
-- Output: superuser | superuser
```

This functionality is particularly useful for testing permissions or emulating specific users during database operations.
