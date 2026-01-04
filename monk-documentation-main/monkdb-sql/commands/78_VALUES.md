# MonkDB: `VALUES` Statement

The `VALUES` expression is used to generate a result set of constant rows. It's like a virtual table that exists only for the duration of the query.

It can be:
- Queried directly (`SELECT`).
- Used in `INSERT` statements.
- Joined with other tables (in subqueries or CTEs).

## SQL Statement

```sql
VALUES ( expression1 [, expression2, ...] ),
       ( expression1 [, expression2, ...] ),
       ...
```

Each tuple (row) must have the same number of columns, and types must be consistent or implicitly castable (e.g., 1 and '1' would cause an error).

## Basic Example

```sql
VALUES (1, 'one'), (2, 'two'), (3, 'three');
```

Output:

| col1 | col2    |
|------|---------|
| 1    | one     |
| 2    | two     |
| 3    | three   |

## Use Cases in MonkDB
### 1. ✅ Quick test datasets

You can use `VALUES` to return ad-hoc rows — great for testing functions, formatting, or expressions.

```sql
SELECT * FROM (
  VALUES (100, 'active'), (200, 'inactive')
) AS status_counts(id, status);
```

### 2. ✅ Insert rows into a table

This is the most common use of `VALUES`.

```sql
INSERT INTO products (id, name, price)
VALUES (1, 'Keyboard', 49.99),
       (2, 'Mouse', 19.99),
       (3, 'Monitor', 129.99);
```

Each tuple maps to the column order defined.

### 3. ✅ Use with JOIN or IN via subqueries

`VALUES` can be used as an inline table in a `JOIN`, `IN`, or `EXISTS` clause.
Example: Filter real table using `VALUES`

```sql
SELECT * FROM employees
WHERE department IN (
  SELECT col1 FROM (VALUES ('Engineering'), ('Sales')) AS temp(col1)
);
```

### 4. ✅ UNION-friendly mock data

Combine `VALUES` with `UNION ALL` for static sets:

```sql
SELECT * FROM (
  VALUES ('MonkDB', 'Database'), ('PostgreSQL', 'Database'), ('Redis', 'Cache')
) AS tech(name, type)
WHERE type = 'Database';
```

## Type Consistency Rules

- All values in the same column position across rows must have compatible types.
- MonkDB will try implicit conversion, but mismatched types like 1 and 'one' in the same column will raise errors.

```sql
-- ❌ Will fail due to type mismatch:
VALUES (1, 'one'), ('two', 2);
```

## Use with RETURNING

You can `INSERT` using `VALUES` and return the inserted values:

```sql
INSERT INTO cities (id, name) 
VALUES (1, 'Berlin'), (2, 'Mumbai')
RETURNING *;
```

## Not Supported

| Feature                    | MonkDB Support | Notes                                      |
|----------------------------|-----------------|--------------------------------------------|
| `DEFAULT` in `VALUES`          | ❌ Not supported | Must explicitly provide all values         |
| Multi-column type mismatch | ❌ Error        | Ensure consistent column types             |
| Named `VALUES` without alias | ❌ Error-prone   | Use `AS alias(col1, col2)` when needed       |

## Best Practices
- Use column aliases when selecting from `VALUES` to make the result clearer.
- When inserting, make sure column order and count match the target table.
- Great for bulk inserts, ad-hoc joins, and inline filtering.
