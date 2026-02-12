# MonkDB: `DELETE` Statement

The `DELETE` command in MonkDB (and SQL in general) is used to remove rows from a table based on specified conditions. 

## SQL Statement

```sql
DELETE FROM table_ident [ [AS] table_alias ] [ WHERE condition ]
```

## Description

The `DELETE` statement removes rows from a designated table that meet the conditions specified in the `WHERE` clause. If the `WHERE` clause is omitted, all rows in the table will be deleted, resulting in a valid but empty table.

## Parameters

- **table_ident**: The name of an existing table from which rows will be deleted, which can include an optional schema qualification.
- **table_alias**: An alternative name for the target table. When an alias is used, it conceals the actual table name entirely. For instance, in the statement `DELETE FROM foo AS f`, all subsequent references to this table must use f instead of foo.
- **condition**: A boolean expression that determines which rows will be deleted. Only those rows for which this expression evaluates to true will be removed.

---

## Examples

### Example 1. Delete Specific Rows

To remove rows based on a condition:

```sql
DELETE FROM employees WHERE department = 'HR';
```

This deletes all rows where the department column has the value `HR`.

### Example 2. Delete Using Table Alias

You can use an alias for the table to simplify references:

```sql
DELETE FROM employees AS e WHERE e.department = 'Finance';
```

This deletes rows from the employees table where the department is `Finance`, using the alias `e`.

### Example 3. Delete Rows Based on Multiple Conditions

Combine conditions with logical operators:

- Using AND:

```sql
DELETE FROM employees WHERE department = 'Sales' AND age > 40;
```

Deletes rows where both conditions are true.

- Using OR:

```sql
DELETE FROM employees WHERE department = 'Marketing' OR age < 25;
```

Deletes rows where either condition is true.

### Example 4. Delete All Rows

To empty a table without dropping its structure:

```sql
DELETE FROM employees;
```

This removes all rows from the employees table, leaving it empty but intact.

### Example 5. Delete with Schema Qualification

Specify a schema-qualified table name:

```sql
DELETE FROM company.employees WHERE department = 'IT';
```

Deletes rows from the employees table within the company schema where the department is `IT`.

### Example 6. Delete and Return Deleted Rows

MonkDB supports returning information about deleted rows:

```sql
DELETE FROM employees WHERE department = 'HR' RETURNING id, name;
```

This deletes rows and returns their id and name.