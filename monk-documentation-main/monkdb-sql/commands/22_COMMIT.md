# MonkDB: `COMMIT` Statement

The `COMMIT` statement in MonkDB is accepted for compatibility with PostgreSQL clients but does not perform any transactional operations, as MonkDB does not support transactions. Its primary function is to close all existing cursors within the current session.

---

## SQL Statement

```sql
COMMIT;
```

## 🚀 Description

- **Purpose**: In MonkDB, issuing a COMMIT command closes all existing cursors in the current session.​
- **Behavior**:
    + Since MonkDB operates with auto-commit behavior for each individual statement, the `COMMIT` command does not commit transactions but serves to close cursors.​

## ✅ Example

To close all cursors in the current session:​

```sql
COMMIT;
```

## 📋 Notes

- **Transaction Support**: MonkDB does not support traditional transactions. Commands like `BEGIN`, `COMMIT`, and `ROLLBACK` are accepted for compatibility purposes but do not alter database behavior. ​
- **Cursor Management**: Executing `COMMIT` will close all cursors within the current session. It's advisable to manage cursors appropriately to ensure efficient resource utilization.

## 🔐 Permissions

- **Execution Rights**: Any user with the ability to execute SQL statements can issue the `COMMIT` command. No special permissions are required.

## 🏁 Summary

| Command | Description                                     | Transaction Support | Cursor Management |
|---------|-------------------------------------------------|---------------------|-------------------|
| COMMIT  | Closes all existing cursors in the current session | No                  | Yes               |

## 📚 See Also

- [BEGIN](./20_BEGIN.md)
- [CLOSE](./21_CLOSE.md)

