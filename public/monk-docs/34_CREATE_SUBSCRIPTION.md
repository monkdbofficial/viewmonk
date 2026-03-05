# MonkDB: `CREATE SUBSCRIPTION` Statement

The `CREATE SUBSCRIPTION` statement is used to create a new subscription in the current cluster. A subscription establishes a connection to a publication on a publisher cluster, enabling the replication of data changes from the publisher to the subscriber.

---

## SQL Statement

```sql
CREATE SUBSCRIPTION subscription_name
CONNECTION 'conninfo'
PUBLICATION publication_name [, ...]
```

---

## Description

The `CREATE SUBSCRIPTION` statement sets up a replication connection to one or more publications on a publisher cluster. 

### Key Features:
- **Replication Connection:** Establishes a connection for replicating data changes from a publisher cluster.
- **Automatic Synchronization:** Once a subscription is enabled (default on creation), logical replication begins on the publisher.

---

## Parameters

| Parameter          | Description                                                                                                                                           |
|--------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| **subscription_name** | The name of the new subscription. Must be unique within the cluster.                                                                                |
| **CONNECTION 'conninfo'** | The connection string to the publisher, which is a URL in the format `monkdb://host:[port]?params`.                                                                |
| **PUBLICATION publication_name** | The name(s) of the publication(s) on the publisher cluster to subscribe to. |

---

## Connection String Parameters (`conninfo`)

The connection string uses the following format:

```bash
monkdb://host:[port]?param1=value1&param2=value2
```


### Supported Parameters:

#### Mode-Specific Parameters:

- **`mode`**: Sets how the subscriber cluster communicates with the publisher cluster. Two modes are supported:
    - `sniff` (default): The subscriber uses the transport protocol and attempts to establish direct connections to each node in the publisher cluster. The default port is 4300.
    - `pg_tunnel`: The subscriber initiates the connection using the PostgreSQL wire protocol and routes all traffic through a single node. The default port is 5432.

    **`sniff` mode Example**: `monkdb://example.com:4310,123.123.123.123` (multiple hosts can be specified)
    **`pg_tunnel` mode Example**: `monkdb://example.com:5432`

#### Parameters Supported in Both Modes:

- **`user`**: The username for connecting to the publishing cluster. **Required.**
- **`password`**: The password for the specified user.

    **Important**: The specified user *must* have `DQL` (Data Query Language) privileges on all tables included in the publication on the publisher cluster. Tables for which the user lacks `DQL` privileges will not be replicated.

#### Parameters Supported in `pg_tunnel` Mode Only:

- **`sslmode`**: Configures whether the connection should use SSL for the PostgreSQL wire protocol. Allowed values are `prefer`, `require`, or `disable`. Defaults to `prefer`.

    **Note**: Requires proper SSL setup on both the subscriber and publisher clusters for the PostgreSQL wire protocol.

---

## Examples

### Example 1: Creating a Subscription in `sniff` Mode
Create a subscription named `my_subscription` in `sniff` mode:

```sql
CREATE SUBSCRIPTION my_subscription
CONNECTION 'monkdb://publisher.example.com:4300?user=repl_user&password=secret_password'
PUBLICATION my_publication;
```


### Example 2: Creating a Subscription in `pg_tunnel` Mode with SSL
Create a subscription named `secure_subscription` in `pg_tunnel` mode with SSL enabled:

```sql
CREATE SUBSCRIPTION secure_subscription
CONNECTION 'monkdb://publisher.example.com:5432?user=repl_user&password=secret_password&sslmode=require'
PUBLICATION my_publication;
```

### Example 3: Creating a Subscription with Multiple Seed Nodes in Sniff Mode

```sql
CREATE SUBSCRIPTION multi_seed_subscription
CONNECTION 'monkdb://example.com:4300,123.123.123.123:4300?user=repl_user&password=secret_password'
PUBLICATION my_publication;
```

---

## Notes

1. **Privileges Required:** Creating a subscription requires `AL` (Admin Level) privileges on the cluster.
2. **User Privileges:** The user specified in the connection string must have `DQL` privileges on all tables in the publication.
3. **Network Connectivity:** Ensure network connectivity between the subscriber and publisher clusters.
4. **SSL Configuration:** If using `pg_tunnel` mode with `sslmode=require`, ensure proper SSL configuration on both clusters.
5. **Publication Existence:** The specified publications must exist on the publisher cluster.
6. **Data Synchronization:** Data synchronization occurs automatically once the subscription is created and enabled.

---

## 🔐 Permissions

- **Create Subscription**:
  - Requires `AL` (Admin Level) privileges on the subscriber cluster.
- **Connection User Requirements**:
  - The user specified in the `conninfo` string **must** have `DQL` (read) privileges on all tables included in the publication on the publisher cluster.
- **SSL (pg_tunnel)**:
  - If using `pg_tunnel` mode with `sslmode=require`, ensure that proper SSL certificates are installed and trusted by both publisher and subscriber clusters.
- **Publication Visibility**:
  - The subscriber must have access to the publications on the publisher cluster and be authorized to read them.

> 🔒 Best Practice: Create a dedicated replication user with scoped `DQL` access on the publisher for enhanced security and auditing.

---

## 🏁 Summary

| Feature                          | Supported / Required                                               |
|----------------------------------|--------------------------------------------------------------------|
| Supports `sniff` Mode            | ✅ Yes (default, multi-node aware)                                |
| Supports `pg_tunnel` Mode        | ✅ Yes (PostgreSQL protocol with single-node access)              |
| Automatic Data Sync              | ✅ Yes (upon creation, if enabled)                                |
| Secure Connections (SSL)         | ✅ Optional, only in `pg_tunnel` mode                             |
| Requires Admin Privileges        | ✅ Yes (`AL`) on subscriber cluster                               |
| Requires DQL on Publisher        | ✅ Yes, for all published tables                                  |
| Monitors Subscription Progress   | ✅ Use system views like `sys.subscriptions` (if available)       |
| Supports Multi-Host URIs         | ✅ Yes (in `sniff` mode)                                          |
| Connection String Required       | ✅ Yes (must specify `user`, `password`, and host(s))             |

---

## See Also

- [Create Publication](./29_CREATE_PUBLICATION.md)
- [Drop Subscription](./53_DROP_SUBSCRIPTION.md)


