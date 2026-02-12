# MonkDB: `SET TRANSACTION` Statements

The `SET TRANSACTION` and `SET SESSION CHARACTERISTICS AS TRANSACTION` commands are used in SQL to configure transaction characteristics such as isolation levels, access modes, and deferrable properties. These commands allow customization of transaction behavior for the current session or individual transactions.

## SQL Statement

### SET SESSION CHARACTERISTICS AS TRANSACTION

Sets default transaction characteristics for all subsequent transactions in a session.

```sql
SET SESSION CHARACTERISTICS AS TRANSACTION transaction_mode [, ...]
```
`transaction_mode` can include:

- **Isolation levels**: `SERIALIZABLE`, `REPEATABLE READ`, `READ COMMITTED`, or `READ UNCOMMITTED`.
- **Access modes**: `READ WRITE` or `READ ONLY`.
- **Deferrable properties**: `[NOT] DEFERRABLE`.

### SET TRANSACTION

Sets characteristics for the current transaction only.

```sql
SET TRANSACTION transaction_mode [, ...]
```

## Description

In traditional SQL databases like PostgreSQL or MySQL, these commands are used to control transaction behavior:

- **Isolation Levels**: Define how changes made by one transaction are visible to others.
- **Access Modes**: Specify whether a transaction can write (`READ WRITE`) or is read-only (`READ ONLY`).
- **Deferrable Properties**: Manage constraints such as deferred checks.

However, MonkDB does not support transactions. All operations in MonkDB are auto-committed, meaning each statement is executed and persisted independently. This design aligns with MonkDB's focus on scalable read/write performance and analytical capabilities rather than traditional transactional use cases.

## MonkDB Compatibility

### Transaction Commands

MonkDB accepts commands like `BEGIN`, `COMMIT`, and `ROLLBACK` for compatibility with PostgreSQL clients but ignores them silently. No actual transactional control is implemented.

### Versioning for Atomicity

While MonkDB lacks full transactional support, it uses version numbers for rows to implement optimistic concurrency control (OCC). This allows users to ensure atomic updates by checking row versions before modifying data.

### Use Cases Without Transactions

For scenarios requiring atomicity (e.g., transferring balances between users), MonkDB suggests using OCC patterns or external locking mechanisms. However, this approach does not guarantee full transactional atomicity in cases of process failure.

### Recommendation

For critical transactional use cases (e.g., financial systems), it is advised to use a database with robust transaction support alongside MonkDB for analytical workloads.

## Examples

1. Ignored Transaction Commands
MonkDB supports PostgreSQL transaction commands like BEGIN, COMMIT, and ROLLBACK for client compatibility, but these commands are ignored. For example:

```sql
BEGIN TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
BEGIN OK, 0 rows affected (... sec)
```

```sql
COMMIT;
COMMIT OK, 0 rows affected (... sec)
```

These commands do not enforce transactional control, as every statement in MonkDB commits immediately

2. Optimistic Concurrency Control (OCC) for Atomic Updates
MonkDB uses row versioning to ensure atomic updates. For example, updating a record based on its version:

```sql
UPDATE uservisits 
SET visits = visits + 1 
WHERE id = 0 AND _version = <expected_version>;
```

This approach ensures that updates occur only if the row's version matches the expected value, preventing conflicts

3. Handling Duplicate Keys with ON CONFLICT
MonkDB allows atomic operations using the ON CONFLICT clause to update records without traditional transactions:

```sql
INSERT INTO uservisits (id, name, visits, last_visit) 
VALUES (0, 'Ford', 1, '2015-01-12') 
ON CONFLICT (id) DO UPDATE SET visits = visits + 1;
INSERT OK, 1 row affected (... sec)
```

This ensures atomicity during concurrent writes by leveraging OCC patterns.

4. Use Case: Transferring Balances Between Users
While MonkDB lacks full transactional support, balance transfers can be implemented using OCC or external locking mechanisms:

```sql
-- Deduct from Alice's account
cr> UPDATE accounts 
    SET balance = balance - 100 
    WHERE name = 'Alice' AND _version = <expected_version>;
```
```sql
-- Add to Bob's account
cr> UPDATE accounts 
    SET balance = balance + 100 
    WHERE name = 'Bob' AND _version = <expected_version>;
```

This approach ensures atomicity at the row level but does not guarantee full transactional consistency in case of process failure