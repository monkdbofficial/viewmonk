# User-Friendly Error Messages Guide

This document shows how technical database errors are now converted into clear, actionable messages.

---

## ❌ Table Not Found

**Before (Technical):**
```
RelationUnknown[Relation 'demo.employees' unknown]
```

**After (User-Friendly):**
```
❌ Table Not Found

The table "demo.employees" does not exist in the database.

💡 Suggestions:
1. Make sure you created the table first using: CREATE TABLE demo.employees (...)
2. Check if the table name is spelled correctly
3. Verify the schema name (e.g., "demo.employees")
4. View available tables in the Schema Explorer (left sidebar)
```

---

## ❌ Column Not Found

**Before (Technical):**
```
ColumnUnknown[Column 'invalid_column' unknown]
```

**After (User-Friendly):**
```
❌ Column Not Found

The column "invalid_column" does not exist in the table.

💡 Suggestions:
1. Check if the column name is spelled correctly
2. Use "SELECT * FROM table LIMIT 1" to see available columns
3. Verify column was created in the table schema
4. Check the Schema Explorer for correct column names
```

---

## ❌ SQL Syntax Error

**Before (Technical):**
```
SQLParseException[line 7:1: mismatched input '``' expecting <EOF>]
```

**After (User-Friendly):**
```
❌ SQL Syntax Error

There is a syntax error in your SQL query at line 7, column 1.

💡 Suggestions:
1. Check for missing commas, parentheses, or semicolons
2. Make sure all SQL keywords are spelled correctly
3. Remove any extra characters (like backticks ``` from markdown)
4. Verify table and column names are properly quoted if needed
5. Use the SQL Templates in the sidebar for correct syntax examples
```

---

## ❌ Duplicate Entry

**Before (Technical):**
```
DuplicateKey[A document with the same primary key exists already]
```

**After (User-Friendly):**
```
❌ Duplicate Entry

A record with this primary key or unique value already exists.

💡 Suggestions:
1. Change the ID or unique field to a different value
2. Check existing data: SELECT * FROM table WHERE id = your_value
3. Use UPDATE instead of INSERT if you want to modify existing data
4. Delete the existing record first if you want to replace it
```

---

## ❌ Invalid Data Type

**Before (Technical):**
```
ValidationException[Cannot cast 'abc' to type INTEGER]
```

**After (User-Friendly):**
```
❌ Invalid Data Type

The data you're trying to insert doesn't match the column type.

💡 Suggestions:
1. Check that numbers are not in quotes (use 123, not '123')
2. Verify date/timestamp format: '2020-01-15' or CURRENT_TIMESTAMP
3. Make sure text values are in single quotes: 'text here'
4. Check column data types in the Schema Explorer
```

---

## ❌ Missing Required Value

**Before (Technical):**
```
NullValue[Cannot insert null value for column 'employee_name']
```

**After (User-Friendly):**
```
❌ Missing Required Value

The column "employee_name" cannot be NULL - you must provide a value.

💡 Suggestions:
1. Add a value for "employee_name" in your INSERT or UPDATE statement
2. Check which columns are marked as NOT NULL in the table schema
3. Provide a default value or remove the NOT NULL constraint
```

---

## ❌ Database Connection Failed

**Before (Technical):**
```
Error: connect ECONNREFUSED 127.0.0.1:4200
```

**After (User-Friendly):**
```
❌ Database Connection Failed

Cannot connect to the MonkDB server.

💡 Suggestions:
1. Make sure MonkDB server is running on the configured host and port
2. Check your connection settings in the Connections page
3. Verify firewall is not blocking the connection
4. Try reconnecting from the Connections page
```

---

## ❌ Query Timeout

**Before (Technical):**
```
Error: Query timeout after 30000ms
```

**After (User-Friendly):**
```
❌ Query Timeout

The query took too long to execute and was cancelled.

💡 Suggestions:
1. Try adding a LIMIT clause to reduce the number of rows
2. Add a WHERE clause to filter data more specifically
3. Consider creating an index on frequently queried columns
4. Break complex queries into smaller steps
```

---

## ❌ Permission Denied

**Before (Technical):**
```
UnauthorizedException[Access denied for user 'guest']
```

**After (User-Friendly):**
```
❌ Permission Denied

You don't have permission to perform this operation.

💡 Suggestions:
1. Check your database user permissions
2. Contact your database administrator for access
3. Verify you're connected with the correct user account
```

---

## Example: Common Beginner Mistake

**Scenario:** User tries to INSERT data before creating the table

**Query:**
```sql
INSERT INTO demo.employees (id, name) VALUES (1, 'John');
```

**Old Error:**
```
RelationUnknown[Relation 'demo.employees' unknown]
```

**New Error Display:**

**Toast Notification:**
```
❌ Table Not Found
The table "demo.employees" does not exist in the database.
```

**Results Panel:**
```
❌ Table Not Found

The table "demo.employees" does not exist in the database.

💡 Suggestions:
1. Make sure you created the table first using: CREATE TABLE demo.employees (...)
2. Check if the table name is spelled correctly
3. Verify the schema name (e.g., "demo.employees")
4. View available tables in the Schema Explorer (left sidebar)
```

---

## Benefits

✅ **Clear Error Titles** - Know immediately what went wrong
✅ **Plain English** - No technical jargon
✅ **Actionable Suggestions** - Step-by-step fixes
✅ **Context-Aware** - Shows the specific table/column name
✅ **Helpful Tips** - Points to UI features that can help

---

## All Error Types Handled

1. ✅ Table Not Found (RelationUnknown)
2. ✅ Column Not Found (ColumnUnknown)
3. ✅ Syntax Errors (SQLParseException)
4. ✅ Duplicate Keys (DuplicateKey)
5. ✅ Invalid Data Types (ValidationException)
6. ✅ Null Value Violations (NullValue)
7. ✅ Connection Errors (ECONNREFUSED)
8. ✅ Timeout Errors (ETIMEDOUT)
9. ✅ Permission Errors (Unauthorized)
10. ✅ Generic Fallback (with suggestions)

---

**Every error now helps users understand WHAT went wrong and HOW to fix it!**
