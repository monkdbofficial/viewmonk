# MonkDB: `CREATE USER MAPPING` Statement

Establish a user mapping for an external server.

---

## SQL Statement

```sql
CREATE USER MAPPING [ IF NOT EXISTS ] FOR { user_name | USER | CURRENT_ROLE | CURRENT_USER }
    SERVER server_name
    [ OPTIONS ( option value [ , ... ] ) ]
```

---

## Description

`CREATE USER MAPPING` is a Data Definition Language (DDL) command that associates a MonkDB user with a user on an external server.

Before establishing a user mapping, you need to create a foreign server using the `CREATE SERVER` command.

The user mappings you create will be utilized whenever a foreign table is accessed. In the absence of a user mapping, foreign data wrappers typically try to connect using the username of the current MonkDB user. The specifics of this process depend on the implementation of the particular foreign data wrapper. 

To create a user mapping, you must have `AL` permission at the cluster level.

User mappings can be viewed in the `user_mappings` table, along with the options available in `user_mapping_options`.

---

## Parameters

`user_name`: The designated name for the MonkDB user.
`server_name`: The name of the server associated with the user mapping creation. Refer to `CREATE SERVER` for more details.

---

## Clauses  

### USER  

Establishes a user mapping for the active user.  

Aliases: `CURRENT_USER` and `CURRENT_ROLE`. 

### OPTIONS  

**option value**:  Key-value pairs that specify user options unique to the foreign data wrapper for the server. For instance, in the case of the JDBC foreign data wrapper, the options for user and password are available.

```sql
CREATE USER MAPPING
FOR userlocalserver
SERVER userserver
OPTIONS ("user" 'myremoteuser', password '*****');
```

## Examples

1.  Mapping a Local User to a Remote User

```sql
CREATE USER MAPPING FOR local_user
SERVER my_foreign_server
OPTIONS ("user" 'remote_user', password 's3cr3t');
```

2. With `IF NOT EXISTS` Clause

```sql
CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER
SERVER my_foreign_server
OPTIONS ("user" 'remote_user', password 'mypassword');
```

This creates a mapping only if it doesn't already exist, using the currently logged-in user and the specified credentials for the foreign server.

3. Using Built-in Role Keywords

```sql
CREATE USER MAPPING FOR CURRENT_ROLE
SERVER hr_data_server
OPTIONS ("user" 'hr_readonly', password 'readonlypass');
```

This is equivalent to using `CURRENT_USER`, mapping the currently active session role to a remote identity.

4. Dynamic Mapping for Integration via JDBC Wrapper

Assume you’re connecting to a JDBC-compatible external system (PostgreSQL):

```sql
CREATE USER MAPPING FOR reporting_user
SERVER analytics_jdbc_server
OPTIONS (
    "user" 'analytics_reader',
    password 'securepass123',
    "jdbc.driver" 'org.postgresql.Driver',
    "jdbc.url" 'jdbc:postgresql://remotehost:5432/analyticsdb'
);
```

This shows how wrapper-specific options (like jdbc.driver, jdbc.url) can be used along with credentials.

---
## 🔐 Permissions

- **Creating a User Mapping**:
  - Requires `AL` (Admin Level) privileges on the cluster.
  
- **Accessing Foreign Tables**:
  - A user mapping must exist for the MonkDB user to access foreign tables via the associated foreign server.

- **Modifying or Dropping Mappings**:
  - Only the user who created the mapping (or a superuser) can modify or drop it.

> 🔒 Security Tip: Avoid storing passwords in plain text within scripts or version control. Use secret management systems or secure runtime configurations wherever possible.

---

## 🏁 Summary

| Feature                           | Supported / Required                                                |
|-----------------------------------|---------------------------------------------------------------------|
| Required for Foreign Table Access | ✅ Yes (maps local user to remote identity)                         |
| Server Must Exist                 | ✅ Yes (defined via `CREATE SERVER`)                                |
| Username Resolution               | ✅ Supports `user_name`, `CURRENT_USER`, `USER`, `CURRENT_ROLE`     |
| Credential Options                | ✅ Yes (`"user"`, `password`, or wrapper-specific options)          |
| Requires Admin Privileges         | ✅ Yes (`AL`)                                                       |
| Viewable via System Tables        | ✅ Yes (`user_mappings`, `user_mapping_options`)                    |
| Supports `IF NOT EXISTS`          | ✅ Yes                                                              |
| Can Be Dropped                    | ✅ Yes (with `DROP USER MAPPING`)                                   |

---

## See Also

- [Create User](./37_CREATE_USER.md)
- [Alter User](./18_ALTER_USER.md)
- [Create Server](./32_CREATE_SERVER.md)
- [Drop User Mapping](./56_DROP_USER_MAPPING.md)