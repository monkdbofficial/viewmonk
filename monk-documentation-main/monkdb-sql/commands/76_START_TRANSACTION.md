# MonkDB: `START TRANSACTION` Statement

The `START TRANSACTION` SQL command in MonkDB is traditionally used in relational databases (like PostgreSQL, MySQL, etc.) to begin a transactional block—allowing multiple operations to execute as a single atomic unit, with commit/rollback semantics.

In MonkDB, however, this command is accepted purely for client compatibility — it has no operational effect. 

## Actual Behavior in MonkDB

> **MonkDB does not support multi-statement transactions.**

- `START TRANSACTION` is silently ignored.
- Any specified transaction modes (isolation level, read/write) are ignored as well.
- This is intended to support compatibility with PostgreSQL clients or ORMs (like SQLAlchemy, Django ORM, etc.) that expect transaction syntax.

## SQL Statement

```sql
START TRANSACTION [transaction_mode [, ...]];
```

where, `transaction_mode` options are (all ignored by MonkDB):

- `ISOLATION LEVEL SERIALIZABLE`
- `READ WRITE` or `READ ONLY`
- `[NOT] DEFERRABLE`

## Examples
### Example 1. Standard use (ignored in MonkDB)

```sql
START TRANSACTION;
INSERT INTO sensor_data (id, temperature) VALUES ('A1', 22.5);
COMMIT;
```

In MonkDB:

`START TRANSACTION` and `COMMIT` are ignored. The `INSERT` runs immediately and is not part of a transaction.

## Why MonkDB Doesn’t Support Transactions

MonkDB is designed for distributed, massively parallel, append-friendly workloads, such as:
- Time-series ingestion
- Analytics
- Search queries
- Real-time dashboards

> **In short, it is an OLAP database, and not OLTP.**

These use cases prioritize:

- High ingestion throughput
- Horizontal scalability
- Eventual consistency or single-statement atomicity

Adding traditional transaction support (e.g., multi-statement rollback, isolation levels) would increase system complexity and degrade performance in these scenarios.

## When is this Useful in MonkDB?

- When you’re using a PostgreSQL-compatible tool or client (e.g., `psql`, `pgAdmin`, `psycopg2`, ORMs).
- Those tools might automatically inject `START TRANSACTION`, `COMMIT`, etc.
- MonkDB won’t error — it just ignores those and executes the actual DML/DDL statements.

## Comparison: MonkDB vs PostgreSQL (Transactional Semantics)

| **Feature**                   | **PostgreSQL**       | **MonkDB**           |
|--------------------------------|----------------------|-----------------------|
| Multi-statement transactions   | ✅ Supported         | ❌ Not supported      |
| `START TRANSACTION`              | ✅ Operational       | ✅ Ignored (no effect)|
| `COMMIT` / `ROLLBACK`              | ✅ Functional        | ✅ Accepted, no effect|
| Isolation Levels               | ✅ Enforced          | ❌ Not applicable     |
| Single-statement atomicity     | ✅ Yes               | ✅ Yes                |


## Note

- MonkDB accepts `START TRANSACTION`, `COMMIT`, and `ROLLBACK` for compatibility — but does not execute multi-statement transactions.
- All statements are executed independently and are atomic at the statement level only.
- **This design is aligned with MonkDB’s focus on scale-out analytics and fast ingestion, not traditional OLTP**.
