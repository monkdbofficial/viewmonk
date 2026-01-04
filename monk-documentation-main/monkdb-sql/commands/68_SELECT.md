# MonkDB: `SELECT` Statement

The `SELECT` statement retrieves rows from a database table or view. It allows filtering, sorting, grouping, and limiting results based on specified conditions. The output is presented as a result set, which is a virtual table.

## SQL Statement

```sql
SELECT [ ALL | DISTINCT ] * | expression [ [ AS ] output_name ] [, ...]
  [ FROM relation ]
  [ WHERE condition ]
  [ GROUP BY expression [, ...] [ HAVING condition ] ]
  [ UNION [ ALL | DISTINCT ] query_specification ]
  [ WINDOW window_name AS ( window_definition ) [, ...] ]
  [ ORDER BY expression [ ASC | DESC ] [ NULLS { FIRST | LAST } ] [, ...] ]
  [ LIMIT num_results | FETCH FIRST num_results ROWS ONLY ]
  [ OFFSET start ROWS ];
```

## Key Components
1. `SELECT` List

    - Specifies the columns or expressions to retrieve.
    - Use * to select all columns.
    - Alias columns with AS for better readability.
    - Example:
    ```sql
    SELECT first_name AS Name FROM Customers;
    ```

2. `FROM` Clause

    - Defines the source table or relation.
    - Can reference tables, views, joined relations, or subqueries.
    - Example:
    ```sql
    SELECT * FROM Orders
    ```

3. `WHERE` Clause

    - Filters rows based on conditions.
    - Accepts boolean expressions (e.g., comparisons, logical operators).
    - Example:
    ```sql
    SELECT * FROM Employees WHERE age > 30;
    ```

4. `GROUP BY` Clause

    - Groups rows sharing the same values in specified columns.
    - Aggregate functions (e.g., SUM, AVG) are applied within groups.
    - Example:
    ```sql
    SELECT department, AVG(salary) FROM Employees GROUP BY department;
    ```

5. `HAVING` Clause
    
    - Filters grouped results based on aggregate conditions.
    - Example:
    ```sql
    SELECT department, AVG(salary) 
    FROM Employees 
    GROUP BY department 
    HAVING AVG(salary) > 50000;
    ```

6. `UNION` Clause

    - Combines results from multiple SELECT statements.
    - `UNION ALL` includes duplicates; `UNION DISTINCT` removes them.
    - Example:
    ```sql
    SELECT name FROM Table1 
    UNION ALL 
    SELECT name FROM Table2;
    ```

7. `ORDER BY` Clause

    - Sorts results by specified columns or expressions.
    - Default order is ascending (ASC). Use DESC for descending order.
    - Example:
    ```sql
    SELECT * FROM Customers ORDER BY last_name ASC;
    ```

8. `LIMIT` and `OFFSET` Clauses

    - Restrict the number of rows returned (LIMIT) and skip rows (OFFSET).
    - Example:
    ```sql
    SELECT * FROM Products LIMIT 10 OFFSET 5;
    ```

## Advanced Features

### Window Functions (`OVER` Clause)

Used to perform calculations across a set of rows related to the current row (e.g., rankings, running totals).

Example:

```sql
SELECT employee_id, salary,
       RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rank
FROM Employees;
```

### Subqueries

Nested queries that act as temporary tables within the main query.

Example:

```sql
SELECT name FROM Customers WHERE id IN (SELECT customer_id FROM Orders WHERE total > 1000);
```

## Notes

MonkDB extends SQL functionality with features like distributed queries and JSON support. Key considerations include:

- **Indexed Fields**: Sorting and grouping require indexed fields for performance optimization.
- **Fulltext Indices**: Certain operations may need fulltext indexing disabled (e.g., sorting).
- **Dynamic Schema Handling**: MonkDB supports dynamic fields in tables.

## Examples

Select All Columns

```sql
SELECT * FROM Customers;
```

Filter Rows with Conditions

```sql
SELECT first_name, last_name 
FROM Employees 
WHERE age > 25 AND department = 'Sales';
```

Aggregate Data with Grouping

```sql
SELECT department, COUNT(*) AS employee_count 
FROM Employees 
GROUP BY department;
```

Combine Results with `UNION`

```sql
SELECT name FROM Table1 
UNION DISTINCT 
SELECT name FROM Table2;
```

