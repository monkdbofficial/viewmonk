# MonkDB: `ALTER CLUSTER` Statement

The `ALTER CLUSTER` SQL statement in MonkDB is used to perform administrative operations on the MonkDB cluster. This includes shard rerouting, node decommissioning, swapping tables, and garbage collecting temporary artifacts.

> ⚠️ **Only superusers can execute this command.**

---

## SQL Statement

```sql
ALTER CLUSTER
  { REROUTE RETRY FAILED
  | DECOMMISSION <nodeId | nodeName>
  | SWAP TABLE source TO target [ WITH ( expr = expr [, ...] ) ]
  | GC DANGLING ARTIFACTS
  }
```

## 🚀 Subcommands

### 1. REROUTE RETRY FAILED

Retries allocation of shards that previously failed after reaching the maximum number of attempts (allocation.max_retries). Useful when a transient issue caused allocation failure, and the environment has since recovered.

#### ✅ Example

```sql
ALTER CLUSTER REROUTE RETRY FAILED;
```

### 2. DECOMMISSION <nodeId | nodeName>

Gracefully decommissions a MonkDB node. The specified node will be removed from the cluster after relocating its data to other nodes.

> 🛑 **Do not force-shutdown the node during this process.**

#### ✅ Example (by node name)

```sql
ALTER CLUSTER DECOMMISSION 'monkdb-data-node-1';
```

#### ✅ Example (by node ID)

```sql
ALTER CLUSTER DECOMMISSION 'abcdsdeferexxxxx12324dss';
```

### 3. SWAP TABLE

Atomically swaps the names of two tables. Optionally drops the old source table post-swap.

> ⚠️ **The tables must exist and have the same schema (i.e., compatible mappings and settings).**

#### ✅ Syntax

```sql
ALTER CLUSTER SWAP TABLE source_table TO target_table
[ WITH (drop_source = true | false) ]
```
**drop_source (optional):**

- **true**: Drop the source table after swap.
- **false (default)**: Keep both tables with names swapped.

#### ✅ Example: Atomic Table Swap (Keep Source)

```sql
ALTER CLUSTER SWAP TABLE new_orders TO current_orders;
```

#### ✅ Example: Atomic Table Swap (Drop Source)

```sql
ALTER CLUSTER SWAP TABLE staging_events TO production_events WITH (drop_source = true);
```

### 4. GC DANGLING ARTIFACTS

Cleans up leftover or temporary artifacts that might remain in the cluster metadata due to aborted or failed DDL operations.

> Great for cluster hygiene and avoiding unnecessary storage usage.

#### ✅ Example

```sql
ALTER CLUSTER GC DANGLING ARTIFACTS;
```

---

## ⚙️ Notes

- Only superusers can execute `ALTER CLUSTER`.
- Most operations are asynchronous and may take time depending on the cluster state.
- Swapping tables causes short-term unavailability of shards.

---

## 🔐 Permissions

- Must be executed by an existing superuser in the MonkDB cluster.
- Cannot be executed by standard or read-only users.

---

## End note

| Subcommand                     | Purpose                                   | Requires Superuser |
|-------------------------------|-------------------------------------------|---------------------|
| REROUTE RETRY FAILED          | Retry failed shard allocation             | ✅                  |
| DECOMMISSION                   | Gracefully remove node from cluster       | ✅                  |
| SWAP TABLE                    | Atomically rename two tables              | ✅                  |
| GC DANGLING ARTIFACTS        | Clean up temporary or abandoned objects    | ✅                  |
