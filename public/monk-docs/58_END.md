# MonkDB: `END` Statement

MonkDB does not support traditional transactions, as its focus is on scalable read/write performance and analytical capabilities rather than transactional use cases. Here's an expanded explanation of the `END` command and MonkDB's approach to transactions.

## SQL Statement

```sql
END [ WORK | TRANSACTION ]
```

## Description

The `END` statement in SQL is synonymous with `COMMIT`. In databases that support transactions, it marks the conclusion of a transaction and makes all changes permanent. However, in MonkDB:

- Transactions are not supported; thus, commands like `BEGIN`, `COMMIT`, and `ROLLBACK` are accepted for compatibility but are effectively ignored.
- The primary purpose of the `END` statement in MonkDB is to close all cursors without hold in the current session.

## Why MonkDB Doesn't Support Transactions

MonkDB prioritizes high performance, scalability, and ease of use for analytical workloads. Supporting transactions would significantly impact SQL performance. Instead:

- Every write operation is automatically committed and replicated across the cluster.
- MonkDB uses version numbers for rows to provide consistency. This allows for patterns like optimistic concurrency control (OCC), which can address some use cases requiring atomicity.

## Parameters

- `WORK | TRANSACTION`- Optional keywords. They have no effect.

## Alternatives for Transaction-like Behavior in MonkDB

For operations requiring transactional guarantees like **transfer X credits from User A to User B**, please follow the below:

- **Optimistic Concurrency Control (OCC)**: Use the `_version` system column to perform version-aware updates:

```sql
UPDATE accounts
SET balance = balance - 100
WHERE user_id = 'user_a' AND _version = 4;
```

If another process updated the row, the `_version` check fails and no row is updated.

- **Single Process Control**: Perform complex multi-step logic within one service/process to reduce race conditions.

- **Hybrid Approach**: Use MonkDB for analytics, logs, time series, and external transactional DB (like PostgreSQL) for things like money transfers.

## Examples

### Example 1. Basic Example: Committing a Transaction

```sql
-- These are executed immediately and independently.
INSERT INTO Customers (CustName, City, State, Country) 
VALUES ('John Doe', 'New York', 'NY', 'USA');

UPDATE Orders SET Product = 'Laptop' WHERE Id = 5;
```

> Note: Anything related to `TRANSACTION` are accepted for compatibility, but MonkDB does not support multi-statement transactions. Each statement runs independently.

### Example 2. Conditional Commit or Rollback

```sql
INSERT INTO Customers (CustName, City, State, Country) 
VALUES ('Jane Smith', 'Los Angeles', 'CA', 'USA');
```

There’s no rollback, and MonkDB does not allow conditional control flow inside SQL. However, this flow must be in app level. For example,

```python
# pseudo-code or real application logic-- MonkDB + psycopg2 or asyncpg
try:
    rows_affected = cursor.execute("""
        INSERT INTO Customers (CustName, City, State, Country)
        VALUES (%s, %s, %s, %s)
    """, ('Jane Smith', 'Los Angeles', 'CA', 'USA'))

    if rows_affected == 0:
        print("No row inserted. Skipping further actions.")
    else:
        print("Insert successful. Proceeding...")
        # perform next action
except Exception as e:
    print("Error occurred:", e)
    # optional: log, retry, or take compensating action
```

### Example 3. Workaround to SAVEPOINT

Each `DELETE`, `INSERT`, or `UPDATE` is independent and atomic.

```sql
DELETE FROM Customers WHERE ID = 1;
```

```sql
-- This runs immediately and cannot be rolled back
DELETE FROM Customers WHERE ID = 2;
```

If an error occurs, only that individual statement fails — there is no rollback to a previous state.

### Nested Transactions Example

```sql
-- Insert a new customer
INSERT INTO Customers (CustName, City, State, Country) 
VALUES ('Alice Brown', 'Chicago', 'IL', 'USA');

-- Update an order independently
UPDATE Orders SET Product = 'Tablet' WHERE Id = 3;
```

- Each statement is executed independently.
- There is no transactional context — if the `UPDATE` fails, the `INSERT` is not rolled back.
- `BEGIN`, `END TRANSACTION`, or named transactions like `MainTransaction` or `SubTransaction` are ignored or invalid.

---

## See Also

- [Begin](./20_BEGIN.md)