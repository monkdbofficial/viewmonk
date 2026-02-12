# MonkDB: `DROP SUBSCRIPTION` Statement

## SQL Statement

```sql
DROP SUBSCRIPTION [ IF EXISTS ] name
```

## Description

The `DROP SUBSCRIPTION` command in MonkDB is used to remove an existing subscription from the cluster. Once a subscription is dropped, the replication process for that subscription stops, and any tables associated with it become regular writable tables. 

> It is important to note that once a subscription is dropped, it cannot be resumed.

## Parameters

- **name**: This is the name of the subscription that you want to delete. It must be a valid subscription name within the cluster.

## Steps to Drop a Subscription

- **Identify the Subscription**: Ensure you have the correct name of the subscription you wish to drop.
- **Execute the Command**: Use the `DROP SUBSCRIPTION` command followed by the name of the subscription. If you are unsure whether the subscription exists, you can use `IF EXISTS` to avoid errors.

```sql
DROP SUBSCRIPTION IF EXISTS my_subscription;
```

After executing the command, verify that the subscription has been successfully removed and that replication has stopped.

## Considerations
- **Replication Stop**: Dropping a subscription stops the replication process for the tables involved. These tables will no longer receive updates from the publisher.
- **Table Accessibility**: After dropping a subscription, the tables become writable on the subscriber cluster, allowing local modifications.
- **Irreversibility**: Once a subscription is dropped, it cannot be resumed. You would need to recreate the subscription if you want to restart replication.

## Examples

Suppose you have a subscription named `my_subscription` that you no longer need. You can drop it using the following command:

```sql
DROP SUBSCRIPTION my_subscription;
```

If you are unsure whether `my_subscription` exists, use:

```sql
DROP SUBSCRIPTION IF EXISTS my_subscription;
```

--- 

## See Also

- [Create Subscription](./34_CREATE_SUBSCRIPTION.md)




