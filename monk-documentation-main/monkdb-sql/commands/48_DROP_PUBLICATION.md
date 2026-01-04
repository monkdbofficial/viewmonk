# MonkDB: `DROP PUBLICATION` Statement

The `DROP PUBLICATION` command in MonkDB is used to remove an existing publication from the cluster. This operation stops replication for all subscriptions associated with the publication. 

## SQL Statement

```sql
DROP PUBLICATION [ IF EXISTS ] name;
```

## Description

The command deletes a publication, effectively stopping replication for all tables included in the publication. On the subscriber cluster, tables that were replicated via this publication will revert to regular writable tables after the publication is dropped.

## Parameters

- **name**- Specifies the name of the publication to be removed.
- **IF EXISTS**- Optional clause that prevents an error if the specified publication does not exist. Instead, a notice is issued.

## Behavior

- Dropping a publication does not delete the replicated tables on the subscriber cluster; these tables remain intact but lose their replication properties.
- This ensures that data integrity is maintained on the subscriber side while allowing further modifications.

## Examples

### Example 1. Drop a publication

To drop a publication named `my_publication`

```sql
DROP PUBLICATION my_publication;
```

### Example 2. Using IF EXISTS to avoid errors if the publication does not exist

```sql
DROP PUBLICATION IF EXISTS my_publication;
```

## Notes

- Ensure that all subscriptions tied to the publication are properly managed before dropping it to avoid unexpected replication issues.
- After dropping a publication, any changes made to tables on the publishing cluster will no longer propagate to subscribers.
- This command is particularly useful for managing replication setups and cleaning up unused publications in MonkDB environments.

---

## See Also

- [Create publication](./29_CREATE_PUBLICATION.md)