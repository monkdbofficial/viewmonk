# MonkDB: `DISCARD` Statement

The `DISCARD` statement in MonkDB is used to release session resources, offering a way to reset or clean up session state. 

## SQL Statement

```sql
DISCARD { ALL | PLANS | SEQUENCES | TEMPORARY | TEMP }
```

## Description

The `DISCARD` command provides options to release various types of resources within a database session. It supports the following subcommands:

- `ALL`- Discards all session-related state.
- `PLANS`- Discards prepared statement plans (MonkDB currently doesn’t cache these, so this is mostly a no-op).
- `SEQUENCES`- Resets sequence-related state. 
- `TEMPORARY` or `TEMP`- Drops all temporary tables in the current session.

The other variations of the statement are irrelevant because MonkDB does not utilize query plan caching, lacks sequences, and does not support temporary tables.

## Examples

### Example 1. Discard all session state

```sql
DISCARD ALL;
```
Resets session to its initial state: drops temporary tables, resets sequences, discards prepared plans.

### Example 2. Discard just temporary tables

```sql
DISCARD TEMPORARY;
```

or

```sql
DISCARD TEMP;
```

Useful if you want to remove all temporary tables created in the session without affecting other states.

### Example 3. Discard sequences state

```sql
DISCARD SEQUENCES;
```

Resets sequence-related information like cached values.

### Example 4. Discard query plans

```sql
DISCARD PLANS;
```

Intended to remove cached execution plans, though this is generally a no-op in MonkDB because it doesn't use cached plans the same way other DBMSs do.

`DISCARD` is usually used in backend applications, connection pools, or long-lived sessions to clean up resources. MonkDB doesn’t fully implement all Postgres-style session management features, so some `DISCARD` options may be placeholders or limited in utility.

