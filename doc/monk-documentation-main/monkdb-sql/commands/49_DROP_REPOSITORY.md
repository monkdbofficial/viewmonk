# MonkDB: `DROP REPOSITORY` Statement

The `DROP REPOSITORY` statement in MonkDB is used to de-register a repository, making it unavailable for use.

## SQL Statement

```sql
DROP REPOSITORY repository_name;
```

## Description

When you execute the `DROP REPOSITORY` statement, MonkDB removes the repository's configuration from the system, specifically deleting the corresponding record from sys.repositories. However, this action does not affect any existing snapshots stored in the backend data storage associated with the repository. If you create a new repository using the same backend data storage, any existing snapshots will become accessible again.

### Parameters
- **repository_name**: The name of the repository to be de-registered.

## Important Considerations
- **Repository Usage**: A repository can only be dropped if it is not currently in use. This means there should be no ongoing snapshot operations.
- **Snapshot Persistence**: Dropping a repository does not delete the snapshots themselves; it merely removes the repository's configuration. This allows you to reuse the backend storage for a new repository, making existing snapshots available again.
- **Recreating a Repository**: If you need to change repository parameters, you must first drop the repository and then recreate it with the desired settings using the `CREATE REPOSITORY` statement.

## Example

To drop a repository named `OldRepository`, you would use the following command

```sql
DROP REPOSITORY "OldRepository";
```

This command removes the `OldRepository` from the system, but any snapshots it contained remain in the backend storage until manually deleted or reused by a new repository.

---

## See Also

- [Create Repository](./30_CREATE_REPOSITORY.md)


