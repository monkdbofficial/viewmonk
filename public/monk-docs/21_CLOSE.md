# MonkDB: `CLOSE` Statement

The `CLOSE` statement in MonkDB is used to close cursors that have been previously declared using the `DECLARE` statement. Closing a cursor releases the resources associated with it.

---

## SQL Statement

```sql
CLOSE { cursor_name | ALL };
```

---

## 🚀 Description

- `CLOSE cursor_name`: Closes the cursor identified by `cursor_name`. Attempting to close a cursor that does not exist will result in an error.​
- `CLOSE ALL`: Closes all open cursors within the current session.

---

## 🔧 Parameters

- `cursor_name`: The name of the cursor to be closed. This must match the name used in the corresponding DECLARE statement.

--- 

## ✅ Example

Assuming a cursor named `my_cursor` has been declared, you can close it using:​

```sql
CLOSE my_cursor;
```

To close all open cursors in the current session:​

```sql
CLOSE ALL;
```

## 📋 Notes

Closing a cursor that has already been closed or does not exist will result in an error. It's good practice to ensure that cursors are properly managed to avoid such errors.​

MonkDB does not support transactions; therefore, cursors are managed independently of transactional control statements.

---

## See Also

- [Begin](./20_BEGIN.md)
