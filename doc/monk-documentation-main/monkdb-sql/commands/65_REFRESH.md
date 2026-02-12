# MonkDB: `REFRESH` Statement

The `REFRESH` command in MonkDB is used to explicitly refresh one or more tables, ensuring that all changes made to the table are visible to subsequent queries.

## SQL Statement

```sql
REFRESH TABLE (table_ident [ PARTITION (partition_column=value [, ...])] [, ...] )
```

## Description

The command refreshes tables or specific partitions of partitioned tables.
- By default, MonkDB periodically refreshes tables based on the `refresh_interval` parameter (default is 1000ms). However, manual refreshes can be triggered using this command.
- Without an explicit `REFRESH`, changes from `INSERT`, `UPDATE`, or `DELETE` might not be visible immediately due to MonkDB's eventual consistency model.
- Refreshing specific partitions can improve performance as refreshing all partitions can be resource-intensive.

## Parameters

- **table_ident**: The name of the table to be refreshed. It can be schema-qualified.
- **PARTITION Clause**: Used for refreshing specific partitions in a partitioned table. Requires listing all partition columns and their respective values using the syntax:

```sql
PARTITION (partition_column=value [, ...])
```

## Clauses
### PARTITION

Refreshes only the specified partition(s) of a table.

```sql
REFRESH TABLE parted_table PARTITION (day='2025-04-03');
```

If omitted, all open partitions are refreshed. Closed partitions remain unaffected.

## Performance Considerations

- Refreshing tables or partitions manually is an expensive operation and should be avoided unless necessary.
- The `refresh_interval` parameter can be adjusted to optimize performance during high-load scenarios:

```sql
ALTER TABLE table_name SET (refresh_interval = 5000);
```
- Manual refreshes are useful for applications requiring immediate visibility of changes.

## Examples

Refresh a single table

```sql
REFRESH TABLE locations;
```

Refresh multiple tables

```sql
REFRESH TABLE locations, sales_data;
```

Refresh a specific partition

```sql
REFRESH TABLE sales_data PARTITION (region='US', year=2025);
```

## Primary Key Lookups

Queries filtering on primary key values can bypass the need for manual refreshes as they directly access records:

```sql
SELECT * FROM pk_demo WHERE id = 1;
```

Using the `EXPLAIN` statement verifies whether MonkDB uses a primary key lookup (Get operator) or a general collection (Collect operator).

## Use Cases
- Applications needing immediate visibility of data changes.
- Scenarios where periodic refresh intervals are insufficient for real-time querying.
- Optimizing performance by refreshing only necessary partitions.
