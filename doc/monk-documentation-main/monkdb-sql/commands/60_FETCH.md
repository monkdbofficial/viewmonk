# MonkDB: `FETCH` Statement

The `FETCH` statement in SQL is used to retrieve rows from a cursor, which is a database object designed to handle query results one row at a time. Below is an expanded explanation of its usage, parameters, and syntax, specifically tailored for MonkDB or similar SQL environments.

## SQL Statement

```sql
FETCH [ direction [ FROM | IN ] ] cursor_name;
```

Where direction can be:

- `NEXT`: Fetches the next row (default behavior).
- `RELATIVE count`: Fetches rows relative to the current position.
- `ABSOLUTE position`: Jumps to a specific position in the result set.
- `ALL`: Fetches all remaining rows.
- `FORWARD count`: Fetches the next count rows.
- `BACKWARD count`: Moves back by count rows (requires `SCROLL` option in cursor declaration).

## Description

The `FETCH` command works with cursors created using the `DECLARE` statement. A cursor maintains a position within the result set, and the `FETCH` command retrieves rows relative to this position. After each fetch operation, the cursor's position is updated.

## Parameters
- **Direction**:
    - NEXT: Fetches the next row (default).
    - RELATIVE count: Fetches rows relative to the current position.
    - ABSOLUTE position: Jumps to a specific position and fetches one row. If outside bounds, an empty result is returned.
    - ALL: Fetches all remaining rows.
    - FORWARD count: Same as fetching the next count rows.
    - BACKWARD count: Moves backward by count rows (requires SCROLL).
- **count**: An integer specifying how many rows to fetch.
- **cursor_name**: The name of the open cursor from which rows are fetched.

## Behavior

- The cursor starts before the first row of the result set.
- After fetching, it moves to the last fetched row or beyond the bounds if fetching exceeds available rows.
- Moving backward or jumping to specific positions requires SCROLL capability in cursor declaration.

## Examples
### Example 1: Fetching Next Row

```sql
FETCH NEXT FROM my_cursor;
```

This retrieves the next row and moves the cursor forward.

### Example 2: Fetching Relative Rows

```sql
FETCH RELATIVE 3 FROM my_cursor;
```

Fetches three rows starting from the current position.

### Example 3: Absolute Position

```sql
FETCH ABSOLUTE 5 FROM my_cursor;
```

Jumps directly to the fifth row and fetches it.

### Example 4: Fetch All Remaining Rows

```sql
FETCH ALL FROM my_cursor;
```

Retrieves all remaining rows until the end of the result set.

### Example 5: Moving Backward

```sql
FETCH BACKWARD 2 FROM my_cursor;
```

Moves two rows back (requires SCROLL).

## Use Cases

- **Pagination**: Cursors combined with `FETCH` allow efficient pagination by retrieving subsets of results incrementally.
- **Iterative Processing**: `FETCH` is often used in loops for processing large datasets row by row.
- **Dynamic Positioning**: The ability to jump to absolute or relative positions provides flexibility for complex queries.

## Considerations

- Declaring cursors with SCROLL enables backward movement and absolute positioning.
- `FETCH` operations must align with cursor capabilities (e.g., `SCROLL` for backward movement).

---

## See Also

- [Declare](./41_DECLARE.md)


