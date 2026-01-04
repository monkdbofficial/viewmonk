# MonkDB: `KILL` Statement

The KILL statement in MonkDB is used to terminate active jobs within a cluster.

## SQL Statement

```sql
KILL (ALL | job_id)
```

where,

- `KILL ALL`: Terminates all active jobs owned by the current user across the MonkDB cluster.
- `KILL job_id`: Terminates a specific job identified by its `job_id`, provided it was initiated by the current user.

## Parameters
- `job_id`: The UUID of the currently active job that needs to be terminated, provided as a string literal.


## Description
### Functionality
- The `KILL` command is available for all users on MonkDB clusters.
- The **monkdb** superuser has additional privileges to terminate jobs initiated by other users.

### Behavior
- **No Rollback**: MonkDB does not support transactions. If a data-modifying operation (e.g., `UPDATE`) is killed, changes already applied will not be rolled back, potentially leaving data in an inconsistent state.
- **Fast Operations**: Certain quick operations may complete before the `KILL` command is processed. In such cases, the client might receive an error despite the operation being completed.
- **Context Count**: Both `KILL ALL` and `KILL job_id` return the number of contexts terminated per node. For example, if a query spans three nodes, the result will indicate three contexts killed.

## Examples

Kill all active jobs.

```sql
KILL ALL;
```

Kill a specific job by its UUID.

```sql
KILL '175011ce-9bbc-45f2-a86a-5b7f993a93a6';
```

## Usage Considerations

Use system tables like `sys.jobs` to identify active jobs and their corresponding `job_id`. For example:

```sql
SELECT id AS job_uuid, stmt FROM sys.jobs;
```

To monitor distributed operations, use `sys.operations`:

```sql
SELECT node['name'], node['id'], * FROM sys.operations;
```

Review logs of finished jobs in tables like `sys.jobs_log` and `sys.operations_log` for historical analysis.

> **Exercise caution when using `KILL`, especially with data-modifying operations, to avoid leaving data in an inconsistent state**