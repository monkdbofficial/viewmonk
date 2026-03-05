# MonkDB: `CREATE FUNCTION` Statement

The `CREATE FUNCTION` statement is used to define a new user-defined function (UDF) in MonkDB. This allows users to encapsulate logic that can be reused across queries.

---

## SQL Statement

```sql
CREATE [OR REPLACE] FUNCTION function_name
    ( [ [argument_name] argument_type ] [, ...] )
RETURNS return_type
LANGUAGE language_name
AS 'definition'
```

---

## Description

The `CREATE FUNCTION` statement creates a new user-defined function that can be called in SQL queries. 

### Key Features:
- **Create or Replace:** The `CREATE OR REPLACE FUNCTION` option allows you to create a new function or replace an existing one with the same name and signature.
- **Function Overloading:** You can define multiple functions with the same name but different argument types or counts, allowing for function overloading.

---

## Parameters

| Parameter          | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| **function_name**   | The name of the function to create.                                        |
| **argument_name**   | (Optional) The name given to an argument for documentation purposes.       |
| **argument_type**   | The data type of the argument (e.g., `INT`, `TEXT`).                      |
| **return_type**     | The data type returned by the function (e.g., `BOOLEAN`, `DOUBLE`).       |
| **language_name**   | The programming language used for the function (e.g., `SQL`, `JavaScript`).|
| **definition**      | A string defining the body of the function, containing the logic to execute.|

---

## Examples

### Example 1: Creating a Simple Function
Create a function that returns the square of an integer:

```sql
CREATE FUNCTION square(INT x)
RETURNS INT
LANGUAGE SQL
AS 'SELECT x * x';
```

This function takes an integer as input and returns its square.

---

### Example 2: Creating a Function with Multiple Arguments
Create a function that concatenates two strings:

```sql
CREATE FUNCTION concat_strings(TEXT str1, TEXT str2)
RETURNS TEXT
LANGUAGE SQL
AS 'SELECT str1 || str2';
```

This function combines two strings into one.

---

### Example 3: Using CREATE OR REPLACE
Replace an existing function that adds two integers:

```sql
CREATE OR REPLACE FUNCTION add_numbers(INT a, INT b)
RETURNS INT
LANGUAGE SQL
AS 'SELECT a + b';
```

If `add_numbers` already exists, it will be replaced with this new definition.

---

### Example 4: Function Overloading
Define two functions with the same name but different argument types:

```sql
CREATE FUNCTION multiply(INT a, INT b)
RETURNS INT
LANGUAGE SQL
AS 'SELECT a * b';

CREATE FUNCTION multiply(FLOAT a, FLOAT b)
RETURNS FLOAT
LANGUAGE SQL
AS 'SELECT a * b';
```

In this example, both functions can be called using the same name, but they will operate on different data types.

---

## Notes

1. **Function Names:** Ensure that function names are unique within their schema unless you are intentionally overloading.
2. **Permissions:** You must have appropriate permissions to create or replace functions in the schema.
3. **Supported Languages:** The languages available for defining functions may vary based on your MonkDB installation.
4. **Error Handling:** Consider adding error handling within your function definition to manage unexpected inputs or conditions gracefully.

--- 

## 🔐 Permissions

- **Create Function**: Requires the `CREATE` privilege on the target schema where the function will be defined.
- **Replace Function**: To replace an existing function, the user must also own the original function or have the `ALTER` privilege on it.
- **Function Execution**: Any user with `EXECUTE` permission on the function can call it in queries (granted by default unless explicitly revoked).
- **Security Considerations**:
  - Functions that call external systems or execute procedural logic (e.g., JavaScript) should be carefully reviewed to avoid injection risks.
  - Use schema-qualified names to avoid ambiguity and accidental overrides.

---

## 🏁 Summary

| Feature                     | Supported / Required                                                |
|-----------------------------|---------------------------------------------------------------------|
| SQL Language Support        | ✅ Yes                                                              |
| Function Overloading        | ✅ Yes (based on different argument signatures)                     |
| CREATE OR REPLACE Support   | ✅ Yes                                                              |
| Named Arguments             | ✅ Optional (for readability)                                      |
| Multiple Argument Support   | ✅ Yes                                                              |
| Permissions Required        | `CREATE` on schema, `ALTER` to replace existing function           |
| Function Execution Grants   | ✅ Default to all users unless restricted                          |
| Schema Scope                | ✅ Functions are defined within a schema                            |
| External Language Support   | ⚠️ Depends on MonkDB configuration (e.g., JavaScript)              |

---

## See Also

- [Drop a function](./47_DROP_FUNCTION.md)