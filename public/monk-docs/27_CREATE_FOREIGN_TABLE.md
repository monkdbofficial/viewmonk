# MonkDB: `CREATE FOREIGN TABLE` Statement

The `CREATE FOREIGN TABLE` statement is used to define a new foreign table, which acts as a view onto data stored in an external system. This allows seamless querying of remote data as if it were part of the local MONKDB database.

---

## SQL Statement

```sql
CREATE FOREIGN TABLE [ IF NOT EXISTS ] table_ident ([
  { column_name data_type }
    [, ... ]
])
  SERVER server_name
[ OPTIONS ( option 'value' [, ... ] ) ]
```

---

## Description

The `CREATE FOREIGN TABLE` statement creates a foreign table that maps to data in an external system. Foreign tables are useful for integrating MONKDB with other databases or external data sources.

### Key Features:
- **Foreign Data Wrappers (FDWs):** MONKDB uses FDWs to manage connections and retrieve data from external systems.
- **Server Dependency:** A foreign table must be associated with a previously created foreign server using the `CREATE SERVER` statement.
- **Schema Integration:** Foreign tables are listed in `information_schema.tables` and `information_schema.foreign_tables`.
- **Permission Requirements:** Creating a foreign table requires `AL` (Admin Level) permissions on the schema or cluster level.

**Note:** Foreign tables cannot be included in `CREATE PUBLICATION` for logical replication.

---

## Clauses

### **IF NOT EXISTS**
Prevents errors if the foreign table already exists. If the table exists, no action is taken.

### **OPTIONS**
Defines key-value pairs specific to the foreign data wrapper for configuring the connection to the external system.

| Option         | Description                                                                 |
|----------------|-----------------------------------------------------------------------------|
| **schema_name**| Specifies the schema name in the foreign system. Defaults to the local schema name. |
| **table_name** | Specifies the table name in the foreign system. Defaults to the local table name. |

---

## Examples

### Example 1: Creating a Foreign Server
Before creating a foreign table, you must define a foreign server:

```sql
CREATE SERVER my_postgresql FOREIGN DATA WRAPPER jdbc
OPTIONS (url 'jdbc:postgresql://example.com:5432/my_database');
```

This defines a connection to a PostgreSQL database using the JDBC wrapper.

---

### Example 2: Creating a Foreign Table
Create a foreign table that maps to a PostgreSQL table named `customers`:

```sql
CREATE FOREIGN TABLE public.customers (
    customer_id INT PRIMARY KEY,
    name TEXT,
    email TEXT
)
SERVER my_postgresql
OPTIONS (schema_name 'public', table_name 'customers');
```

This maps the structure of the PostgreSQL `customers` table into MONKDB.

---

### Example 3: Querying a Foreign Table
Once created, you can query the foreign table like any other MONKDB table:

```sql
SELECT * FROM public.customers WHERE name = 'John Doe';
```

---

### Example 4: Using IF NOT EXISTS
To avoid errors if the table already exists:

```sql
CREATE FOREIGN TABLE IF NOT EXISTS public.orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    total_amount DOUBLE
)
SERVER my_postgresql
OPTIONS (schema_name 'public', table_name 'orders');
```

---

## Notes

1. **Server Dependency:** A foreign server must be created before defining a foreign table.
2. **User Mapping:** You may need to map MONKDB users to users in the external system using `CREATE USER MAPPING`.
   ```sql
   CREATE USER MAPPING FOR monkdb SERVER my_postgresql OPTIONS ("user" 'admin', password 'secret');
   ```
3. **Schema and Table Name Differences:** Use `schema_name` and `table_name` options if schema or table names differ between MONKDB and the external system.
4. **Limitations:** Foreign tables cannot participate in logical replication (`CREATE PUBLICATION`).
5. Only PostgreSQL is supported as external database as of now. 

--- 

## 🔐 Permissions

- **Create Foreign Table**: Requires `CREATE` privilege on the schema where the table will reside.
- **Foreign Server Access**: The user must have `USAGE` privileges on the referenced foreign server.
- **User Mapping**: If the external system requires authentication, a valid user mapping (`CREATE USER MAPPING`) must exist or be created.
- **Admin Rights**: Creating foreign tables at the cluster or multi-schema level may require admin-level (`AL`) privileges.

> ⚠️ Permissions on the foreign system (e.g., PostgreSQL) must also be granted for the mapped user (e.g., `SELECT` privileges on external tables).

---

## 🏁 Summary

| Feature                     | Supported / Required                                               |
|-----------------------------|---------------------------------------------------------------------|
| Foreign Server Required     | ✅ Must exist (`CREATE SERVER`) before creating foreign table       |
| Schema/Table Remapping      | ✅ Via `OPTIONS (schema_name, table_name)`                          |
| Authentication              | ✅ Via `CREATE USER MAPPING`                                        |
| Queryable via SQL           | ✅ SELECT/WHERE/JOINS (read-only access)                            |
| Logical Replication Support | ❌ Not supported                                                    |
| Supported FDW Backends      | ✅ PostgreSQL (via JDBC FDW)                                        |
| Permissions Required        | `CREATE` on schema, `USAGE` on server, possibly `AL` at cluster level |

---

## See Also:

- [Create Server](./32_CREATE_SERVER.md)
- [Alter Server](./16_ALTER_SERVER.md)
- [Drop a foreign table](./46_DROP_FOREIGN_TABLE.md)
- [Show Create Table](./74_SHOW_CREATE_TABLE.md)