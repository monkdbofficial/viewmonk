# MonkDB SQL Value Expressions

This chapter provides a comprehensive overview of value expressions in MonkDB, detailing their types, syntax, and usage to help users effectively construct and manipulate SQL queries in MonkDB.

---

## Introduction to Value Expressions

In MonkDB, a value expression is a combination of one or more values, operators, and functions that evaluate to a single value. These expressions are fundamental components of SQL queries, enabling data retrieval, manipulation, and computation.
Types of Value Expressions

MonkDB supports various types of value expressions, each serving a specific purpose within SQL statements. Below is a detailed exploration of each type:

### 1. Literal Values

Literals are explicit values represented directly within SQL statements. They can be of various types:

- **Boolean Literals**: `true` or `false`
- **String Literals**: `'This is a string literal'`
- **Numeric Literals**: `42`, `42.0`, or with underscores for readability, e.g., `1_000_000`
- **Interval Literals**: `INTERVAL '1' SECOND`

**Integer Literal Values**: These include numeric literals, null, parameter references, or expressions cast to an integer-compatible type. Examples include:

```text
123
null
'10'::int
CAST(? AS long)
TRY_CAST(? AS short)
```

### 2. Column References

A column reference denotes the name of a column in a table. It can be represented as:

- **Unquoted Identifier**: columnname
- **Quoted Identifier**: "columnName"

To unambiguously identify a column, especially in queries involving multiple tables or aliases, you can include the table, schema, and catalog names:

`monkdb.myschema.mytable.columnname`, `myschema.mytable.columnname`, `tab0.columnname`

**Note**: In MonkDB, the only valid catalog name is `monkdb`.

### 3. Parameter References

Parameter references act as placeholders for values in SQL statements, allowing for dynamic query execution. They can be:

**Unnumbered Placeholders**: Represented by a question mark (`?`), e.g.,

```psql
SELECT * FROM t WHERE x = ?
```

**Numbered Placeholders**: Denoted by `$n`, where `n` is the parameter index, e.g.,

```psql
SELECT * FROM t WHERE x = $1 OR x = $2
```

### 4. Operator Invocation

Operators perform operations on expressions and can be invoked in two ways:

- **Binary Operators**: Involve two expressions with the operator in between: `expression operator expression`. For example, `a + b`.
- **Unary Operators**: Involve a single expression with the operator preceding it: `operator expression`. For example: `-a`.

### 5. Subscripts

Subscript expressions use the subscript operator (`[]`) to access elements within composite types like `arrays`, `objects`, or `records`.

- **Array Subscript**: Retrieves an element from an array using a 1-based index: `array_expression[array_index]`

For example:

```psql
SELECT tags[1] FROM articles;
```

- **Object Subscript**: Accesses a value from an object using a key: `obj_expression['key']`.

For example:

```psql
SELECT metadata['author'] FROM books;
```

- **Record Subscript**: Retrieves the value of a field within a record or object: `(record_expression).fieldName`

For example:

```psql
SELECT (information_schema._pg_expandarray(ARRAY['a', 'b'])).n AS n;
```

### 6. Function Calls

Functions perform specific tasks and return values. A function call consists of the function name followed by parentheses enclosing any arguments: `function_name([expression [, expression ...]])`.

For example:

```psql
SELECT upper(name) FROM users;
```

### 7. Type Casts

Type casting converts a value from one data type to another. MonkDB supports two forms: 

- **CAST**: `CAST(expression AS type)`.

For example:

```psql
SELECT CAST(price AS INTEGER) FROM products;
```

- **TRY_CAST**: Returns null if the conversion fails, instead of raising an error: `TRY_CAST(expression AS type)`

For example:

```psql
SELECT TRY_CAST(value AS DOUBLE) FROM measurements;
```

### 8. Object Constructors

An object constructor creates an object from specified key-value pairs:

{ key1 = valueExpression1 [, key2 = valueExpression2 ...] }

Example:

SELECT {name = 'Alice', age = 30} AS person;

### 9. Array Constructors

An array constructor creates an array from specified expressions:

- **Using Square Brackets**: `[expression1, expression2, ...]`

For example:

```psql
SELECT [1, 2, 3] AS numbers;
```

- **Using ARRAY Keyword**: `ARRAY(subquery)`

For example:

```psql
SELECT ARRAY(SELECT height FROM mountains ORDER BY height DESC LIMIT 5) AS top5_heights;
```

**Note**: The subquery must return a single column.

### 10. Scalar Subqueries

A scalar subquery is a subquery that returns a single value (one row, one column). If no rows are returned, it evaluates to null. If more than one row is returned, an error is raised.

For example:

```psql
SELECT (SELECT max(salary) FROM employees) AS highest_salary;
```

**Note**: Scalar subqueries can be correlated, meaning they reference columns from the outer query.

---

## Note

Understanding and effectively utilizing value expressions in MonkDB enables the construction of powerful and efficient SQL queries. By combining literals, column references, operators, functions, and subqueries, users can perform complex data retrieval and manipulation tasks tailored to their specific requirements.