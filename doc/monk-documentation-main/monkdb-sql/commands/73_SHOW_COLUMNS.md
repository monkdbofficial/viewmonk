# MonkDB: `SHOW COLUMNS` Statements

The `SHOW COLUMNS` command is commonly used across SQL-based databases, including MonkDB, MySQL, and others, to retrieve metadata about the columns of a specified table. Below is a detailed breakdown of its usage, syntax, parameters, and clauses.

## SQL Statement

```sql
SHOW COLUMNS { FROM | IN } table_name [ { FROM | IN } table_schema ] [ LIKE 'pattern' | WHERE expression ]
```

## Description

The `SHOW COLUMNS` command fetches metadata about the columns of a specified table. It provides information such as:

- Column names
- Data types
- Nullability
- Keys (e.g., primary or foreign keys)
- Default values
- Additional attributes (e.g., auto-increment)

Columns are typically displayed in alphabetical order. If more detailed information is required, querying the `information_schema.columns` table is recommended.

## Parameters
- `table_name`: Specifies the name of the table whose column information is to be retrieved.
- `table_schema`: Specifies the schema containing the table. If omitted, the default schema (e.g., doc) is used.

## Clauses
### LIKE Clause

The `LIKE` clause filters column names based on a string pattern. For example

```sql
SHOW COLUMNS FROM table_name LIKE 'prefix%';
```

This retrieves columns whose names start with `prefix.`.

### WHERE Clause

The `WHERE` clause allows filtering based on more complex conditions. For example

```sql
SHOW COLUMNS FROM table_name WHERE data_type = 'VARCHAR';
```

This retrieves only columns with a `VARCHAR` data type.

## Examples

Basic Usage

Retrieve all columns from a table

```sql
SHOW COLUMNS FROM customers;
```

Specifying Schema

Retrieve columns from a specific schema

```sql
SHOW COLUMNS FROM customers IN monkdb;
```

Using `LIKE` Clause and filter columns by name pattern

```sql
SHOW COLUMNS FROM orders LIKE 'order_%';
```

Using `WHERE` Clause and filter columns based on conditions

```sql
SHOW COLUMNS FROM payments WHERE data_type = 'DECIMAL';
```

## Example Output

+-------------+----------+------+-----+---------+----------------+
| Field       | Type     | Null | Key | Default | Extra          |
+-------------+----------+------+-----+---------+----------------+
| ID          | int(11)  | NO   | PRI | NULL    | auto_increment |
| Name        | char(35) | NO   |     |         |                |
| Population  | int(11)  | NO   |     | 0       |                |
+-------------+----------+------+-----+---------+----------------+
