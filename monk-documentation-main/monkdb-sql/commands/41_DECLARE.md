# MonkDB: `DECLARE` Statement

The `DECLARE` command in MonkDB is used to create a cursor, which allows efficient retrieval of query results in manageable batches. This is particularly useful for handling large datasets and implementing pagination.

---

## SQL Statement

```sql
DECLARE name [ ASENSITIVE | INSENSITIVE ] [ [ NO ] SCROLL ]
CURSOR [ { WITH | WITHOUT } HOLD ] FOR query
```

In this context, `name` refers to a chosen identifier for the cursor, while `query` represents a `SELECT` statement.

## Description

A cursor allows for the retrieval of a limited number of rows at once from a query that produces a larger result set. Once a cursor is established, rows can be retrieved using the `FETCH` command.

Declared cursors can be found in the `pg_catalog.pg_cursors` table.

## Clauses

### WITH | WITHOUT HOLD

The default setting is `WITHOUT HOLD`, which ties the cursor's lifespan to the duration of a transaction. It is considered an error to use `WITHOUT HOLD` when there is no active transaction initiated by a `BEGIN` statement.

Using `WITH HOLD` alters the cursor's lifespan to match that of the connection.

When a transaction is committed, all cursors established with `WITHOUT HOLD` are closed. Additionally, closing a connection will terminate all cursors created during that connection.

> MonkDB does not fully support transactions. Once a transaction is initiated, it cannot be rolled back, and any write operations within a `BEGIN` clause may be visible to other statements prior to the transaction being committed.

### [ ASENSITIVE | INSENSITIVE ]

This provision is irrelevant as MonkDB Cursors are inherently insensitive. 

### [ NO ] SCROLL

The default setting, `NO SCROLL`, indicates that the cursor is restricted to forward movement only. 

In contrast, `SCROLL` permits backward navigation with the cursor but introduces additional memory usage.

--- 

## Examples

### 1. Declaring a Cursor

```sql
BEGIN;
DECLARE sales_cursor NO SCROLL CURSOR FOR
SELECT mobile_brand, unit_sale FROM mobile_sales WHERE unit_sale > 3000;
```

Creates a cursor named `sales_cursor` for fetching rows from the `mobile_sales` table.

### 2. Fetching Data

```sql
FETCH 5 FROM sales_cursor;
```

Retrieves 5 rows at a time from the cursor.

### 3. Closing the Cursor

```sql
END;
```

Ends the transaction and closes all cursors declared with `WITHOUT HOLD`.

---

## See Also

- [Begin](./20_BEGIN.md)
- [Close](./21_CLOSE.md)
- [Fetch](./60_FETCH.md)

