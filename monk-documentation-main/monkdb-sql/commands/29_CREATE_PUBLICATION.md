# MonkDB: `CREATE PUBLICATION` Statement

The `CREATE PUBLICATION` statement is used to define a new publication in the current cluster. A publication represents a group of tables whose data changes can be replicated to other clusters (subscribers) using logical replication.

---

## SQL Statement

```sql
CREATE PUBLICATION name
{ FOR TABLE table_name [, ...] | FOR ALL TABLES }
```

---

## Description

The `CREATE PUBLICATION` statement adds a new publication to the current cluster. Publications serve as the upstream side of logical replication, enabling subscribers to replicate data changes from the publishing cluster.

### Key Features:
- **Unique Name:** The publication name must be distinct from other publications in the cluster.
- **Table Inclusion:** You can specify individual tables (`FOR TABLE`) or include all tables in the cluster (`FOR ALL TABLES`).
- **Dynamic Updates:** Tables can be added or removed from a publication after its creation using `ALTER PUBLICATION`.
- **Replication Scope:** All operation types (`INSERT`, `UPDATE`, `DELETE`, and schema changes) are replicated for tables included in the publication.

### Limitations:
- **System and Foreign Tables:** System tables and foreign tables cannot be included in a publication. Attempting to include them results in an error.
- **Replication Start:** Creating a publication does not start replication; a subscription must be created on the subscriber cluster.

---

## Parameters

| Parameter       | Description                                                                 |
|-----------------|-----------------------------------------------------------------------------|
| **name**        | The unique name of the publication.                                        |
| **FOR TABLE**   | Specifies a list of tables to include in the publication. Partitions of partitioned tables are implicitly included. |
| **FOR ALL TABLES** | Marks the publication to replicate all tables in the cluster, including future tables. |

---

## Examples

### Example 1: Create a Publication for Specific Tables
Create a publication named `my_publication` that includes two specific tables:

```sql
CREATE PUBLICATION my_publication
FOR TABLE users, orders;
```

This publication will replicate changes for the `users` and `orders` tables.

---

### Example 2: Create a Publication for All Tables
Create a publication named `all_tables_publication` that replicates changes for all tables in the cluster:

```sql
CREATE PUBLICATION all_tables_publication
FOR ALL TABLES;
```

Future tables created in the cluster will also be included in this publication.

---

### Example 3: Create an Empty Publication
Create a publication named `empty_publication` without any initial tables:

```sql
CREATE PUBLICATION empty_publication;
```

Tables can be added later using `ALTER PUBLICATION`.

---

### Example 4: Using ALTER PUBLICATION to Add Tables
Add more tables to an existing publication:

```sql
ALTER PUBLICATION my_publication ADD TABLE products, categories;
```

---

## Notes

1. **Privileges Required:** 
   - To create, alter, or drop a publication, you need `AL` (Admin Level) privileges on the cluster.
   - To add tables to a publication, you must have `DQL`, `DML`, and `DDL` privileges on those tables.
2. **Subscriber Privileges:** 
   - The user connecting to the publisher must have `DQL` privileges on published tables.
3. **Network Setup:** Ensure network connectivity between clusters for successful replication.
4. **Monitoring Publications:** 
   - Use system views like `information_schema.publications` to list publications.
   - More detailed information about replicated tables can be found in related monitoring views.

---

## 🔐 Permissions

- **Creating a Publication**:
  - Requires `AL` (Admin Level) privileges on the cluster.
- **Adding Tables to a Publication**:
  - Requires ownership of the table **or** the combination of `DQL`, `DML`, and `DDL` privileges on the tables being published.
- **Subscription Access (Remote)**:
  - The user connecting to the publishing cluster must have `DQL` privileges on the published tables.
- **Altering or Dropping a Publication**:
  - Requires `AL` privileges on the cluster.
- **FOR ALL TABLES**:
  - Can only be used by superusers, as it grants broad data access.

---

## 🏁 Summary

| Feature                          | Supported / Required                                                  |
|----------------------------------|------------------------------------------------------------------------|
| Replication Support              | ✅ Logical replication only                                            |
| Add/Remove Tables Dynamically    | ✅ Yes, via `ALTER PUBLICATION`                                       |
| Partition Support                | ✅ Partitions included implicitly                                      |
| FOR ALL TABLES                   | ✅ Superuser only                                                     |
| System/Foreign Tables Allowed    | ❌ Not supported                                                      |
| Requires Admin Privileges        | ✅ Yes (`AL`)                                                         |
| Requires Table-Level Privileges  | ✅ `DQL`, `DML`, `DDL` (to add tables)                                |
| Replication Triggered By         | ❌ `CREATE PUBLICATION` does not start replication                    |
| Subscriber Setup Required        | ✅ Yes, via `CREATE SUBSCRIPTION` on subscriber cluster                |

---

## See Also

- [Create Subscription](./34_CREATE_SUBSCRIPTION.md)
- [Drop publication](./48_DROP_PUBLICATION.md)