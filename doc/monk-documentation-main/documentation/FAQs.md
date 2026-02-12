# Frequently Asked Questions

> **NOTE:** Please go through [limitations](Limitations.md) before reading the FAQs. This would give a rounded perspective.

## 1. Why can’t I use BEGIN or COMMIT for transactions?

MonkDB is a distributed OLAP database, optimized for high-throughput, analytical queries across sharded datasets spread across multiple nodes. In such a system:

- Traditional transaction control (`BEGIN`/`COMMIT`/`ROLLBACK`) implies maintaining atomicity and consistency across distributed nodes, which introduces latency, lock contention, and coordination overhead (e.g., two-phase commit protocols).
- Instead of row-level transactional control, MonkDB follows a **auto-commit per query** model—each query is treated as its own unit of work and is immediately visible post execution.

> **Technically**: Transaction coordination across distributed shards requires tight synchronization, and sacrifices throughput. This is acceptable in OLTP databases like PostgreSQL, but violates OLAP performance objectives where query speed and parallelization matter more than fine-grained ACID compliance.

## 2. How do I ensure uniqueness if MonkDB doesn't support `UNIQUE` constraints?

MonkDB does not enforce `UNIQUE` constraints due to the challenges of enforcing global uniqueness in a distributed system:

Enforcing uniqueness requires checking all shards or partitions before insert, which would create a serialization bottleneck, defeating the purpose of distributed writes. Therefore, uniqueness must be managed at the application layer, often via:

- Client-side UUIDs or ULIDs
- Centralized key generation services (like Snowflake ID generators)
- Hashing based on business keys (e.g., email, order ID)

> **Technically**: In distributed databases, enforcing uniqueness would mean coordinated communication among all shards (like quorum reads before writes). This is expensive and scales poorly, especially under high insert volume. Hence, such constraints are skipped in favor of horizontal scalability.

## 3. Can I use `FOREIGN KEY` to link tables like in PostgreSQL?

No, MonkDB does not support `FOREIGN KEY` constraints because:

- Foreign keys require the engine to validate referential integrity at insert/update time, which means looking up data in potentially remote shards.
- This check becomes a cross-shard consistency operation, adding network overhead, increasing latency, and risking partial failures.

> **Technically**: In distributed systems, there's no guarantee that both the referencing and referenced rows exist on the same node, which makes referential checks expensive. Hence, MonkDB encourages eventual consistency patterns, where application logic ensures relationships, or surrogate IDs are joined at query time only.

## 4. Where should I write my business logic if MonkDB doesn’t support stored procedures?

Since MonkDB doesn’t support stored procedures or triggers, you should implement business logic in:

- The application layer (backend services written in Java, Python, Go, etc.)
- ETL/ELT pipelines using Apache Kafka, Flink, or custom scripts
- Orchestrated workflows (e.g., using Airflow or dbt) to enforce business rules and data transformations outside the database

> **Technically**: Stored procedures are monolithic, hard to debug, and tightly coupled to a specific database engine. In modern cloud-native and microservice architectures, logic is increasingly written in stateless, language-agnostic services that operate via APIs. MonkDB supports this model by being a pure execution engine, leaving orchestration to external layers for flexibility and scale.

## 5. If MonkDB doesn't support triggers, how do I audit changes or enforce business rules?

In MonkDB, you must externalize reactive behavior typically handled by triggers into:

- **Application-side auditing**— Track changes in your service layer, and persist audit trails in a separate table or log store.
- **Change Data Capture (CDC) via streaming tools**— Use connectors (e.g., Kafka, Debezium, Flink) to listen to insert/update/delete operations and apply business logic downstream.
- **Immutable data models**— Instead of in-place updates, write new rows with versioning or timestamping to track changes.

> **Technically**: Triggers require row-level hooks on mutations, which disrupt bulk processing, batching, and vectorized execution. In a distributed OLAP engine, implementing triggers would either require *central coordination (which kills performance)*,*shard-local inconsistency (which kills reliability)*. Hence, MonkDB avoids in-engine reactive hooks and delegates them to event-driven architectures better suited for distributed workflows.

## 6. How do I simulate `AUTO_INCREMENT` IDs without sequences?

Since MonkDB lacks built-in sequences (due to distributed coordination overhead), here are practical alternatives:

- Client-side ID generation:
    - UUID v4 (random-based)
    - ULID or Snowflake IDs (time-sortable, unique, distributed-safe)
- Centralized ID service:
    - Maintain a microservice that generates and issues globally unique IDs.
    - Hash-based IDs from business keys (e.g., hash(email + timestamp))

> **Technically**: Sequences in RDBMS are single-node counters that do not scale well across distributed clusters. MonkDB assumes inserts can happen on any node or shard, and coordinating sequence values across them would create a central bottleneck or data skew. Distributed ID schemes remove this need and work in a lock-free, coordination-free manner.

## 7. How do I parse or query nested JSON or arrays if SRFs like unnest() aren’t available?

MonkDB does not support SRFs like unnest() or json_array_elements() because:

- These functions return sets of rows, requiring row explosion, which is inefficient in distributed, vectorized systems.

Instead, you can:

- Use scalar functions like `obj['key']`, `array_contains()`, or `obj_extract()` to filter/query specific nested values.
- Flatten arrays into multiple rows before ingestion using ETL pipelines (e.g., Python scripts, Spark, dbt).
- Store already-normalized data or separate out repeating fields into subtables for post-join analysis.

> **Technically**: In a columnar OLAP engine like MonkDB, row expansion breaks vectorized execution paths and makes sharded distribution harder. Instead of on-the-fly expansion, MonkDB favors *pre-flattened ingestion*, and *columnar filtering on arrays via scalar functions*. This allows parallel scan performance without complex in-query object traversal.

## 8. Can I build APIs that expect transaction rollback behavior?

You can, but with important constraints. MonkDB does not support transactions or rollbacks. Each statement is auto-committed. So if your API includes multiple dependent writes (e.g., insert into 3 tables), you need to:

- Handle failures in the application logic
- Use compensating actions (e.g., delete partial inserts if step 2 fails)
- Design idempotent APIs to allow safe retries

> **Technically**: OLAP systems like MonkDB sacrifice transactional atomicity to achieve high throughput, low latency writes in distributed environments. Distributed transactions (e.g., via 2PC) are slow and brittle. Instead, MonkDB encourages eventual consistency + conflict detection, and API developers must adopt fault-tolerant patterns like- *Application-managed rollbacks*, 
*outbox/inbox patterns*, and *versioned writes with optimistic concurrency control*.

## 9. What are best practices for implementing referential integrity at the application level?

Since MonkDB does not enforce foreign key (FK) constraints, ensuring referential integrity becomes the responsibility of the application logic or ETL pipelines. Best practices include

- **Upstream validation before insert**: Ensure referenced entity exists before inserting child records. For example, check if customer_id exists before inserting into orders.
- **Use consistent UUIDs or business keys**: To maintain identity across systems and avoid accidental mismatches.
- **Eventual consistency with compensating logic**: Insert operations can be designed to be rollback-safe in case the reference doesn't exist (using dead-letter queues or retry policies).
- **Schema-level conventions**: Adopt naming and structure patterns (e.g., always prefix with parent ID) to make references predictable and auditable.
- **Integrity checks via batch jobs**: Run periodic validation scripts to detect and clean orphaned records.

> **Technically**: Enforcing FK across distributed shards requires coordinated cross-node validation, which adds write latency and compromises OLAP performance. Offloading it to the application layer provides better control, monitoring, and scale.

## 10. Can I use custom functions in Python or Java with MonkDB to replace stored logic?

Yes, you can implement stored logic externally using:

- Backend services (e.g., Python Flask, FastAPI, Spring Boot) that handle:
    - Data validations
    - Conditional inserts
    - Derivation of computed values
    - Post-write reactions (e.g., triggering a Kafka message)
- User-defined transformation layers in:
    - Airflow, dbt, or custom Python scripts
    - Java Spark/Flink jobs that prepare data pre-ingestion or post-query
- For AI/analytics workflows, these services can also embed:
    - Preprocessing (e.g., tokenization, embedding generation)
    - Post-query logic (e.g., formatting, aggregation)

> **Technically**: In MonkDB, stored logic is decoupled by design. Embedding computation in external layers avoids engine bloat, enables polyglot logic, and supports CI/CD pipelines for logic versioning, unlike stored procedures that are harder to test and migrate.

## 11. How do I enforce cascading deletes or updates without FK constraints?

MonkDB doesn’t support FK constraints or `ON DELETE CASCADE` functionality. Alternative patterns include

- **Manual cascading in app logic**: When deleting a parent, the application explicitly deletes child rows across related tables.
- **Use of soft deletes**: Add `is_deleted` or `deleted_at` fields and filter accordingly.
- **Batch cleanup jobs**: Periodically remove or archive orphaned records using scheduled tasks or triggers in upstream systems.
- **Pre-delete hooks in the API layer**: Wrap delete operations inside workflows that traverse affected rows and clean related entries.

> **Technically**: Cascading operations require recursive traversal and coordination across tables, which is expensive in distributed OLAP systems. Application-level handling allows for asynchronous, scalable deletion, possibly with observability, retries, and rollback if needed.

## 12. How do I simulate ALTER COLUMN workflows in production safely?

MonkDB does not support `ALTER COLUMN`, so modifying a column’s type or default requires a multi-step migration pattern. Safe Migration Strategy:

- Add a new column with the desired schema (e.g., `amount_v2 as DOUBLE`).
- Backfill existing values from old to new column using a batch ETL job.
- Update application code to start reading/writing from the new column.
- Deprecate old column (optionally rename it or drop it after audit).
- Maintain versioned schema documentation to reflect the change.

This pattern is often called a **shadow column migration** and is commonly used in NoSQL and analytics systems.

> **Technically**: `ALTER COLUMN` requires reindexing and rewriting data across all shards, which can be unsafe or resource-heavy mid-operation. By using additive changes and versioned migration, MonkDB avoids inconsistent schema states and supports zero-downtime deployments.

## 13. How should I architect fail-safe, reactive pipelines without triggers—using tools like Kafka or Flink?

Since MonkDB does not support in-database triggers, you must shift to event-driven data pipelines. The idea is to externalize change monitoring and reactive behavior to infrastructure like Kafka, Flink, or Debezium. The architecture can be

- Kafka Connectors or CDC Adapter
    - Write-side apps emit Kafka events for every insert/update/delete (Write-Ahead).
    - Use schemas (Avro/JSON) to standardize payloads.
- Apache Flink/Faust/NiFi- These stream processors can:
    - Perform validations
    - Transform data
    - Enrich rows
    - Route events to MonkDB after enrichment
- Flink ↔ MonkDB
    - Use Flink sink connectors (MonkDB is based on pgwire. hence, postgres compatible solutions would work for MonkDB as well) or custom batch loaders.
    - Flink jobs act like intelligent triggers—decoupled, scalable, and fault-tolerant.
- Retry-safe design
    - Ensure idempotent writes using event IDs or version tokens.
    - Maintain dead-letter queues (DLQs) for poison messages.

> **Technically**: Triggers in distributed databases would cause performance issues, deadlocks, and race conditions. Stream-first pipelines scale linearly, offer exactly-once processing via checkpoints, and allow full observability—ideal for real-time and batched reactivity.

## 14. How do I implement optimistic concurrency control using the hidden version column?

MonkDB maintains a hidden version column that is

- Initialized at row creation
- Auto-incremented on each update

You can implement Optimistic Concurrency Control (OCC) using this version:

```sql
-- Step 1: Read the record with its version
SELECT id, data, _version FROM my_table WHERE id = 'abc';

-- Step 2: Update only if version matches
UPDATE my_table 
SET data = 'new_value' 
WHERE id = 'abc' AND _version = 4;
```

If `UPDATE count == 0`, it means another process already updated the row.

Best Practices:

- Always fetch `_version` when reading.
- Use the `_version` in the `WHERE` clause when updating.
- Implement retries with exponential backoff or show conflict resolution UI for manual intervention.

> **Technically**: OCC avoids locking by assuming conflicts are rare. In distributed OLAP systems, locks are expensive across nodes. Using `_version` allows safe concurrent updates without centralized locks, aligning with MonkDB’s design philosophy.

## 15. How do I manage large schema migrations if ALTER COLUMN is unsupported?

You must adopt zero-downtime, additive migration patterns

- Shadow Column Strategy
    - Add new column (e.g., total_v2 of type DOUBLE)
    - Backfill: ```sql UPDATE my_table SET total_v2 = CAST(total AS DOUBLE) WHERE total_v2 IS NULL;```
    - Update all application code to read/write to total_v2
    - Deprecate or drop old column

- Migration Considerations
    - Use batch jobs, not UPDATE all at once, to avoid memory spikes.
    - Track migration status via audit tables.
    - Avoid dropping old columns immediately—audit usage patterns first.

> **Technically**: `ALTER COLUMN` would require full table rewrite + index rebuild across distributed shards. In OLAP engines with columnar stores, this could mean reprocessing TBs of data. Additive schema evolution is safer, audit-friendly, and minimizes cluster churn.

## 16. What patterns should I follow to emulate SRF behavior or XML querying in a distributed environment?

- SRF Alternatives (e.g., `unnest()`, `generate_series()`, etc.):
    - Pre-flatten at ingestion: Convert nested arrays or objects into normalized subtables
    - ETL step using Python/Pandas, Spark, or dbt: Unroll arrays to rows before ingestion
    - Materialized views: Create pre-expanded versions of JSON or array fields if reuse is frequent

- XML Querying Patterns:
    - Client-side conversion
        - Convert XML → JSON → MonkDB’s OBJECT column
            - Store raw XML as TEXT and parsed keys as structured fields
    
    - Structured metadata ingestion
        - Extract key attributes during parsing (e.g., XPath to key-value)
        - Ingest flattened fields to enable fast query

Example:

```python
# Pseudocode
xml = "<user><id>123</id><email>abc@example.com</email></user>"
data = xml_to_dict(xml)  # Convert to JSON
insert_into_monkdb(data)
```
> **Technically**: SRFs and XML parsing are row-expansion features, which break columnar scan efficiency. MonkDB is built for vectorized execution and prefer wide, flat rows. Handling expansion outside the engine allows prevalidation, enrichment, and horizontal scaling during transformation.

## 17. Why can’t I use Excel-style formulas like COUNT(DISTINCT) on joined data?

MonkDB restricts the use of `COUNT(DISTINCT column)` in the context of `JOINs` because:

- Distributed joins produce large intermediate result sets, especially when multiple rows from one table match multiple rows from another (causing row explosion).
- Applying DISTINCT requires a global shuffle + deduplication step, which is expensive and hard to optimize in distributed OLAP engines.
- The system cannot guarantee efficient memory and compute usage across nodes during this operation—so the feature is disabled to protect query performance and cluster stability.

### Workarounds:

- Run distinct counting in stages: materialize the JOIN into a temporary table, then run `COUNT(DISTINCT)` on the result.
- Pre-aggregate at source: count distincts per table, then join the aggregates.
- Use approximate distinct count (if supported, e.g., HLL-based approximations).

> **Technically**: `COUNT(DISTINCT)` in `JOINs` requires the query planner to track deduplication across sharded and partitioned data, which causes memory pressure and unpredictable execution paths—especially when the join cardinality is high. To avoid cluster-level failures, MonkDB restricts this usage.

## 18. How do I filter for unique users or sessions across multiple tables?

Since MonkDB does support window functions, you can leverage them to rank, deduplicate, and filter user or session-level data even across joins. This is more powerful than traditional `DISTINCT`-based approaches, especially when you're dealing with time-series, clickstreams, or event logs.

### Recommended Patterns:

- Use `ROW_NUMBER()` to get the first occurrence of each user/session

```sql
SELECT * FROM (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY event_time) AS rn
    FROM events
) sub
WHERE rn = 1;
```
This filters down to the first interaction per user, even if multiple rows exist.

- Use `DENSE_RANK()` or `RANK()` to prioritize sessions/events

```sql
SELECT user_id, session_id,
       RANK() OVER (PARTITION BY user_id ORDER BY session_start DESC) AS session_rank
FROM user_sessions;
```
This can help you identify most recent sessions per user and filter accordingly (`WHERE session_rank = 1`).

- Use `LEAD()` / `LAG()` for user behavior pattern detection

```sql
SELECT user_id,
       event,
       LAG(event) OVER (PARTITION BY user_id ORDER BY event_time) AS previous_event
FROM clickstream;
```
You can track how users move across touchpoints and build funnel or dropout analysis.

- If `JOINs` are needed: do windowing before the join

```sql
WITH ranked AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_time DESC) AS rn
    FROM logins
)
SELECT r.*, u.* 
FROM ranked r
JOIN users u ON r.user_id = u.user_id
WHERE r.rn = 1;
```
This pattern ensures you're joining only the most relevant row per user, instead of bloating intermediate join results.

> **Technically**: Using window functions before JOINs helps reduce row duplication and filter high-cardinality datasets without requiring DISTINCT aggregates, which can be expensive in distributed engines. MonkDB processes window functions per shard and merges results efficiently during query execution.

## 19. What do I do if I need to join 3+ tables but performance is poor?

MonkDB does not reorder `JOINs` beyond two tables. It executes joins in the written order—meaning `(A ⋈ B) ⋈ C` is executed as-is, even if a different order (e.g., `(B ⋈ C) ⋈ A)`) would produce smaller intermediate results. This can lead to large intermediate datasets, slow joins, and even out-of-memory errors if poorly ordered.

### Strategies:

- **Reorder JOINs manually**: Join the smallest/filtering tables first. For example, apply filters early and join the tables likely to reduce row counts.
- Use subqueries to isolate and reduce join inputs:

```sql
SELECT * FROM (
 SELECT id, user_id FROM table_a WHERE event = 'purchase'
) a
JOIN table_b b ON a.user_id = b.user_id
```

- **Materialize sub-joins**: Use temporary tables or caching to avoid re-execution.
- **Avoid cartesian joins**: Always use tight, indexed `ON` clauses.

> **Technically**: MonkDB lacks a cost-based join optimizer for multi-table joins. The join planner is greedy and left-deep, which works for small or ordered joins but can exponentially degrade with 3+ joins. Proper manual query design is crucial to avoid wide, memory-heavy intermediate datasets.

## 20. How do I design OLAP queries to avoid large intermediate join results?

In MonkDB, join ordering is left to the user for 3+ tables. The engine does not auto-optimize join sequence, so poor ordering can cause massive intermediate datasets, degrading performance.

### Design Patterns:

- **Start with the most selective filters**: Apply `WHERE` clauses early to reduce the number of rows before the join.

```sql
SELECT * FROM (
    SELECT * FROM events WHERE event_type = 'purchase'
) e
JOIN users u ON e.user_id = u.user_id
```
- **Reorder joins manually**: Join smaller or filtered tables first to reduce intermediate row sets.
- **Use window functions before joining**: Rank or deduplicate data (e.g., only top session per user).
- **Break complex joins into stages**: Store intermediate results into temp tables or CTEs, and analyze row counts at each stage.

### What to avoid:

- Blindly joining large tables without filtering
- Using JOINs across high-cardinality fields without predicates

> **Technically**: MonkDB performs joins pairwise and sequentially, in query-specified order, without a cost-based optimizer. That means early-stage joins must filter out as much data as possible, otherwise network shuffles and memory usage explode.

## 21. What’s the best way to perform geospatial filtering with high precision?

MonkDB supports geospatial types (e.g., geo_point, geo_shape) and functions like distance(), within(), and intersects(). However, due to indexing and performance trade-offs, precision behavior differs between SELECT and WHERE clauses.

### Best Practices:

- Use `distance()` in `WHERE` for fast bounding: 

```sql
WHERE distance(location, geo_point(12.9, 77.6)) < 5000
```
This Uses spatial index (fast but lower precision).

- Use distance() in SELECT for accurate measurement:

```sql
SELECT name, distance(location, geo_point(12.9, 77.6)) AS exact_distance
```

This Uses runtime Haversine calculation (high precision)

- Never use `WHERE distance(...) = 0`. Use a small buffer (e.g., < 1 meter)
- If exact shape matching is required, use `geo_shape` with `intersects()` or `within()` in `WHERE`.

> **Technically**: MonkDB uses Lucene's spatial indexes, which are fast for filtering but based on grid approximations (e.g., geohashes). This leads to minor coordinate rounding in `WHERE`. For exactness, use `distance()` only in the `SELECT` clause.

## 22. How do I track schema and column changes without system-level metadata visibility like in `INFORMATION_SCHEMA`?

MonkDB provides partial support for `INFORMATION_SCHEMA`, but offers more comprehensive metadata via the `sys` schema, which is better suited for distributed environments.

### Where to look:

- `information_schema.tables` — lists tables
- `information_schema.columns` — shows column names, types, etc.
- `sys.columns` — MonkDB-specific view with:
    - Column indexing details
    - Columnstore status
    - Generated expressions (if any)
- `sys.jobs` and `sys.jobs_log`— tracks recent queries (can infer schema changes)
- `sys.shards`— shows physical storage by table and node

### Schema Change Monitoring:

- Track schema versioning at the ingestion layer
- Maintain a changelog table where DDLs are recorded explicitly
- Integrate schema snapshots into CI/CD pipelines (e.g., dbt-style model diffs)

> **Technically**: In distributed systems, schema metadata is sharded and eventually consistent, making traditional `INFORMATION_SCHEMA` insufficient. MonkDB exposes real-time internal states (indexing, shards, nodes) via `sys.*` views for better operational observability and schema auditing.

## 23. Can I create dynamic pivot tables or multi-level aggregations without SRFs?

Yes, you can create pivot-like outputs in MonkDB using:

- `CASE`-based pivots for known keys
- `GROUP BY` + aggregate + flatten in BI layer for dynamic pivots
- Window functions for row-level aggregation: But MonkDB does not support set-returning functions (SRFs) like json_array_elements() or unnest() that dynamically explode rows.

### Methods:

- `CASE WHEN`–based Pivot (for known values)

```sql
SELECT
  department,
  COUNT(CASE WHEN gender = 'Male' THEN 1 END) AS male_count,
  COUNT(CASE WHEN gender = 'Female' THEN 1 END) AS female_count
FROM employees
GROUP BY department;
```

- BI Tool Pivot

Return raw rows from MonkDB:

```sql
SELECT department, gender, COUNT(*) as cnt FROM employees GROUP BY department, gender;
```

Use the BI tool (e.g., Tableau, PowerBI, Superset) to pivot on gender.

- Nested Aggregations

MonkDB supports GROUP BY with aggregates of aggregates, e.g.:

```sql
SELECT country, AVG(order_count) FROM (
      SELECT user_id, COUNT(*) AS order_count
      FROM orders
      GROUP BY user_id
    ) t
    GROUP BY country;
```

> **Technically**: MonkDB's SQL engine supports windowing and nesting, but avoids SRFs due to their row-expanding nature, which is incompatible with columnar storage and distributed parallelism. The approach is: flatten first, aggregate later, ideally outside the DB for dynamic pivots.

## 24. How do I emulate generate_series()-like behavior for time-binning or range analysis?

MonkDB doesn’t support `generate_series()` or SRFs that emit dynamic rows, but time binning is still achievable via:

### Alternatives:

1. Use `DATE_TRUNC()` or `FLOOR(timestamp TO INTERVAL)`

```sql
SELECT
  DATE_TRUNC('day', event_time) AS day,
  COUNT(*) AS daily_events
FROM events
GROUP BY 1
ORDER BY 1;
```

- **Materialize a Date Dimension Table**: Create and ingest a static table with date ranges, intervals, and attributes like:

```sql
CREATE TABLE calendar (
  day DATE PRIMARY KEY,
  week_start DATE,
  is_weekend BOOLEAN,
  holiday_name TEXT
);
```

Then,

```sql
SELECT cal.day, COUNT(e.id)
FROM calendar cal
LEFT JOIN events e ON DATE_TRUNC('day', e.event_time) = cal.day
GROUP BY cal.day;
```

This gives complete time buckets, including empty periods.

- **Use application-layer series generation**: If needed, dynamically generate a list of time intervals in your Python/Java code and join that with aggregated results.

> **Technically**: `generate_series()` emits on-the-fly rows, which is hard to parallelize in distributed systems. Preloading a date spine table is a proven warehouse technique—offering full control, zero overhead, and reusability across dashboards.

## 25. Do I need to back up schema manually since ALTER operations are limited?

Yes — manual schema versioning and backups are recommended. Here's why,

- MonkDB does not support `ALTER COLUMN`, `RENAME COLUMN`, or other destructive column-level operations. Schema evolution is additive only (e.g., `ADD COLUMN`).
- While MonkDB stores metadata internally, there's no automatic schema version control, rollback, or migration tracking.
- If schema changes go wrong (e.g., column added with wrong type), rollback requires manual intervention — like dropping the table and restoring from backup.

### Best Practices:
- Store your `CREATE TABLE` and `ALTER TABLE` statements in version-controlled files (e.g., Git).
- Maintain a schema changelog to track when and why a change was made.
- Use a schema registry or migration tool (like Alembic, Liquibase, or plain SQL scripts) to manage schema lifecycle.
- Always export schema definitions before a major deployment.

> **Technically**: MonkDB avoids `ALTER COLUMN` to maintain shard consistency, index integrity, and performance. In a distributed system, a wrong schema change can corrupt multiple nodes’ storage — making schema discipline even more critical.

## 26. Can I monitor which nodes are active in the cluster from within MonkDB?

Yes — MonkDB provides real-time introspection via the sys schema, specifically,

Use:

```sql
SELECT * FROM sys.nodes;
```

This gives you:

- Node ID and name
- Hostname and IP
- OS and JVM versions
- Available disk, CPU, memory stats
- Cluster membership status (online, leaving, etc.)

You can also query:

```sql
SELECT * FROM sys.health;
```

To monitor cluster-wide health metrics, including shard distribution, replication status, and disk usage.

> **Technically**: The sys schema is designed for ops visibility and exposes the internal state of each node without needing external monitoring tools. For production setups, integrate this with Prometheus/Grafana via REST or JDBC.

## 27. What happens if a user tries to run a trigger or a stored procedure by mistake?

If a user executes `CREATE TRIGGER` or `CREATE PROCEDURE`, MonkDB will return a SQL syntax error or a **feature not supported** exception.

### Example:

```sql
CREATE TRIGGER audit_insert AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION log_activity();
```
MonkDB will reject this with:

```text
SQLParseException: line 1:1: CREATE TRIGGER is not supported
```

### What actually happens:

- No silent failure, errors are explicit.
- Query execution halts immediately.
- No side effects or partial execution occurs.

> **Technically**: These features are intentionally disabled at the parser level, not just unimplemented. This ensures MonkDB's SQL grammar remains tight and avoids confusion or partial feature behavior. You can confidently catch these at query parse time.

## 28. How do I observe query health or cluster status in MonkDB?

MonkDB exposes real-time cluster and query health metrics via its system catalog, particularly through the sys schema. This provides operational visibility without needing external tools initially.

### Key Queries:

- Cluster Nodes Health:

```sql
SELECT * FROM sys.nodes;
```
Sees which nodes are up, their IPs, disk usage, memory stats, and load.

- Query Execution Health:

```sql
SELECT * FROM sys.jobs;
```

Views currently running queries with:
+ Node where it’s running
+ Start time, query text, phase
+ Duration (helps detect long-running queries)

- Historical Queries:

```sql
SELECT * FROM sys.jobs_log ORDER BY ended DESC LIMIT 100;
```
Monitors slow, failed, or terminated queries. Useful for post-mortem or audit analysis.

- Cluster Overview:

```sql
SELECT * FROM sys.cluster;
```

Views overall state, cluster UUID, license info, and health flags.

> **Technically**: Unlike `INFORMATION_SCHEMA`, the sys schema is dynamic and distributed-aware, giving access to in-memory and live runtime metrics across all nodes. These views are non-blocking and safe to query in production.

## 29. How can I tell if a join query is inefficient due to join order?

MonkDB does not auto-reorder joins for 3+ tables. The join execution follows the order written in the SQL, which can result in large intermediate result sets and slow execution.

### Detection Signs:

- Query appears in `sys.jobs` or `sys.jobs_log` with long durations
- The `rows_read` in `sys.jobs_log` is abnormally high
- Memory usage spikes on a single node in `sys.nodes`
- Query returns slowly or times out under high cardinality joins

### Tools and Techniques:

- Use `EXPLAIN` to inspect join plan (currently limited but improving)
- Monitor `sys.jobs_log.duration`, `rows_read`, and `rows_written`
- Look at intermediate join sizes by breaking query into parts
- Check `sys.shards` to see if all joins are hitting multiple shards or unbalanced nodes

### Optimizing Join Order:

- Manually rewrite:

```sql
-- Suboptimal:
SELECT * FROM a JOIN b ON ... JOIN c ON ...
```
```sql
-- Better:
WITH filtered_a AS (
  SELECT * FROM a WHERE important_filter = 'X'
)
SELECT * FROM filtered_a fa
JOIN b ON ...
JOIN c ON ...
```

> **Technically**: Since MonkDB doesn't use a cost-based optimizer to reorder multi-joins, query structure directly affects plan shape. A wrong join order can balloon memory usage and IO. You must apply filters early and join selective datasets first.

## 30. How do I track and alert on failed queries or large intermediate join results?

MonkDB provides detailed visibility into query execution via the `sys.jobs_log` table.

### Steps:

- Track Failures:

```sql
SELECT * FROM sys.jobs_log
WHERE error IS NOT NULL
ORDER BY ended DESC
LIMIT 10;
```
where, 

error → error message
stmt → SQL text
node_id → execution node

- Track Heavy Joins or Large Reads:

```sql
SELECT stmt, duration, rows_read, memory_used
FROM sys.jobs_log
WHERE rows_read > 1_000_000 OR memory_used > 500_000_000
ORDER BY duration DESC;
```

### Alerting:

- Export metrics to Prometheus or Datadog or such systems.
- Use automated alerts for:
    - duration > X sec
    - memory_used > threshold
    - error IS NOT NULL

> **Technically**: These logs are shard-level real-time metrics pulled from MonkDB’s distributed job tracker. It avoids global coordination while giving full visibility into costly or failed operations.

## 31. How do I prevent excessive memory usage when long TEXT values are inserted?

MonkDB uses Lucene’s DocValues for columnar storage, which limits `TEXT` columns to `32,766 bytes` by default.

### What to do:

- Avoid columnstore for large text fields:

```sql
CREATE TABLE logs (
    id TEXT PRIMARY KEY,
    log_text TEXT INDEX OFF STORAGE WITH (columnstore = false)
);
```

This bypasses Lucene’s DocValues and uses row-based storage.

- **Split long text fields**: Store metadata in MonkDB, and large blobs (e.g., HTML, JSON) in object storage (S3, Azure Blob), linking via ID.
- **Validate size at application layer**: Enforce size limit at ingest.

> **Technically**: DocValues are designed for fast columnar aggregations and sorting, not for unbounded `TEXT` storage. Large values hurt compression and can crash merge segments or blow up heap space. Row-store fallback is safer for such cases.

## 32. How can I manage index/storage tuning when some columns are not eligible for columnstore or indexing (e.g., partition columns)?

Partition columns in MonkDB must remain:

- Indexable
- Columnstore enabled

You cannot disable indexing or columnstore on partition columns, because the engine relies on them for:
- Data routing
- Shard pruning
- Query planning

### Tuning Options:

- Non-partition columns:

Use:

```sql
WITH (index = false, columnstore = false)
```

Ideal for blob, logs, or non-aggregated metadata.

- Minimize partition cardinality: Instead of `PARTITION BY user_id`, prefer `PARTITION BY date_trunc('day', created_at)`

Keep partitions < 5,000 for operational safety

- Balance indexing trade-offs: Use analyzed vs not_analyzed on string columns. Disable indexing for columns not queried or filtered

> **Technically**: Partition columns are central to shard routing and performance. Disabling their indexing would break MonkDB's internal planner, so tuning must happen around non-partition columns instead.

## 33. What’s the strategy for scaling MonkDB for streaming SQL ingestion and OLAP workloads simultaneously?

MonkDB is optimized for high-throughput ingestion with parallel reads, but must be configured and scaled carefully to support streaming + OLAP concurrency.

### Architectural Strategy:

- Dedicated Write and Read Nodes:
    - Assign write-heavy streaming to some nodes (via client routing)
    - Route OLAP workloads to others (using load balancer or planner hints)
- Streaming Ingestion Pipeline:
    - Use Kafka/Flink for real-time inserts
    - Buffer high-volume data, batch every few seconds for efficiency
    - Use `INSERT INTO ... ON CONFLICT DO UPDATE` logic if de-dup is needed
- Partitioning and Clustering:
    - Partition by time (e.g., hourly or daily)
    - Route streaming writes to current partition, OLAP reads span older ones
- Query Isolation:
    - Set query timeout and memory limits via SQL or JDBC config
    - Use Prometheus + query throttling to control resource contention
- Cold-to-Hot Tiering (Optional):
    - Move older partitions to lower-cost nodes
    - Keep hot data in SSD-backed primary nodes

> **Technically**: OLAP engines like MonkDB use columnar storage and shared-nothing architectures, allowing horizontal scale. To support concurrent ingestion and queries, follow these: *partitioning is key*, *backpressure-aware ingestion is critical*, and *resource limits and planner-awareness must be enforced*. 

## 34. How does MonkDB's shared-nothing distributed architecture work internally?

MonkDB follows a **shared-nothing architecture**, meaning each node has its own CPU, memory, and disk. All nodes are identical which means any node can act as:

- Coordinator node (receiving SQL requests, planning, merging results),
- Data node (holding shards, executing query fragments),
- Cluster manager (maintaining cluster metadata and shard assignments).

Nodes communicate via the **Transport protocol** (built on Netty).
The cluster state is distributed using **Elasticsearch-like coordination** (based on Zen Discovery / Raft-like mechanisms).
This symmetry ensures no single point of failure and linear horizontal scalability.

## 35. What are the details of MonkDB’s data partitioning and shard distribution mechanisms?

Tables can be:

- **Unpartitioned**— fixed number of shards (e.g., `CLUSTERED INTO 8 SHARDS`), or
- **Partitioned**— shards grouped by partition keys (e.g., `PARTITIONED BY (date_trunc('day', ts))`).

Each partition = 1+ shards.
Shard placement and replication are managed by the cluster state service, ensuring balanced distribution across nodes.
When nodes join/leave, MonkDB automatically rebalances shards for even data and load distribution.

## 36. How does MonkDB achieve data replication, consistency, and fault tolerance?

- Each shard has 1 primary and n replicas.
- Writes go to the primary shard, which forwards to replicas.
- Acknowledgement is returned to the client once all replicas have written successfully (or quorum is reached).
- Replication ensures durability and automatic recovery if a node fails — replicas are promoted to primaries during failover.

## 37. Can you explain MonkDB’s underlying storage engine and its integration with Lucene?

MonkDB uses **Apache Lucene** as its storage layer.
Each shard = a Lucene index, containing:

- **Inverted indexes** for full-text and keyword search,
- **BKD trees** for numeric, and geo,
- **Doc values** for columnar analytics.
- **HNSW** for managing vector data. 

MonkDB wraps Lucene with SQL semantics, allowing you to query all data types using familiar SQL syntax, including aggregations and joins.

## 38. How are columnar storage and row-based document storage combined in MonkDB?

MonkDB employs a hybrid HTAP architecture, combining row-based document storage for fast ingest and immediate updates with a columnar engine for high-performance analytical queries. However, it does not support traditional multi-statement transactional controls like `BEGIN`, `COMMIT`, or `ROLLBACK`. These statements are accepted for client compatibility but silently ignored, with all operations auto-committed and visible immediately.

### Storage & Query Architecture

- Incoming records (JSON, sensor data, etc.) are first written into a row-oriented document store, providing atomic operations at the document level and low-latency data ingestion.
- In the background, data is compacted and vectorized into columnar structures (doc-values, vectorized blocks) for read-optimized analytical workloads, such as aggregations and scans.
- MonkDB's query planner directs transactional-style lookups to its row layer, and analytical workloads to the columnar layer.

### Transaction Limitations

- MonkDB does not offer ACID transactions: every write is auto-committed, and there are no mechanisms for multi-statement atomicity or rollback.
- Transaction-related SQL statements are accepted only for compatibility and have no real effect.
- Consistency is managed at the row/document level using atomic operations and version numbers, with eventual consistency across shards in distributed scenarios.

MonkDB’s HTAP approach enables efficient OLTP+OLAP querying on the same data, but does not provide real transaction semantics—data operations are atomic at the row/document level and are finalized with every statement.

## 39. How does MonkDB optimize distributed SQL query execution across multiple nodes?

Queries are decomposed into a **logical plan → physical plan** via the **SQL Handler** and **Job Execution Service (JES)**.
The query executes in phases:

- **Collect phase** — data scanned locally on each shard.
- **Merge phase** — partial results streamed to coordinator.
- **Fetch phase (optional)** — document-level data retrieval.

Execution is fully parallelized, minimizing data movement.
Pushdown predicates and early aggregation reduce network overhead.

## 40. What are MonkDB’s advanced indexing techniques, including full-text, geo, and vector search?

- **Full-text**: Uses Lucene analyzers for tokenization and relevance scoring (`MATCH` operator).
- **Geo**: Supports `GEO_POINT` and `GEO_SHAPE` types with spatial indexing via BKD trees.
- **Vector**: Stores embeddings in `FLOAT_VECTOR(N)` columns and queries via `knn_match` for semantic similarity (HNSW index).

All are first-class citizens in the SQL layer meaning you can combine them in `SELECT`, `JOIN`, and `WHERE` clauses.

## 41. How does MonkDB handle concurrent writes and real-time data ingestion at scale?

Writes land in:

- An **in-memory buffer** (per shard),
- A **transaction log (translog)** for durability.

Data becomes searchable after each **refresh interval** (default 1 second).
Lucene’s segment-based model allows high-concurrency writes, and MonkDB’s distributed shard architecture parallelizes ingestion across nodes.
Backpressure mechanisms manage memory and flush frequency to maintain stability.

## 42. What is the query planning and physical execution flow inside MonkDB’s engine?

- **SQL Handler** parses the query and generates a logical plan.
- **Analyzer** validates schema and optimizes joins, filters, and projections.
- **Planner** generates a distributed physical plan — defines where each operation runs.
- **Job Execution Service (JES)** schedules execution tasks across nodes.
- **Coordinator** node merges results and returns them to the client.

Query plans can be inspected with `EXPLAIN`.

## 43. How does MonkDB support schema evolution and dynamic schema updates without downtime?

MonkDB supports dynamic schemas:

- New fields automatically added to `OBJECT` columns or tables with `dynamic = true`.
- Each new field is automatically indexed and becomes queryable.
- Schema updates propagate cluster-wide via the cluster state service. No restart required.

## 44. How can custom user-defined functions (UDFs) be created and used in MonkDB?

MonkDB allows JavaScript-based UDFs:

```sql
CREATE FUNCTION my_add(a INTEGER, b INTEGER)
RETURNS INTEGER
LANGUAGE JAVASCRIPT AS 'function(a, b) { return a + b; }';
```

UDFs run in a sandboxed engine within each node, enabling local execution for performance.

## 45. What monitoring and diagnostics tools are recommended for MonkDB clusters?

- **System tables**– sys.nodes, sys.jobs, sys.shards, sys.metrics.
- **Prometheus + Grafana**– MonkDB exposes metrics endpoint (_prometheus).
- **Log files**– detailed traces under log/monkdb.log for query and GC diagnostics.

## 46. Can MonkDB integrate with AI and machine learning workflows, and how?

Yes — via vector storage and external orchestration:

- Store model embeddings in `FLOAT_VECTOR`.
- Use `knn_match` for semantic search or recommendation tasks, and `vector_similarity` for similarity searches across vector data.
- Integrate with LangChain, HuggingFace, or MonkDB MCP and pipelines through the PgWire protocol or HTTP interface.
- Combine structured filters + full text search + vector similarity in one SQL query.

## 47. How does MonkDB manage memory and disk storage to optimize performance?

- **Heap memory** used for query planning, caching, aggregations.
- **Off-heap memory** managed by Lucene for segment caching.
- **Circuit breakers** prevent OOM by monitoring usage.
- **Segment** merging and flush policies optimize disk I/O.
- **Doc values** allow columnar scans directly from disk with minimal heap load.

## 48. What are the best deployment patterns for MonkDB in cloud, hybrid, and edge environments?

- **Cloud**: Containerized (Kubernetes or Docker) deployments scale elastically.
- **Hybrid**: Edge nodes ingest locally → replicate/aggregate to core cluster.
- **Edge**: ARM64 builds enable deployment on devices (e.g., Raspberry Pi, Jetson).

Use Kubernetes Operators for managed orchestration.

## 49. How to perform backup, restore, and disaster recovery in MonkDB?

Use Snapshots (similar to Elasticsearch):

```sql
CREATE REPOSITORY repo1 TYPE fs WITH (location='/mnt/backups');
CREATE SNAPSHOT repo1.snapshot1 ALL;
```

- Supports **S3**, **Azure**, **GCS**, and **local FS** backends.
- Snapshots are incremental — only changed segments are copied.
- Restore from snapshot using `RESTORE SNAPSHOT`.

## 50. What security model does MonkDB implement for multi-tenant environments?

- **Role-based access control (RBAC)** – users, roles, and privileges.
- **TLS/SSL** for client and inter-node communication.
- **Authentication**: password-based, LDAP, JWT, or PKI.
- **Row-level security** can be implemented via views or filters per tenant.

## 51. How to tune MonkDB for large-scale time-series workloads with rapid ingestion and querying?

- Partition tables by time (daily/hourly).
- Use `TIMESTAMP + CLUSTERED BY` key for routing.
- Tune:
    - `number_of_replicas`
    - `refresh_interval`
    - `translog.flush_threshold_size`
- Periodically drop or roll over old partitions.
- Use doc values for aggregations, avoid over-indexing.

## 52. How does MonkDB enable transactional atomicity in a distributed environment?

- MonkDB provides per-shard atomicity — writes to a single shard are atomic.
- Cluster-level atomicity (across shards) follows eventual consistency.
- Transaction boundaries are managed via internal journaling and replication acknowledgements.

## 53. What are the internal mechanisms for cluster state management and leader election?

- Master (cluster manager) election handled by Zen Discovery (Raft-like consensus).
- Master maintains cluster metadata — nodes, shards, mappings.
- Updates are versioned and broadcast to all nodes.
- If master fails, a new one is elected via quorum voting.

## 54. How does MonkDB handle load balancing and query routing across nodes?

- Any node can act as a coordinator, providing natural load balancing.
- External load balancers (HAProxy, Nginx, Kubernetes service) can distribute client connections.
- Routing decisions for data access are based on cluster state metadata (which node owns which shards).

## 55. How to perform logical replication and data synchronization between MonkDB clusters?

Currently MonkDB supports:

- Snapshots + incremental restores for batch replication.
- Log shipping or CDC can be achieved via integration with Kafka connectors or MonkDB pipelines.