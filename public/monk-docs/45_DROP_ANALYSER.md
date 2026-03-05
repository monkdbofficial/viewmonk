# MonkDB: `DROP ANALYZER` Statement

The `DROP ANALYZER` statement is used to remove a custom analyzer from the MonkDB cluster.

## SQL Statement

```sql
DROP ANALYZER analyzer_ident;
```

Where `analyzer_ident` is the name of the custom analyzer to be deleted.


## Description

Custom analyzers in MonkDB are user-defined components that process text for full-text search purposes. These analyzers typically consist of tokenizers, token filters, and character filters. Once created, they can be applied to full-text indices for tables. The `DROP ANALYZER` statement allows users to remove such analyzers when they are no longer needed.

When executed, the analyzer is removed from the cluster, and any full-text indices that depend on it will no longer function correctly unless reconfigured with another analyzer.

## Example

### Create a Custom Analyzer

```sql
CREATE ANALYZER firstname_synonyms (
    TOKENIZER lowercase,
    TOKEN_FILTERS (
        _ WITH (
            type = 'synonym',
            synonyms_path = 'synonyms-solr.txt'
        )
    )
);
```

The `CREATE ANALYZER` statement defines a new analyzer named `firstname_synonyms`, which uses a synonym file (synonyms-solr.txt) for token filtering.

### Drop the Custom Analyzer

```sql
DROP ANALYZER firstname_synonyms;
```

The `DROP ANALYZER` statement removes this analyzer from the cluster.

## Considerations

- Dropping an analyzer will affect any indices relying on it. Ensure that no active tables or queries depend on the analyzer before removing it.
- MonkDB does not support editing an existing analyzer directly. If modifications are required, you must drop the existing analyzer and recreate it with updated parameters
- If you attempt to drop an analyzer that does not exist, MonkDB will raise an error unless handled with additional logic (e.g., checking existence beforehand).

---

## See Also

- [Create an analyzer](./25_CREATE_ANALYSER.md)