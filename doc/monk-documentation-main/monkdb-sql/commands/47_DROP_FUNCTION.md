# MonkDB: `DROP FUNCTION` Statement

The `DROP FUNCTION` statement is used to remove a user-defined function (UDF) from a database. Below is a detailed explanation of its syntax, parameters, and usage in MonkDB.

## SQL Statement

```sql
DROP FUNCTION [IF EXISTS] function_name ( [ [argument_name] argument_type [, ...] ] )
```

## Description

The `DROP FUNCTION` command deletes a user-defined function from the database. It is particularly useful when you need to clean up unused or outdated functions. The function name and argument types must be specified to uniquely identify the function, especially in cases where functions are overloaded (multiple functions with the same name but different arguments).

## Parameters

- **IF EXISTS**: This optional clause prevents errors if the specified function does not exist. When included, the command will execute successfully even if the function is missing, issuing a notice instead of an error.
- **function_name**: Specifies the name of the function to be dropped. **This is mandatory** and must match the name of the existing function.
- **argument_name**: Names given to arguments for documentation purposes during creation. These names are ignored during the `DROP FUNCTION` process; only argument types are considered.
- **argument_type**: Specifies the data type(s) of the arguments for the function. Necessary to uniquely identify overloaded functions.

## Usage Notes
+ Dropping a function removes both its executable code and metadata from the database.
+ If multiple functions share the same name, specifying argument types ensures that only the intended version is removed.
+ Functions dropped using this command cannot be recovered; they must be recreated if needed.

## Examples

### Example 1. Basic Example

```sql
DROP FUNCTION calculate_discount(INT, DECIMAL);
```
This removes the `calculate_discount` function with specific argument types.

### Example 2. Using IF EXISTS

```sql
DROP FUNCTION IF EXISTS calculate_discount(INT, DECIMAL);
```

Here, no error will occur if `calculate_discount` does not exist.

### Example 3. Dropping Multiple Functions

```sql
DROP FUNCTION IF EXISTS func_one(INT), func_two(VARCHAR);
```

This drops multiple functions in one statement.

### Example 4. Overloaded Functions

If two functions share the same name but differ in argument types

```sql
DROP FUNCTION my_function(INT);
DROP FUNCTION my_function(VARCHAR);
```

## Considerations

+ Ensure you have appropriate privileges to drop a function (e.g., DBA or ownership rights).
+ Dependent objects (like triggers or operators) may block deletion unless explicitly handled using cascading options (if supported by MonkDB).
+ Always verify that dropping a function will not disrupt application workflows relying on it.

---

## See Also

- [Create a function](./28_CREATE_FUNCTION.md)