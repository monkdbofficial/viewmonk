# MonkDB: `ALTER USER` Statement

The `ALTER USER` statement in MonkDB is used to modify attributes of an existing database user. This includes setting or resetting parameters such as passwords, JWT properties, and session settings. The `ALTER USER` statement functions identically to the `ALTER ROLE` statement.

---

## SQL Statement

```sql
ALTER USER username
    { SET ( parameter = value [, ...] )
    | RESET [parameter | ALL] }
```

## 🚀 Parameters

- `username`: The name of the user to be altered.​
- `SET`: Assigns new values to specified parameters for the user.​
- `RESET`: Restores specified parameters to their default values.

## 📚 See Also

- [ALTER ROLE](./15_ALTER_ROLE.md)
- [CREATE ROLE](./31_CREATE_ROLE.md)
- [DROP ROLE](./50_DROP_ROLE.md)