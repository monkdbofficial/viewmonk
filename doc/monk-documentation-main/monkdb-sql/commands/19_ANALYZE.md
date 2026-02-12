# MonkDB: `ANALYZE` Statement

The `ANALYZE` command in MonkDB is used to collect statistics about the contents of tables within the cluster. These statistics assist the query optimizer in generating efficient execution plans, thereby enhancing query performance.

---

## SQL Statement

```sql
ANALYZE;
```

## 🚀 Description

- **Purpose**: Collects and updates statistical information about table contents.​
- **Functionality**:
    + The gathered statistics are stored in the `pg_catalog.pg_stats` table.​
    + The query optimizer utilizes these statistics to create more efficient execution plans.​

## 🛠️ Configuration

- Automatic Statistics Collection:
    + MonkDB periodically updates statistics automatically.​
    + The frequency of these updates can be configured using the `stats.service.interval` setting.​
- I/O Throughput Throttling:
    + To control the impact on system performance during statistics collection, I/O throughput can be throttled.​
    + This is managed via the `stats.service.max_bytes_per_sec` setting.​
    + Adjustments to this setting can be made dynamically, even while an analysis is in progress, allowing for optimization based on system performance observations.

## Performance Considerations:

- While the ANALYZE command is designed to collect samples and avoid processing all data, it can still impose load on the cluster.​
- To mitigate potential performance impacts, it's advisable to adjust the `stats.service.max_bytes_per_sec` setting appropriately.​
- Monitoring system performance during analysis can help in determining optimal settings.

## 🔐 Permissions

- Execution Rights:
    + The ANALYZE command can be executed by any user with appropriate privileges to run SQL statements.​
    + No special permissions are required to initiate the analysis process.​

## 🏁 Summary

| Command                            | Description                               | Special Permissions |
|------------------------------------|-------------------------------------------|--------------------|
| `ANALYZE`            | Collects statistics for all tables in cluster          | No                |
