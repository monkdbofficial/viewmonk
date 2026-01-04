# MonkDB: `CREATE TABLE` Statement

The `CREATE TABLE` statement is used to define a new base table in MonkDB. This table stores structured data and supports a variety of options to configure its schema, indexing behavior, partitioning, sharding, and storage parameters.

A table can consist of regular columns, generated columns, and optional table-level constraints. It may also be partitioned and distributed across multiple shards to support large-scale data storage and parallel query processing.

## SQL Statement

```sql
CREATE TABLE [ IF NOT EXISTS ] table_ident ( [
    {
        base_column_definition
      | generated_column_definition
      | table_constraint
    }
    [, ... ] ]
)
[ PARTITIONED BY (column_name [, ...] ) ]
[ CLUSTERED [ BY (routing_column) ] INTO num_shards SHARDS ]
[ WITH ( table_parameter [= value] [, ... ] ) ]
```

where `base_definition` means

```sql
column_name data_type
[ DEFAULT default_expr ]
[ column_constraint [ ... ] ]  [ storage_options ]
```

where `generated_column_definition` is 

```sql
column_name [ data_type ] [ GENERATED ALWAYS ]
AS [ ( ] generation_expression [ ) ]
[ column_constraint [ ... ] ]
```

where `column_constraint` is

```sql
{ [ CONSTRAINT constraint_name ] PRIMARY KEY |
  NULL |
  NOT NULL |
  INDEX { OFF | USING { PLAIN |
                        FULLTEXT [ WITH ( analyzer = analyzer_name ) ]  }
  [ CONSTRAINT constraint_name ] CHECK (boolean_expression)
}
```

where `storage_option` is

```sql
STORAGE WITH ( option = value_expression [, ... ] )
```

and `table_constraint` is

```sql
{ [ CONSTRAINT constraint_name ] PRIMARY KEY ( column_name [, ... ] ) |
  INDEX index_name USING FULLTEXT ( column_name [, ... ] )
       [ WITH ( analyzer = analyzer_name ) ]
  [ CONSTRAINT constraint_name ] CHECK (boolean_expression)
}
```

### Key Capabilities:

- **Base Columns**: Standard columns defined with a data type, optional default value, and column-level constraints such as `NOT NULL`, `PRIMARY KEY`, `CHECK`, or indexing options.

- **Generated Columns**: Virtual columns whose values are derived from other columns using expressions. These columns can optionally specify a data type and may also include constraints.

- **Constraints**:
  - **Primary Key**: Ensures uniqueness of the row(s) based on one or more columns.
  - **Check Constraint**: Enforces custom boolean conditions on column values.
  - **Nullability**: Controls whether a column can accept null values.
  - **Indexes**: Control indexing behavior at both column and table levels, including fulltext indexing with optional analyzers.

- **Partitioning**: Tables can be partitioned by one or more columns. This physically separates data into partitions based on the values in those columns, improving query performance for filtered workloads.

- **Clustering**:
  - Allows specification of a routing column to control how rows are distributed across shards.
  - The `CLUSTERED INTO` clause defines how many shards the table should be divided into.

- **Storage Options**:
  - Per-column storage parameters can be specified using `STORAGE WITH (...)`.
  - Table-level parameters can be provided using the `WITH (...)` clause to configure settings like the number of replicas, column policy, and more.

### Execution Behavior:

- If the `IF NOT EXISTS` clause is provided, MonkDB will skip creation if the table already exists, avoiding an error.
- The `CREATE TABLE` command executes immediately and registers the table in the schema metadata. Data can be inserted into the table immediately after creation.


The `CREATE TABLE` statement is used to establish a new table that starts off empty.

If the table identifier does not specify a schema, the table will be created within the default doc schema. If a schema is provided, the table will be created within that specified schema, which will be automatically created if it does not already exist.

A table is composed of one or more base columns, along with any number of generated columns and/or table constraints.

The optional constraint clauses outline the conditions that must be met by new or updated rows for operations such as `INSERT`, `UPDATE`, or `COPY FROM` to be successful. A constraint is an SQL object that defines the permissible values within the table in various manners.

Constraints can be defined in two ways: as table constraints or column constraints. A column constraint is included within the definition of a column, while a table constraint is not associated with any specific column and can apply to multiple columns. Each column constraint can also be expressed as a table constraint; however, a column constraint serves as a convenient notation when the constraint pertains solely to one column.

---

## TABLE ELEMENTS

### Base Columns

A base column refers to a permanent column within the table's metadata. In relational database terminology, it represents an attribute of the table's tuple. Each base column is characterized by a name, a data type, an optional default clause, and potential constraints.

Base columns can be both read and written to, provided that the table itself allows for writing. Values for these columns can be specified directly in Data Manipulation Language (DML) statements, or they may be left unspecified, resulting in a null value.

#### Default Clause

The optional default clause specifies the default value for a column. This value is automatically inserted when an `INSERT` or `COPY FROM` statement targets the column without providing an explicit value.

The expression in the default clause must be free of variables, meaning that subqueries and references to other columns are prohibited.

Default values are not allowed for columns of type `OBJECT`.

```sql
CREATE TABLE tbl (obj OBJECT DEFAULT {key='foo'})
```

```bash
MonkSQLParseException[Default values are not allowed for object columns: obj]
```

However, such references are permitted for sub-columns of an object column. If an object column contains at least one child with a default expression, it will implicitly generate the complete object, unless it is part of an array.

Some of the examples are:

```sql
CREATE TABLE object_defaults (id int, obj OBJECT AS (key TEXT DEFAULT ''))
CREATE OK, 1 row affected  (... sec)
```

```sql
INSERT INTO object_defaults (id) VALUES (1)
INSERT OK, 1 row affected  (... sec)
```

```sql
REFRESH TABLE object_defaults
REFRESH OK, 1 row affected  (... sec)
```

```sql
SELECT obj FROM object_defaults
+-------------+
| obj         |
+-------------+
| {"key": ""} |
+-------------+
SELECT 1 row in set (... sec)
```

### Generated Columns

A generated column is a persistent column whose value is calculated on demand using the generation_expression during each `INSERT`, `UPDATE`, and `COPY FROM` operation.

The inclusion of the `GENERATED ALWAYS` clause in the syntax is optional.

> It is important to note that a generated column differs from a virtual column. Unlike a virtual column, the computed value of a generated column is stored in the table as a regular base column would be. The key distinction lies in the automatic calculation of its value.

### Table Constraints

Table constraints refer to restrictions that are imposed on multiple columns or on the entire table.

Check these links for more details.

- [Table Constraints](../10_monkdb_sql_constraints.md)
- [CHECK constraints](../10_monkdb_sql_constraints.md/#check)

### Column Constraints

Column constraints refer to restrictions that are imposed on individual columns of a table independently.

Check these links for more details.

- [Column Constraints](../10_monkdb_sql_constraints.md)
- [CHECK constraints](../10_monkdb_sql_constraints.md/#check)

### Storage Options

Each column of the table can have its own distinct storage options applied.

---

## Parameters

- **table_ident**- The name of the table to be created, which may optionally include a schema qualification.
- **column_name**- The designation of a column intended for creation in the new table.
- **data_type**- The type of data represented by the column, which may encompass array and object designations.
- **generation_expression**- An expression, typically a function call, that is utilized within the context of the current row. Consequently, it has the ability to reference other base columns within the table. However, it does not support referencing other generated columns, including itself. The generation expression is assessed each time a new row is added or when the referenced base columns are modified.

---

## `IF NOT EXISTS`

If the optional `IF NOT EXISTS` clause is included, this statement will have no effect if the table already exists, resulting in the return of 0 rows.

## `CLUSTERED`

The optional `CLUSTERED` clause indicates the method by which a table is to be allocated throughout a cluster.

```sql
[ CLUSTERED [ BY (routing_column) ] INTO num_shards SHARDS ]
```

**Parameters**:

- **num_shards**:

Indicates the quantity of shards allocated for storing a table, which must exceed zero. In the absence of this specification, the number of shards is determined by the count of active data nodes currently in operation, using the following formula:

```python
num_shards = max(4, num_data_nodes * 2)
```

The minimum value for `num_shards` is established at 4. Consequently, if the computed value of `num_shards` does not surpass this minimum threshold, the default value of 4 will be applied to each table or partition.

- **routing_column**: 

Identify a routing column that dictates the sharding of rows.

Rows sharing the same value in the routing column are allocated to the same shard. In cases where a primary key is established, it will serve as the default routing column; if not, the internal document ID will be utilized instead.

## `PARTITIONED BY`

The `PARTITIONED` clause divides the newly created table into individual partitions based on each unique combination of row values found in the designated partition columns.

```sql
[ PARTITIONED BY ( column_name [ , ... ] ) ]
```

- **column_name**: 

A column name designated for partitioning purposes. If multiple column names are to be included, they should be listed within parentheses and separated by commas.

The subsequent limitations are in effect:

1. Partition columns cannot be included in the `CLUSTERED` clause.
2. Partition columns are required to consist solely of primitive data types.
3. Partition columns must not be located within an object array.
4. Partition columns are prohibited from being indexed using a full-text index with an analyzer.
5. In cases where the table has a `PRIMARY KEY` constraint, it is mandatory for all partition columns to be incorporated in the primary key definition.

> Partition columns cannot be and should not be altered by an `UPDATE` statement.

## `WITH`

The optional `WITH` clause allows for the specification of parameters pertaining to tables.

```sql
[ WITH ( table_parameter [= value] [, ... ] ) ]
```

- **table_parameter**: 

This flag specifies an optional parameter for the table.

> Certain parameters are hierarchical and must be enclosed in double quotes to be properly configured. For instance: `WITH ("allocation.max_retries" = 5)`. Hierarchical parameters are identified by the presence of a period between the names of the parameters (e.g., `write.wait_for_active_shards`).

### Supported Parameters

- **number_of_replicas**: 

Indicates the quantity or range of replicas required for each shard of a table to function properly, with the default setting being `0-1` replica.

The definition of the number of replicas is as follows:

```sql
min_replicas [ - [ max_replicas ] ]
```

where,

**min_replicas**: The minimum number of replicas required for the created table.
**max_replicas**: The maximum number of replicas for the created table.

The true upper limit on the number of replicas is determined by the greater value between num_replicas and `N-1`, with `N` representing the total count of data nodes within the cluster. If `max_replicas` is set to the string "`all`" it will consistently equal `N-1`.

When a value is specified as a range or the default value of `0-1` is applied, the limits set by `cluster.max_shards_per_node` and `cluster.routing.allocation.total_shards_per_node` pertain solely to primary shards. Consequently, these limits do not consider any potential additional replicas, which means that the total number of shards may surpass these specified limits.

- **number_of_routing_shards**:

This figure indicates the hashing space utilized internally for the distribution of documents among shards. This setting is optional and allows users to subsequently augment the number of shards through the `ALTER TABLE` command. In the absence of an explicit configuration, it defaults to a value determined by the number of shards specified in the `CLUSTERED` setting. This default configuration permits the doubling of shards each time, with a cap of **1024** shards per table.

> It is not possible to update this setting after the table has been created.

- **refresh_table**: 

In MonkDB, newly written records are not instantly accessible. Users must either execute the `REFRESH` statement or wait for an automatic background refresh to occur. The timing for this background refresh is determined by the `refresh_interval` setting, which is measured in milliseconds.

If not explicitly set, the default behavior refreshes tables every second, provided the table is not idle. A table is considered idle if it has not been accessed by any query for over **30 seconds**.

When a table is idle, the automatic refresh is temporarily paused. However, executing a query on an idle table will initiate a refresh and reactivate the automatic refresh process.

When the refresh_interval is explicitly defined, the table will refresh regardless of its idle status. To revert to the default behavior of a **1-second** refresh and freeze-on-idle functionality, use the `ALTER TABLE RESET` command.

**value**- The refresh interval is measured in milliseconds. Setting a value of `0` or less disables the automatic refresh feature. Conversely, a value greater than `0` initiates a scheduled periodic refresh of the table.

> Setting a `refresh_interval` to 0 does not ensure that new writes remain hidden from subsequent reads. It merely disables the periodic refresh. Other internal mechanisms may still initiate a refresh.

> In the case of partitioned tables, the idle mechanism operates on a per-partition basis. This feature is particularly beneficial for time-based partitions, which are infrequently accessed as they age. However, a potential drawback arises when numerous partitions are idle, and a query triggers their activation, leading to a sudden increase in refresh load. If you encounter this type of access pattern, it may be advisable to establish a specific refresh_interval to ensure a continuous background refresh.

- **write.wait_for_active_shards**: 

Indicates the required number of active shard copies necessary for write operations to continue. If there are fewer active shard copies, the operation will pause and attempt to retry for a maximum of **30 seconds** before timing out.

**value**- A value can be any positive integer up to the total count of configured shard copies (`number_of_replicas + 1`). When the value is set to `1`, it indicates that only the primary shard needs to be active. If the value is `2`, both the primary and one replica shard must be active, and this pattern continues accordingly. The default setting is `1`. The term `all` is a special designation indicating that all shards, including both primary and replicas, must be active for write operations to take place.

Enhancing the number of shard copies to wait for bolsters the system's resilience. This adjustment decreases the likelihood of write operations failing to reach the intended number of shard copies; however, it does not completely eliminate this risk, as the verification occurs prior to the initiation of the write operation.

In instances where replica shard copies miss certain writes, the system will eventually synchronize them. However, if a node containing the primary copy experiences a failure, the replica copy cannot be automatically promoted due to the risk of data loss, as the system recognizes that the replica shard has not received all the writes. In such cases, the command `ALTER TABLE .. REROUTE PROMOTE REPLICA` can be employed to force the promotion of a stale replica copy, allowing for the recovery of any data that is present in that copy.

Consider a scenario with a three-node cluster and a table configured with one replica. With the setting `write.wait_for_active_shards=1` and `number_of_replicas=1`, a node in the cluster can be restarted without disrupting write operations, as the primary copies remain active or the replicas can be swiftly promoted.

Conversely, if `write.wait_for_active_shards` is adjusted to `2` and a node is halted, write operations will be blocked until the replica is fully synchronized again, or they may time out if the replication process is not sufficiently rapid.

- **blocks.read_only**:

Enables a read-only table.

**value**: The table becomes `read-only` when the value is set to true. If set to false, it permits writing and modifications to the table settings.

- **blocks.read_only_allow_delete**: 

Enables the creation of a read-only table that can also be deleted.

**value**: The table is designated as `read-only` and can be deleted if the value is set to true. If set to false, it permits writing and modifications to table settings. This flag should not be manually adjusted, as it is automatically managed by the system that safeguards MonkDB nodes from depleting available disk space.

When a node's disk usage surpasses the `cluster.routing.allocation.disk.watermark.flood_stage` threshold, this restriction is activated (set to true) for all tables on the impacted node. Once disk space is cleared and the usage falls below the threshold, the setting is automatically reverted to false for the affected tables.

> When performing maintenance tasks, it may be necessary to **temporarily disable read and write operations**, as well as changes to table settings. To do this, utilize the appropriate settings: `blocks.read`, `blocks.write`, `blocks.metadata`, or `blocks`.read_only. Remember to **manually reset these settings** once the maintenance is finished.

- **blocks.read**:

To manage read operations for a table.

**value**- Set to `true` to disable all read operations; set to `false` to enable them.

- **blocks.write**:

Disable or enable all write operations

**value**: Set to `true` to prevent all write operations and modifications to table settings; set to `false` to allow them.

- **blocks.metadata**: 

Modify the table settings adjustments.

**values**: Setting this option to `true` will prevent any changes to the table settings. On the other hand, if set to `false`, changes to the table settings will be allowed.

- **soft_deletes.enabled**:

Specifies the status of soft deletes, indicating if they are enabled or disabled. Soft deletes enable MonkDB to retain recently deleted entries in the Lucene index, which is essential for shard recovery. Prior to the implementation of soft deletes, MonkDB relied on the Translog to keep this information. The use of soft deletes is more storage-efficient and offers improved speed compared to the Translog method. In the current versions, soft deletes are a requirement, making this setting unchangeable. It will consistently be set to true. This setting will be eliminated in future versions.

- **soft_deletes.retention_lease.period**:

The longest duration for which a retention lease remains valid before it is deemed expired is as follows:

**value**: `12 hours` (default). Any positive time value is permissible.

MonkDB occasionally needs to replicate operations performed on one shard to other shards. For instance, if a shard copy becomes temporarily unavailable while write operations continue on the primary copy, the operations that were missed must be replayed once the shard copy is accessible again.

When soft deletes are activated, MonkDB utilizes a feature from Lucene to retain recent deletions in the Lucene index for potential replay. As a result, deleted documents still consume disk space, which is why MonkDB only retains a limited number of recently deleted documents. Eventually, MonkDB will completely remove these deleted documents to prevent the index from expanding unnecessarily.

To manage the operations that may need to be replayed, MonkDB employs a system known as shard history retention leases. These leases help MonkDB identify which soft-deleted operations can be safely eliminated.

If a shard copy encounters a failure, it ceases to update its shard history retention lease, signaling that the soft-deleted operations should be kept for future recovery.

To avoid indefinite retention of shard leases, they expire after a specified period defined by `soft_deletes.retention_lease.period`, which is set to a default of 12 hours. Once a retention lease expires, MonkDB can discard the soft-deleted operations. If a shard copy recovers after the expiration of a retention lease, MonkDB will revert to copying the entire index, as it can no longer replay the missing history.

- **codec**:

Data is typically stored with `LZ4` compression by default. However, this setting can be modified to use `best_compression`, which employs `DEFLATE` to achieve a higher compression ratio, though it may result in slower retrieval of column values.

Options: `default` or `best_compression`

- **store.type**:

The store type configuration enables you to manage how data is stored and retrieved on disk. Once a table is created, this setting cannot be modified. The following storage types are available:

**fs**: This is the default file system implementation, which selects the most suitable option based on the operating environment. Currently, it utilizes `hybridfs` across all supported systems, though this may change in the future.

**niofs**: The NIO FS type saves the shard index on the file system (Lucene NIOFSDirectory) using NIO technology, allowing multiple threads to read from the same file simultaneously.

**mmapfs**: The MMap FS type stores the shard index on the file system (Lucene MMapDirectory) by mapping a file into memory (mmap). This method consumes a portion of your process's virtual memory address space equivalent to the size of the mapped file. Ensure that you have sufficient virtual address space before opting for this type.

**hybridfs**: The hybridfs type combines features of both niofs and mmapfs, selecting the most appropriate file system type for each file based on the read access pattern. Like mmapfs, ensure that ample virtual address space is available.

You can limit the use of mmapfs and hybridfs storage types through the `node.store.allow_mmap` node setting.

- **mapping.total_fields.limit**:

Establishes the upper limit on the number of columns permitted in a table, with a default setting of `1000`.

**value**: The highest number of fields allowed in the Lucene index mapping, encompassing both user-visible columns and internal fields.

- **translog.flush_threshold_size**:

Adjusts the size of the transaction log before it is flushed.

**value**: Size (in bytes) of the transaction log.

- **translog.sync_interval**:

The frequency at which the translog is synchronized to disk is set to a default of `5 seconds`. When determining this interval, it is important to consider that any changes recorded during this period that have not been synced to disk could be lost in the event of a failure. This configuration is applicable only when `translog.durability` is configured to `ASYNC`.

**value**: Interval measured in *milliseconds*.

- **translog.durability**:

When configured to `ASYNC`, the translog is periodically flushed to disk in the background at intervals defined by `translog.sync_interval`. In contrast, when set to `REQUEST`, the flush occurs following each operation.

Options available: `REQUEST` (default), `ASYNC`

- **routing.allocation.total_shards_per_node**:

Regulates the maximum quantity of shards (both replicas and primaries) that can be assigned to a single node. The default setting is unbounded (-1).

**value**: Quantity of shards permitted per node.

- **routing.allocation.enable**:

Manages shard allocation for a designated table. The options available are:

**all**: Permits shard allocation for all shards. (Default setting)
**primaries**: Permits shard allocation exclusively for primary shards.
**new_primaries**: Permits shard allocation solely for primary shards associated with new tables.
**none**: Prohibits any shard allocation.

- **allocation.max_retries**:

Specifies the maximum number of attempts to allocate a shard before abandoning the effort and leaving it unallocated.

**value**: Number of retries allowed for shard allocation, with a default setting of `5`.

- **routing.allocation.include.{attribute}**

Assign the table to a node that possesses at least one of the values listed in the comma-separated `{attributes}`. This configuration takes precedence over the associated cluster setting for the specified table, causing it to disregard the cluster setting entirely.

- **routing.allocation.require.{attribute}**

Assign the table to a node that possesses all the comma-separated values in the specified `{attribute}`. This configuration takes precedence over the associated cluster setting for the table, causing it to disregard the cluster setting entirely.

- **routing.allocation.exclude.{attribute}**

Assign the table to a node that does not possess any of the comma-separated values in the `{attribute}`. This configuration takes precedence over the associated cluster setting for the specified table, causing it to disregard the cluster setting entirely.

- **unassigned.node_left.delayed_timeout**:

Postpone the assignment of replica shards that are unassigned due to a node's departure. The default delay is set to `1m` (minute), allowing sufficient time for the node to fully restart, especially if it manages a large number of shards. By setting the timeout to `0`, allocation will commence immediately. This configuration can be adjusted during runtime to modify the delay for allocation as necessary.

- **column_policy**:

Defines the column policy for the table, with the default setting being strict.

The column policy is outlined as follows:

```sql
WITH ( column_policy = {'dynamic' | 'strict'} )
```

**strict**: Any column that is not specified in the schema will be rejected during `INSERT`, `UPDATE`, or `COPY FROM` operations.

**dynamic**: It is possible to introduce new columns through `INSERT`, `UPDATE`, or `COPY FROM`. Once these new columns are added to dynamic tables, they function like regular columns, allowing for retrieval, sorting, and use in `WHERE` clauses.

- **max_ngram_diff**:

Indicates the largest allowable difference between `max_ngram` and `min_ngram` when utilizing the `NGramTokenizer` or the `NGramTokenFilter`. The default setting is `1`.

- **max_shingle_diff**:

Indicates the maximum allowable difference between `min_shingle_size` and `max_shingle_size` when utilizing the `ShingleTokenFilter`. The default value is set to `3`.

- **merge.scheduler.max_thread_count**:

The highest number of threads that can be concurrently merging on a single shard is defined by default as `Math.max(1, Math.min(4, Runtime.getRuntime().availableProcessors() / 2))`. This setting is optimal for a reliable solid-state drive (SSD). However, if your index is stored on traditional hard disk drives, it is advisable to reduce this number to `1`.


## Additional Example for Full Coverage

```sql
CREATE TABLE IF NOT EXISTS metrics (
    id TEXT PRIMARY KEY,
    ts TIMESTAMP WITH TIME ZONE NOT NULL,
    value DOUBLE PRECISION,
    day AS date_trunc('day', ts) STORED,
    metadata OBJECT AS (
        device TEXT DEFAULT 'unknown'
    )
)
PARTITIONED BY (day)
CLUSTERED INTO 6 SHARDS
WITH (
    number_of_replicas = '1',
    refresh_interval = '1000',
    column_policy = 'strict'
);
```

## 🔐 Permissions

- **Create Table**:
    - Requires the `CREATE` privilege on the schema in which the table is being created.
    - If the schema does not exist and is being created implicitly, the user must also have `CREATE` privileges at the database level.

- **Modify Table Settings via WITH Clause**:
    - Requires `ALTER` privileges on the table once it is created.

- **Insert/Update Operations**:
    - Require appropriate DML privileges (`INSERT`, `UPDATE`, etc.) after the table is created.

- **Ownership**:
    - The user creating the table becomes its owner and can later grant or revoke privileges on it.

> 🔒 Note: Certain operations like setting cluster-level table allocation or advanced shard settings may require Admin-Level (AL) privileges depending on deployment policy.

---

## 🏁 Summary

| Feature                                | Supported / Description                                                                 |
|----------------------------------------|------------------------------------------------------------------------------------------|
| Base and Generated Columns             | ✅ Yes – with default values, constraints, and storage options                           |
| Partitioning Support                   | ✅ Yes – `PARTITIONED BY` clause with restrictions                                       |
| Sharding Control                       | ✅ Yes – via `CLUSTERED INTO ... SHARDS` and optional routing column                    |
| Full Constraint Support                | ✅ Includes `PRIMARY KEY`, `CHECK`, `NOT NULL`, and `INDEX`                              |
| Fulltext Indexing                      | ✅ Yes – `FULLTEXT` with optional analyzers                                              |
| Storage Options                        | ✅ Yes – via `STORAGE WITH` at column level and `WITH` at table level                   |
| Default Values                         | ✅ Yes (except for `OBJECT` columns)                                                     |
| Generated Columns                      | ✅ Yes – `GENERATED ALWAYS AS`                                                           |
| Column & Table Constraints             | ✅ Yes – including `CHECK`, `PRIMARY KEY`, and custom indexes                            |
| Refresh Behavior                       | ✅ Controlled via `refresh_interval` and idle refresh optimizations                      |
| Table Write Controls                   | ✅ Via `blocks.read_only`, `blocks.write`, `blocks.metadata`, etc.                       |
| Replica Management                     | ✅ Supports `number_of_replicas`, `write.wait_for_active_shards`                        |
| Advanced Disk & Allocation Settings    | ✅ Includes `store.type`, `routing.allocation.*`, `allocation.max_retries`, etc.         |
| Performance Tweaks                     | ✅ Includes `codec`, `translog.*`, `merge.scheduler.max_thread_count`, etc.             |
| Column Policy                          | ✅ Supports `strict` and `dynamic` policies                                               |
| Requires Create Privileges             | ✅ Yes                                                                                    |
| Schema Auto-Creation                   | ✅ Yes – if schema doesn’t exist, and privileges allow                                    |
| Table Ownership                        | ✅ The creator becomes the owner and can manage permissions                              |

--- 

## See Also

- [Alter Table](./17_ALTER_TABLE.md)
- [Drop Table](./54_DROP_TABLE.md)
- [Show Create Table](./74_SHOW_CREATE_TABLE.md)