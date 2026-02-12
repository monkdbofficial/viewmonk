# MonkDB: `CREATE ROLE` Statement

The `CREATE ROLE` statement is used to create a new database role in MonkDB. Roles are similar to users, but with the key distinction that they cannot directly log in to the database. Instead, roles are designed to be granted to users or other roles, allowing for hierarchical privilege management.

---

## SQL Statement

```sql
CREATE ROLE roleName
```


---

## Description

The `CREATE ROLE` statement creates a new role within the MonkDB cluster. Newly created roles do not have any privileges by default. Privileges must be explicitly granted after role creation.

### Key Differences Between Roles and Users:
- **Login Ability:** Roles cannot log in to the database, while users can.
- **Authentication:** Roles cannot be assigned a password, while users can.
- **Granting:** Roles can be granted to users or other roles, while users cannot be granted to other users or roles.

---

## Parameters

| Parameter     | Description                                                                 |
|---------------|-----------------------------------------------------------------------------|
| **roleName**  | The name of the role to create. Must be unique within the cluster.       |

---

## Examples

### Example 1: Creating a Basic Role
Create a role named `data_analyst`:

```sql
CREATE ROLE data_analyst;
```


This creates a role without any privileges.

---

### Example 2: Granting Privileges to a Role
Grant read-only privileges on a schema to the `data_analyst` role:

```sql
GRANT DQL ON SCHEMA "my_schema" TO data_analyst;
```


This allows the `data_analyst` role to execute `SELECT` statements on tables within the `my_schema` schema.

---

### Example 3: Granting a Role to a User
Grant the `data_analyst` role to a user named `john`:

```sql
GRANT data_analyst TO john;
```


This allows the user `john` to inherit the privileges associated with the `data_analyst` role.

---

### Example 4: Creating Multiple Roles
Create roles for different responsibilities:

```sql
CREATE ROLE data_engineer;
```
```sql
CREATE ROLE application_user;
```


These roles can then be granted specific privileges and assigned to relevant users.

---

## Notes

1. **Privileges Required:** Creating roles requires `AL` (Admin Level) privileges on the cluster.
2. **Role Names:** Ensure that role names are unique within the cluster.
3. **Granting Roles:** Granting a role to a user or another role allows the grantee to inherit the privileges associated with the granted role.
4. **Role Hierarchy:** You can create a hierarchy of roles, where one role is granted to another, allowing for complex privilege management.
5. **Dropping Roles:** Use the `DROP ROLE` statement to remove a role.

---

## 🔐 Permissions

- **Create Role**:
  - Requires `AL` (Admin Level) privileges on the cluster.
- **Granting Roles**:
  - Requires `GRANT` privileges on the role being granted.
- **Altering or Dropping Roles**:
  - Only superusers or role owners can drop or modify a role.
- **Role Inheritance**:
  - A user inherits all privileges of roles granted to them.
- **Self-Modification**:
  - A user can view their own role memberships using `SHOW GRANTS`.

> 🔒 Note: Since roles cannot log in, they cannot be assigned passwords or session settings (use `CREATE USER` for login-capable entities).

---

## 🏁 Summary

| Feature                    | Supported / Required                                      |
|----------------------------|-----------------------------------------------------------|
| Login Capability           | ❌ No (use `CREATE USER` for login access)               |
| Assignable to Users/Roles  | ✅ Yes                                                    |
| Can Be Granted Privileges  | ✅ Yes                                                    |
| Requires Admin Privilege   | ✅ Yes (`AL`)                                             |
| Password Support           | ❌ Not applicable                                         |
| Role Hierarchies Supported | ✅ Yes                                                    |
| Default Privileges         | ❌ None — must be granted explicitly                     |
| Droppable                  | ✅ Yes (via `DROP ROLE`)                                  |

---

## See Also

- [Drop role](./50_DROP_ROLE.md)
- [Grant](./61_GRANT.md)