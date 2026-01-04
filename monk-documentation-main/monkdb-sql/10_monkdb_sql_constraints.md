# MonkDB SQL Constraints To Enforce Data Integrity


This chapter provides an in-depth overview of the **various constraints** supported by MonkDB, which are essential for enforcing data integrity and defining rules for the data stored within tables. Constraints in MonkDB can be categorized into two main types: **Table Constraints** and **Column Constraints**.

---

## Table Constraints

Table constraints apply to the table as a whole and can encompass multiple columns.

### PRIMARY KEY

The `PRIMARY KEY` constraint ensures that the specified column(s) contain only unique, non-null values. It uniquely identifies each record in a table and defines the default routing value used for sharding.

#### Key Points:
- **Uniqueness and Non-null**: A primary key combines a unique constraint and a not-null constraint.
- **Sharding**: Defines the default routing value for sharding.
- **Data Types**: Columns of types `object`, `geo_point`, `geo_shape`, or `array` cannot be used as primary keys. However, individual sub-columns within an object can be designated as primary keys.
- **Empty Table Requirement**: Adding a primary key column is only possible if the table is empty.

#### Syntax:

```psql
[CONSTRAINT <constraint_name>] PRIMARY KEY (column_name1 [, column_name2, ...])
```

#### Examples:

Creating a table with a single-column primary key:

```psql
CREATE TABLE my_table1 (
    first_column INTEGER PRIMARY KEY,
    second_column TEXT
);
```

Defining a composite primary key using multiple columns:

```psql
CREATE TABLE my_table1pk (
    first_column INTEGER,
    second_column TEXT,
    third_column TEXT,
    PRIMARY KEY (first_column, second_column)
);
```

Adding a primary key column to an existing table (note: the table must be empty):

```psql
ALTER TABLE person2 ADD COLUMN middleName TEXT PRIMARY KEY;
```

**However, please be cautioned**. The verification to ensure the table is empty and the schema update isn't atomic. This means it's possible to add a primary key column to a table that isn't empty, which can lead to unexpected behavior in queries involving the primary key columns.

### INDEX

The `INDEX` constraint specifies a particular indexing method for one or more columns, enhancing query performance.

#### Key Points:
- **Multiple Indexes**: It's possible to define more than one index per table, either as a column constraint or a table constraint
- **Index Methods**: MonkDB supports various index methods, including full-text indexes with custom analyzers.

#### Syntax:

```psql
[CONSTRAINT <constraint_name>] INDEX index_name USING index_method (column_name1 [, column_name2, ...])
[WITH (analyzer = analyzer_name)]
```

#### Example:

Creating a full-text index on a column:

```psql
CREATE TABLE articles (
    id INTEGER PRIMARY KEY,
    title TEXT,
    INDEX title_ft USING FULLTEXT (title) WITH (analyzer = 'english')
);
```

### CHECK

The `CHECK` constraint ensures that the values in specified columns satisfy a boolean expression, enforcing custom rules at the database level.

#### Key Points:
- **Validation**: The boolean expression is evaluated for each row during INSERT and UPDATE operations.
- **Deterministic Expressions**: The conditions must be deterministic, always yielding the same result for the same input.

#### Syntax:

```psql
[CONSTRAINT <constraint_name>] CHECK (boolean_expression)
```

#### Examples:

Creating a table with a `CHECK` constraint to ensure a column's value is non-negative:

```psql
CREATE TABLE metrics (
    id TEXT PRIMARY KEY,
    weight DOUBLE CHECK (weight >= 0)
);
```

Defining a `CHECK` constraint on multiple columns:

```psql
CREATE TABLE orders (
        order_id INTEGER PRIMARY KEY,
        quantity INTEGER,
        price DOUBLE,
        CHECK (quantity * price >= 100)
    );
```

**Note**: To add a CHECK constraint to a sub-column of an object column, reference the sub-column by its full path:

```psql
CREATE TABLE metrics (
    properties OBJECT AS (
        weight INTEGER CHECK (properties['weight'] >= 0)
    )
);
```
---

## Column Constraints

Column constraints apply to individual columns within a table.

### NULL

The `NULL` constraint explicitly states that a column can contain NULL values. This is the default behavior for columns in MonkDB.

#### Key Points:
- **Default Behavior**: Columns are nullable by default unless specified otherwise.
- **Primary Key Exception**: Columns that are part of the primary key cannot be declared as NULL.

#### Example:

```psql
CREATE TABLE my_table2 (
    first_column INTEGER PRIMARY KEY,
    second_column TEXT NULL
);
```

### NOT NULL

The `NOT NULL` constraint specifies that a column must contain only non-null values, ensuring that every row has a valid (non-null) entry for the column.

#### Key Points:
- **Mandatory Data**: Enforces that the column cannot have NULL values.
- **Primary Key Implication**: Columns that are part of the primary key are NOT NULL by default.

#### Example:

```psql
CREATE TABLE my_table3 (
    first_column INTEGER PRIMARY KEY,
    second_column TEXT NOT NULL
);
```
---

## Additional Notes

- **Constraint Naming**: If the `CONSTRAINT <constraint_name>` clause is omitted, MonkDB generates a unique name automatically. This name is visible in the `table_constraints` **system table** and can be used for operations like dropping the constraint.
- **Adding Constraints to Existing Tables**: Some constraints, like `CHECK`, can be added to existing tables using the `ALTER TABLE` statement. However, adding a `PRIMARY KEY` constraint **requires** the table to be empty.
- **Deterministic Conditions**: For `CHECK` constraints, ensure that the conditions are deterministic. Using non-deterministic expressions, such as those involving user-defined functions that can change behavior, may lead to inconsistencies.


By effectively utilizing these constraints, you can enforce data integrity and establish robust rules for the data stored within your MonkDB tables.