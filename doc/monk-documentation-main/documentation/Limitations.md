# Limitations of MonkDB

## Note

MonkDB is designed for horizontally scalable, distributed SQL (OLAP) on large volumes of structured, semi-structured or unstructured data. To achieve high performance and scalability, especially on distributed nodes, MonkDB omits some traditional relational database features that are hard to implement efficiently in distributed systems.

If you need strict relational integrity or procedural logic inside the database, a traditional RDBMS like PostgreSQL may be more suitable. However, please note that databases like PostgreSQL, MySQL, and the likes are OLAP databases whose purposes are different when compared with OLAP databases. 

---

The below section aims to list out complete set limitations of MonkDB to root out wrong expectations.

- MonkDB is an OLAP database and **not** an OLTP database. It is neither a HTAP database. It is an OLAP database fronted by a PgWire interface.

- **Stored Procedures**- Stored procedures are precompiled collections of SQL statements stored in the database. They can be executed repeatedly, often used to encapsulate business logic, reduce client-server communication, and improve performance. MonkDB does not support stored procedures. Instead, logic should be implemented at the application layer or via custom functions using external tools (like Python or Java apps).

- **Triggers**- Triggers are automatic actions executed in response to certain events on a table (e.g., `INSERT`, `UPDATE`, `DELETE`). They’re often used for auditing, validation, or automation. MonkDB does not support triggers. Any reactive logic must be managed by the application or through external stream processing (like Kafka).

- **Sequences**- Sequences generate a series of unique numeric values, commonly used for auto-incrementing primary keys. MonkDB does not support sequences. Instead, you can rely on client-side logic for generating unique values.

- **Table Inheritance**- Table inheritance allows one table to inherit columns from another table, useful for object-relational mapping and polymorphic queries. MonkDB does not support table inheritance. All tables must be defined independently, and shared fields must be duplicated or handled in application logic.

- **Constraints**- MonkDB lacks several types of data integrity constraints that are standard in SQL databases.
    - **Unique Constraints**- They ensure that values in a column or set of columns are unique across rows. MonkDB does not enforce uniqueness constraints, even if you define them, they end being ignored. Uniqueness must be maintained at the application level.
    - **Foreign Key Constraints**- This is used to ensure referential integrity between tables, i.e., values in one table must match those in another. MonkDB does not support foreign keys. Relationships must be managed manually or by application logic. 
        - Moreover, FK constraints are apt for OLTP databases and OLAP databases as the underlying architecture is completely different. Syncing FK relationsips across a distributed cluster having multiple nodes will be heavy resource intensive operation and directly affects latency. Hence, MonkDB doesn't support FK constraints.
    - **Exclusion Constraints**- It prevents rows from having overlapping values in specified columns, often used with geometric or range types. These constraints are not supported. There’s no native way to enforce exclusivity beyond simple value matching.

- In many traditional relational databases (especially PostgreSQL), network address types such as `inet` and `cidr` are supported. These types allow you to store and manipulate IP addresses and network blocks directly in SQL. Functions and operators on these types include:
    - Comparison of IP addresses
    - Checking if an IP belongs to a subnet
    - Bitwise operations on IPs
    - Conversion between formats (e.g., text to inet)
    - Network math (e.g., incrementing addresses)

MonkDB does not support these network-specific data types (`inet`, `cidr`) or the related functions and operators. This means you cannot natively store an IP address as a special network type—only as a string (e.g., '192.168.0.1'). You cannot use network operators like:
    - << (contains)
    - >> (is contained by)
    - ~ (bitwise NOT)
    - & (bitwise AND)
    - Functions like `inet_same_family()`, `inet_merge()`, or `host()`

Instead, any logic involving IP addresses must be done manually in application code.

- A **set-returning function (SRF)** is a type of SQL function that returns multiple rows (a set of rows) instead of just a single scalar value. This is in contrast to standard SQL functions, which typically return a single value (e.g., `LENGTH('hello') → 5`). MonkDB does not support SRFs which means
    - You cannot write or use functions that return multiple rows.
    - You cannot expand arrays or JSON arrays into rows using SQL alone.
    - You cannot use PostgreSQL-like SRFs such as `unnest()`, `generate_series()`, `json_array_elements()`.

MonkDB encourages a flattened, document-style data model (like in Elasticsearch), where nested data is either kept as arrays and filtered via scalar functions, or flattened and normalized before ingestion.

- A trigger function is a special kind of function that is automatically executed (or "triggered") in response to certain events on a table. Trigger functions are called by a trigger, and they are used to define the logic that should run when a trigger fires. In PostgreSQL, for example, you create a trigger function using `CREATE FUNCTION` with a special signature, then bind it to a trigger using `CREATE TRIGGER`. MonkDB does not support trigger functions which means 
    - You cannot define trigger functions or use triggers at all.
    - There is no native mechanism to automatically run logic inside MonkDB when data changes.
    - Event-driven workflows must be managed outside of MonkDB. For example, Apache Kafka, Apache Pulsar, Debezium, and the likes.

Triggers, which involve row-level logic can *reduce performance in distributed systems*, *complicate parallel inserts/updates*, and *add complexity for distributed consistency*.

- **XML functions** in SQL are built-in functions and operators used to store, query, generate, and manipulate XML data. These functions are common in traditional relational databases like PostgreSQL, Oracle, and SQL Server, which support the XML data type and allow working with structured XML documents directly in SQL. MonkDB does not support XML functions, and it means
    - MonkDB does not support the XML data type.
    - It does not include any XML-related functions, operators, or XPath querying.
    - You cannot parse, generate, or query XML within MonkDB's SQL layer.
    - XML data may be treated as a plain string (`TEXT`), without structure awareness.

However, you may use client-side XML handling or convert XMLs to JSON based structures and leverage `OBJECT` data type of MonkDB that handles JSON workloads. 

- In traditional OLTP (Online Transaction Processing) databases like PostgreSQL, MySQL, or Oracle, transaction control is a foundational feature. It allows you to group multiple operations into a single atomic unit using commands like `BEGIN`, `COMMIT`, `ROLLBACK`. These ensure ACID compliance on the data involved. However, MonkDB is designed for analytical workloads, not transactional ones. Therefore,
    - No `BEGIN`, `COMMIT`, or `ROLLBACK`. Even if these are applied, there won't be any effect.
    - No multi-statement atomic operations.
    - Every SQL statement is auto-committed immediately
    - Changes are replicated across the cluster for durability and availability.

- This nature allows MonkDB to *high write throughput*, *scalability across nodes*, *better performance for OLAP*. However, please note that every row in MonkDB includes a hidden version number that is automatically:
    - Initialized when the row is created
    - Incremented each time the row is updated

This version number can be used to detect changes between reads and writes, which is the key to optimistic concurrency control. Optimistic Concurrency Control is a method to prevent conflicts in concurrent updates without locking rows. It works on the assumption that most updates won’t conflict. So you can *read the data and remember its version*, *modify the data*, *update the row only if the version hasn’t changed, *abort or retry if another process modified it first*.

- In traditional relational databases, system information tables (often found in the `INFORMATION_SCHEMA`) are read-only views into the metadata of the database. These tables let you query things like:
    - Available tables and columns
    - Index definitions
    - User privileges
    - Data types
    - Constraints
    - Storage engine details

These schemas are part of the SQL standard and are used for introspection understanding the structure of the database. MonkDB offers read-only system tables and an information schema, but with some important differences:

- MonkDB's `information_schema`
    - Follows the SQL standard partially, with modifications and extensions. Provides metadata about:
        - Tables, columns, constraints
        - Indexes
        - Schemas and catalogs
        - Views
- MonkDB's `sys` schema
    - MonkDB-specific, read-only schema. Offers real-time information on the cluster's internal state, including:
        - Nodes
        - Shards
        - Tables
        - Jobs (queries)
        - Health metrics
        - Cluster-wide statistics
        - Licenses information_schema

> MonkDB extends the typical SQL introspection model to support distributed and analytical workloads. Here’s a refined comparison

| **Area**                      | **Standard SQL**                                      | **MonkDB**                                                                 |
|------------------------------|--------------------------------------------------------|------------------------------------------------------------------------------|
| **Compliance with `INFORMATION_SCHEMA`** | High — follows ANSI/ISO SQL                     | **Partial** — adapted for MonkDB's distributed engine                      |
| **Schema structure**         | Flat, relational metadata only                         | Adds `sys` schema for **cluster-level and shard visibility**               |
| **Cluster statistics**       | ❌ Not available                                       | ✅ Real-time data in `sys.nodes`, `sys.jobs`, `sys.cluster`, etc.          |
| **Shards and nodes**         | ❌ Not applicable in centralized DBs                   | ✅ First-class entities (e.g., `sys.shards`, `sys.nodes`)                   |
| **Query/job visibility**     | Limited or external tools (e.g., `pg_stat_activity`)   | ✅ Native in `sys.jobs` and `sys.jobs_log`                                  |
| **License info**             | Usually external tooling                               | ✅ `sys.license` provides built-in access                                   |

- In traditional relational databases like PostgreSQL or MySQL, `ALTER TABLE` is used to modify the structure of an existing table, including:
    - Adding or dropping columns
    - Renaming columns
    - Changing column types
    - Setting or removing defaults
    - Altering constraints
        - MonkDB does not currently support the `ALTER COLUMN` action. That means
            - You cannot modify a column's type, default, or nullability.
            - You cannot rename a column using `ALTER TABLE ... RENAME COLUMN`.
            - MonkDB does support some `ALTER TABLE` operations, but column alterations are excluded.

> However, see [`ALTER TABLE`](../monkdb-sql/commands/17_ALTER_TABLE.md) command as an alternative. MonkDB is built on a distributed, schema-flexible architecture inspired by document stores like Elasticsearch. Modifying a column’s type or definition in-place across distributed shards would require *rewriting potentially massive amounts of data*, *ensuring cluster-wide consistency*, *handling schema versioning in a safe, performant way*. Rather than risk inconsistency or downtime, MonkDB opts to disable `ALTER COLUMN` entirely.

- MonkDB's [CREATE TABLE](../monkdb-sql/commands/35_CREATE_TABLE.md) statement is designed to support distributed, scalable storage and processing. It allows you to specify advanced storage and table parameters, such as sharding (splitting data into segments for distribution across nodes), replication (duplicating data for fault tolerance), and routing (controlling how data is distributed and accessed within the cluster). However, MonkDB does not support table inheritance. 
    - It means you cannot create a table that automatically inherits columns or constraints from another table, a feature found in some relational databases like PostgreSQL. 
    - This also means features like shared constraints, automatic propagation of changes, or hierarchical table structures are not available in MonkDB.
    - MonkDB is architected for horizontal scalability and distributed analytics, focusing on features like sharding and replication to handle large-scale, high-throughput workloads.
    - Table inheritance, as implemented in traditional RDBMS (e.g., PostgreSQL), is primarily useful for modeling object hierarchies or partitioning within a single-node or tightly-coupled environment. In distributed systems like MonkDB, inheritance complicates data distribution, consistency, and query execution across shards and nodes.
    - Supporting inheritance would require complex mechanisms to synchronize schema changes and constraints across distributed partitions, potentially impacting performance and scalability core priorities for MonkDB's use cases.
    
> Sharing, replication, and routing are supported in MonkDB. However, table inheritance is **not** supported MonkDB.

- MonkDB's join execution strategy has a key limitation where it does not reorder joins involving more than two tables. This means that when you write a query joining three or more tables, MonkDB will process the joins in the exact order they appear in your SQL statement, joining tables in pairs sequentially (e.g., `(r1 ⋈ r2) ⋈ r3)`). It does not attempt to find a more optimal join order that could reduce the size of intermediate result sets.
    - **Intermediate Results Size**: The order in which tables are joined can have a dramatic impact on performance. If early joins produce large intermediate results, subsequent joins become more expensive, both in terms of memory and processing time.
    - **Optimal Join Order**: Ideally, you want to join those tables first that will filter out the most data, producing the smallest possible intermediate result. For example, joining r2 ⋈ r3 first might reduce the data set more than joining `r1 ⋈ r2`, depending on the data and join conditions.
    - **Pairwise Joins**: Internally, MonkDB joins tables in pairs, following the order specified in the query. For three tables, it will always do `(r1 ⋈ r2) ⋈ r3`, never considering `(r1 ⋈ (r2 ⋈ r3))` unless you explicitly write the query that way.
    - **No Automatic Reordering**: Unlike some other database systems that analyze possible join orders to find the most efficient plan, MonkDB leaves this responsibility to the user for joins involving more than two tables.
    - **User Responsibility**: To achieve optimal performance, you must manually order your joins so that tables that most effectively reduce row counts are joined first.
    - However, there are workarounds.
        - Place the most selective joins (those that filter out the most rows) early in your join sequence.
        - Typically, join smaller tables first, especially if they can filter out large portions of the larger tables.
        - If necessary, rewrite your query or use subqueries to control the join order and optimize performance.

> Since MonkDB is distributed, large intermediate results can also mean more data shuffling between nodes, increasing network and memory costs.

- MonkDB uses a columnar storage model to optimize performance for analytical queries, especially those involving aggregations, groupings, and ordering. In this model, data for each column is stored together, which enables efficient compression and fast access for operations that scan large portions of a column.
    - When a column is stored in the Column Store, MonkDB imposes a maximum length of `32,766 bytes` for `TEXT` columns.
    - If you disable the Column Store (by setting columnstore = false and turning off indexing), this length limitation is removed, allowing insertion of longer strings into TEXT columns. However, please note that doing so would affect aggregation speed and sorting & grouping performance. Plus the storage type becomes row based. 
    - MonkDB is built on top of Apache Lucene for indexing and storage. Lucene's `DocValues` (used for Column Store) have limitations on the size of values. Storing large strings in `DocValues` is inefficient and limited in size typically up to 32KB (32,766 bytes). This is a key hard limit inherited from Lucene.
    - Column store is optimized for smaller, repetitive values (like categories, timestamps, numbers, short text), not for large blobs of text (like full HTML pages or documents).
    - Storing long strings in a column-oriented format increases memory pressure, breaks efficient compression, and can severely degrade performance during scans.
    - By capping the maximum length, MonkDB can pack values tightly, optimize memory usage, and apply compression schemes suitable for analytics workloads. Very large variable-length data (such as unbounded TEXT) complicates block management and can degrade performance for the entire column.

> You cannot disable indexing or columnstore on partition columns. This is because partitioning relies on values being easily accessible and indexed for routing data to the right shards. This limitation is common among columnar databases, as similar restrictions exist in other systems to balance storage efficiency and query speed.

- In MonkDB, aggregate functions (such as `SUM()`, `COUNT()`, `AVG()`, etc.) can only be applied to columns that have a plain index, which is the default for all primitive type columns. Additionally, using the `DISTINCT` keyword within aggregate functions (e.g., `COUNT(DISTINCT column)`) is not supported when those aggregates are used on joined tables.
    - Applying `DISTINCT` within aggregate functions on joined tables requires the database engine to first eliminate duplicates across potentially large, joined datasets before performing the aggregation. This process is computationally expensive and complex to optimize, especially in distributed or columnar databases like MonkDB.
    - The use of `DISTINCT` in aggregates increases the workload on the database server, as it must scan and compare large datasets to remove duplicates before aggregating. This can lead to significant performance degradation, particularly with joins where the intermediate result set can be very large.
    - MonkDB optimizes aggregations using plain indexes on primitive columns. When joins are involved, maintaining the necessary indexing and deduplication logic for `DISTINCT` aggregates would require additional overhead and complexity, which is currently not supported.

> This limitation is a trade-off to ensure query performance and maintainable complexity in MonkDB. Similar restrictions exist in other analytical databases, where supporting `DISTINCT` in aggregates on joins can lead to performance bottlenecks and is often avoided or limited in scope.

- The `distance(geo_point1, geo_point2)` function in MonkDB uses the Haversine formula to compute the great-circle distance between two geographic points (latitude/longitude), returning the result in meters. While powerful and commonly used in location-based queries, it has a critical precision-related limitation that can cause confusing results, especially when used differently in a `SELECT` vs. a `WHERE` clause.
    - The precision of `distance()` differs:
        - When used in the `SELECT` clause, it uses a high-precision runtime Haversine calculation.
        - When used in the `WHERE` clause, MonkDB may optimize and use the index, relying on precomputed or approximated distances (from the spatial index, often grid-based or bounding-box approximated).
    - MonkDB is built on Lucene, which
        - Uses spatial indexes (like geohash grids or prefix trees).
        - These indexes are efficient for filtering, but store location data with lower precision (rounded to nearest grid cell).
        - The `distance()` in `WHERE` uses indexed values, not raw exact coordinates.
    - In contrast, the `distance()` in `SELECT` uses raw values and a high-precision floating-point Haversine computation.
    - Avoid equality checks on distance, e.g., `WHERE distance(...) = 0` and Use a threshold instead.
    - Be aware of precision mismatch between `SELECT` and `WHERE`.
    - Use indexed distance filtering for bounding (performance), but get exact distances in `SELECT` for display or further logic.

- The `intersects(geo_shape, geo_shape)` function in MonkDB is a spatial relationship function that returns `TRUE` if two geometric shapes overlap, intersect, or one contains the other. However, it has an important limitation- **You cannot use `intersects()` in the `ORDER BY` clause**.
    - The reason for this restriction lies in how MonkDB (and its underlying engine, Apache Lucene) handles geometric shape data and spatial functions.
        - Geometric functions are boolean filters, not sortable values
            - The `intersects()` function returns a boolean value (`TRUE` or `FALSE`).
            - Sorting (`ORDER BY`) implies a sortable, ordered domain (e.g., numbers, strings, dates).
            - A boolean cannot express meaningful order for spatial relationships. There's no "less intersecting" vs. "more intersecting".
        - Geometric shapes are complex but not scalars
            - `geo_shape` values can be polygons, lines, multipolygons, etc.
            - Spatial operations like `intersects()` involve topological computations (geometry libraries like JTS or Lucene's Spatial4j) which:
                - Are not deterministic scalar outputs
                - Are not indexed in a way that supports ranking or ordering.
    - Even though `TRUE`/`FALSE` is technically sortable (`TRUE > FALSE`), MonkDB:
        - Explicitly prevents using `intersects()` in `ORDER` BY because
            - It could mislead users into thinking `intersects()` has a sortable metric like "how much" they intersect (which it does not).
            - It avoids performance traps and semantic confusion

> The geometry data type and spatial functions are designed for spatial logic, not scalar comparison.