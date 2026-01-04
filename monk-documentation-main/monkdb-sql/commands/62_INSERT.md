# MonkDB: `INSERT` Statement

The `INSERT` statement in MonkDB is a powerful tool used to insert new rows into a table.

## SQL Statement

```sql
INSERT INTO table_ident
  [ ( column_ident [, ...] ) ]
  { VALUES ( expression [, ...] ) [, ...] | ( query ) | query }
  [ ON CONFLICT (column_ident [, ...]) DO UPDATE SET { column_ident = expression [, ...] } |
    ON CONFLICT [ ( column_ident [, ...] ) ] DO NOTHING ]
  [ RETURNING { * | output_expression [ [ AS ] output_name ] | relation.* } [, ...] ]
```

## Parameters
- **table_ident**: The name of the table where data will be inserted. It can be schema-qualified.
- **column_ident**: Names of columns in the table where values will be inserted.
- **expression**: Values or expressions to assign to the columns.
- **query**: A SQL query (e.g., `SELECT`) that provides rows for insertion.
- **output_expression**: Expressions computed and returned after each row is inserted or updated.
- **output_name**: Alias for the output expression.

## Description

The `INSERT` statement creates one or more rows in the specified table. Key points include:
- You can specify target column names explicitly or omit them, in which case all columns are used by default.
- MonkDB matches values with column names from left to right, based on their order.
- Automatic type conversion is applied if the provided values do not match the expected data types.

### Conflict Handling

MonkDB supports handling conflicts with primary keys using ON CONFLICT clauses:

#### ON CONFLICT DO UPDATE SET:

Updates existing records when a conflict occurs due to primary key constraints.

```sql
INSERT INTO uservisits (id, name, visits, last_visit) VALUES
(0, 'Ford', 1, '2015-09-12')
ON CONFLICT (id) DO UPDATE SET visits = visits + 1;
```

This increments the visits count if a record with the same `id` already exists.

You can reference excluded values using the virtual table excluded:

```sql
ON CONFLICT (id) DO UPDATE SET last_visit = excluded.last_visit;
```

#### ON CONFLICT DO NOTHING:

Silently ignores rows that would cause duplicate key conflicts without raising an error.

```sql
INSERT INTO my_table (col_a, col_b) VALUES (1, 42)
ON CONFLICT DO NOTHING;
```

## RETURNING Clause

The optional `RETURNING` clause allows you to retrieve values after insertion or update. For example:

```sql
INSERT INTO my_table (col_a, col_b) VALUES (1, 42)
RETURNING col_a, col_b;
```
## Performance Considerations

MonkDB is optimized for high ingestion rates. For example:

- Batched inserts can improve performance significantly.
- Using prepared statements with methods like `UNNEST` allows dynamic row insertion but requires caution as inconsistent data types may lead to dropped rows without error notifications.

## Examples

### Example 1. Basic Insert

```sql
INSERT INTO locations (id, date, description) VALUES
('14', '2013-09-12', 'Blagulon Kappa is the planet...');
```

### Example 2. Multiple Rows Insert

```sql
INSERT INTO locations (id, date, description) VALUES
('16', '2013-09-14', 'Blagulon Kappa II...'),
('17', '2013-09-13', 'Brontitall...');
```

### Example 3. Insert from Query

```sql
INSERT INTO my_table SELECT * FROM another_table WHERE condition;
```

MonkDB's `INSERT` statement provides flexibility and scalability for handling data insertion efficiently while supporting advanced conflict resolution mechanisms like upserts and silent conflict handling.




