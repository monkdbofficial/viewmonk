# MonkDB: `OPTIMIZE` Statement

The `OPTIMIZE` command in MonkDB is used to optimize tables and their partitions by merging segments, reducing their number, dropping deleted rows, and removing redundant data structures for fully replicated rows. This command is crucial for maintaining efficient data storage and query performance.

## SQL Statement

```sql
OPTIMIZE TABLE table_ident [ PARTITION (partition_column=value [ , ... ]) ] [, ...]
[ WITH ( optimization_parameter [= value] [, ... ] ) ]
```

## Description
- **Optimization Process**: The command merges segments of a table or partition, reducing their count. It also removes deleted rows and redundant data structures where possible.
- **Blocking Behavior**: The command blocks until optimization is complete. If the connection is lost, the process continues in the background, and new requests are blocked until it finishes.
- **Partition Optimization**: The `PARTITION` clause allows optimizing specific partitions. If omitted, all open partitions are optimized, which should be avoided for performance reasons.

## Parameters
- **table_ident**: The name of the table to optimize, optionally schema-qualified.

## Clauses
### PARTITION

Optimizes a specific partition of a partitioned table.

```sql
[ PARTITION ( partition_column = value [ , ... ] ) ]
```

- `partition_column`: One of the column names used for partitioning.
- `value`: The respective column value. All partition columns must be specified.

### WITH

Specifies optimization parameters.

```sql
[ WITH ( optimization_parameter [= value] [, ... ] ) ]
```
- optimization_parameter:
    - **max_num_segments**: The number of segments to merge to. Setting to `1` fully merges the table or partition.
    - **only_expunge_deletes**: Only merges segments with deletes. Defaults to false.
    - **flush**: Performs a flush after optimization. Defaults to true.
    - **upgrade_segments**: Deprecated and has no effect.

## Example

To optimize a table named `my_table`

```sql
OPTIMIZE TABLE my_table;
```

To optimize a specific partition of a partitioned table

```sql
OPTIMIZE TABLE my_partitioned_table PARTITION (date='2023-01-01');
```

To fully merge a table and perform a flush

```sql
OPTIMIZE TABLE my_table WITH (max_num_segments=1, flush=true);
```

## Best Practices
- **Avoid Optimizing Closed Partitions**: Closed partitions are not optimized by default. Avoid optimizing all partitions if possible due to performance implications.
- **Use Specific Partitions**: Use the `PARTITION` clause to optimize specific partitions for better control and efficiency.
- **Monitor Performance**: Regularly monitor table performance and optimize as needed to maintain optimal query efficiency.