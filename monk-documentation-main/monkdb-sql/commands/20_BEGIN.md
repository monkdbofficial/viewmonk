# MonkDB: `BEGIN` Statement

The `BEGIN` statement in MonkDB is recognized for compatibility with PostgreSQL clients but does not initiate actual transactions, as MonkDB does not support transactional operations.

---

## SQL Statement

```sql
BEGIN [ WORK | TRANSACTION ] [ transaction_mode [, ...] ]
```

Where `transaction_mode` can include:

- `ISOLATION LEVEL isolation_level`
- `READ WRITE` or `READ ONLY`
- `[NOT] DEFERRABLE`

And `isolation_level` options are:

- `SERIALIZABLE`
- `REPEATABLE READ`
- `READ COMMITTED`
- `READ UNCOMMITTED`

---

## 🚀 Description

- **Purpose**: In MonkDB, the `BEGIN` statement does not initiate a transaction. Its primary function is to define a scope for declaring cursors without the `HOLD` option.

- **Behavior**:
  - Cursors declared without `HOLD` are automatically closed upon execution of an `END` or `COMMIT` command.
  - Nested `BEGIN` statements are not supported; each `BEGIN` starts a new scope, regardless of previous `BEGIN` executions.

---

## 🔧 Parameters

- **`WORK` | `TRANSACTION`**: Optional keywords included for compatibility; they have no operational effect in MonkDB.

- **`transaction_mode`**: Specifies transaction characteristics such as isolation level and access mode. These parameters are accepted for syntax compatibility but do not influence behavior in MonkDB.

---

## 📋 Notes

- **Transaction Support**: MonkDB does not support traditional transactions. Statements like `BEGIN`, `START TRANSACTION`, `COMMIT`, and `ROLLBACK` are accepted for compatibility purposes but do not alter database behavior.

- **Cursor Management**: While transactions are not supported, `BEGIN` can be used to establish a scope for cursors without the `HOLD` option, which are closed automatically upon `END` or `COMMIT`.

---

## 🔐 Permissions

- **Execution Rights**: Any user with the ability to execute SQL statements can issue the `BEGIN` command. No special permissions are required.

---

## 🏁 Summary

| Command   | Description                                                                 | Transaction Support | Cursor Scope Management |
|-----------|------------------------------------------------------------------------------|---------------------|--------------------------|
| `BEGIN`   | Starts a scope for cursors without `HOLD`; does not initiate a transaction. | No                  | Yes                      |


---

While MonkDB does not support transactions, understanding the role of the `BEGIN` statement can aid in managing cursor scopes effectively within the database environment.

---

## See Also

- [Close](./21_CLOSE.md)
- [End](./58_END.md)
