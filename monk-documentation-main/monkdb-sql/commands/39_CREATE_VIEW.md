# MonkDB: `CREATE VIEW` Statement

The `CREATE VIEW` statement is used to define a named query that can be referenced in other SQL statements. Views are not materialized; instead, the query is executed every time the view is referenced.

---

## SQL Statement

```sql
CREATE [ OR REPLACE ] VIEW view_ident AS query
```

or

```sql
CREATE [ OR REPLACE ] VIEW view_ident AS (query)
```

Where `query` is a valid `SELECT` statement.

---

## Description

The `CREATE VIEW` statement creates a named definition of a query. This allows you to reuse complex queries by referencing the view name instead of rewriting the query each time.

### Key Features:
- **Dynamic Execution:** Views are not materialized. The underlying query is executed every time the view is referenced.
- **Schema Support:** If a schema name is specified in `view_ident` (e.g., `schema_name.view_name`), the view is created in that schema.
- **Replacement:** Using `OR REPLACE` replaces an existing view with the same name.
- **Read-Only:** Views are read-only and cannot be used as targets for write operations (e.g., `INSERT`, `UPDATE`, or `DELETE`).

---

## Privileges

To create a view:
1. The user must have **DDL permissions** on the schema where the view is being created.
2. The user must have **DQL permissions** on all tables or relations referenced in the view's query definition.

---

## Parameters

| Parameter       | Description                                                                 |
|-----------------|-----------------------------------------------------------------------------|
| **view_ident**  | The name of the view to create. Can include a schema (e.g., `schema_name.view_name`). |
| **query**       | A valid `SELECT` statement that defines the view's content.                |

---

## Examples

### Example 1: Create a Simple View
Create a view named `active_users` based on a query:

```sql
CREATE VIEW active_users AS
SELECT id, name, last_login
FROM users
WHERE last_login > CURRENT_DATE - INTERVAL '30 days';
```


This creates a view that dynamically retrieves users who logged in within the last 30 days.

---

### Example 2: Replace an Existing View
Replace an existing view with updated logic:

```sql
CREATE OR REPLACE VIEW active_users AS
SELECT id, name, last_login, status
FROM users
WHERE last_login > CURRENT_DATE - INTERVAL '30 days' AND status = 'active';
```


This updates the `active_users` view to include an additional filter for active users.

---

### Example 3: Create a View in a Specific Schema
Create a view in the `analytics` schema:

```sql
CREATE VIEW analytics.top_customers AS
SELECT customer_id, SUM(total_spent) AS total_spent
FROM orders
GROUP BY customer_id
ORDER BY total_spent DESC LIMIT 10;
```


This creates the `top_customers` view within the `analytics` schema.

---

### Example 4: Avoiding Ambiguity with Column Names
Avoid using `*` in views to prevent ambiguity when columns are added or removed from source tables:

```sql
CREATE VIEW detailed_orders AS
SELECT order_id, customer_id, product_id, quantity, price
FROM orders;
```


Using explicit column names ensures consistency even if columns are added to or removed from the source table.

---

## Notes

1. **Dynamic Resolution of Columns:** If you use `*` in the query definition, it will resolve dynamically at runtime. Any new columns added to the source table after creating the view will appear in subsequent queries on the view.
2. **Object Columns:** If an object column is selected in a view, sub-columns will appear in `information_schema.columns`. Added sub-columns will show up dynamically, while dropped sub-columns will no longer appear.
3. **Unique Names:** A view cannot have the same name as an existing table or another view within the same schema.
4. **Performance Considerations:** Since views are not materialized, complex queries may impact performance when executed frequently.


---

## See Also

- [Drop View](./57_DROP_VIEW.md)



