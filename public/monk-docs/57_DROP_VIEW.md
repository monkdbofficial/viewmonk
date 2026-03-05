# MonkDB: `DROP VIEW` Statement

The `DROP VIEW` statement in MonkDB is used to remove one or more existing views from the database.

## SQL Statement

```sql
DROP VIEW [ IF EXISTS ] view_name [,... ]
```

## Description

- **Purpose**: The `DROP VIEW` statement is used to delete views that were previously created using the `CREATE VIEW` statement.
- **Behavior**: If a view does not exist and the `IF EXISTS` clause is not used, the command will return an error. However, if `IF EXISTS` is specified, the command will simply ignore non-existent views and drop only the existing ones.

## Key Points
- **Multiple Views**: You can drop multiple views with a single command by listing them after the `DROP VIEW` statement.
- **Privileges**: You need appropriate permissions to drop views.
- **Impact on Data**: Since views are logical constructs without physical data, dropping a view only affects metadata and does not delete any actual data.

## Example

To drop a view named `my_view`

```sql
DROP VIEW my_view;
```

To drop multiple views, including one that might not exist

```sql
DROP VIEW IF EXISTS my_view, another_view, non_existent_view;
```

This command will drop `my_view` and `another_view` if they exist, and will not throw an error if `non_existent_view` does not exist.

---

## See Also

- [Create View](./39_CREATE_VIEW.md)


