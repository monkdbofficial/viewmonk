# MonkDB: `CREATE ANALYZER` Statement

Defines a new fulltext analyzer for use in text search operations. Analyzers process text data into tokens for efficient indexing and querying.

---

## SQL Statement

### Extending an Existing Analyzer

```sql
CREATE ANALYZER analyzer_name EXTENDS parent_analyzer_name
    WITH ( override_parameter [= value] [, ... ] )
```

### Creating a New Analyzer

```sql
CREATE ANALYZER analyzer_name (
    [ TOKENIZER
      {
          tokenizer_name
        | custom_name WITH ( type = tokenizer_name, tokenizer_parameter [= value] [, ... ] )
      }
    ]
    [ TOKEN_FILTERS (
        {
            token_filter_name
          | custom_name WITH ( type = token_filter_name, token_filter_parameter [= value] [, ... ] )
        }
        [, ... ]
      )
    ]
    [ CHAR_FILTERS (
        {
            char_filter_name
          | custom_name WITH ( type = char_filter_name, char_filter_parameter [= value] [, ... ] )
        }
        [, ... ]
      )
    ]
)
```

---

## Parameters

| Parameter                | Description                                                                 |
|--------------------------|-----------------------------------------------------------------------------|
| **analyzer_name**        | Unique name for the analyzer.                                               |
| **parent_analyzer_name** | Base analyzer to inherit from (for `EXTENDS`).                              |
| **override_parameter**   | Parameter of the parent analyzer to override.                               |
| **tokenizer_name**       | Built-in tokenizer name (e.g., `standard`, `ngram`).                        |
| **tokenizer_parameter**  | Tokenizer-specific configuration (e.g., `min_gram`, `max_gram`).            |
| **token_filter_name**    | Built-in token filter (e.g., `lowercase`, `kstem`).                         |
| **token_filter_parameter** | Token filter configuration.                                             |
| **char_filter_name**     | Built-in character filter (e.g., `html_strip`, `mapping`).                  |
| **char_filter_parameter**| Character filter configuration.                                             |
| **custom_name**          | Unique identifier for a tokenizer/token-filter/char-filter with parameters. |

---

## Description

### Key Features:
- **Tokenizers**: Split text into tokens (e.g., by whitespace, n-grams).
- **Token Filters**: Modify tokens (e.g., lowercase, stemming).
- **Char Filters**: Pre-process text (e.g., strip HTML tags, replace characters).

---

## Examples

### Basic Analyzer with Built-in Components
Creates an analyzer that:
1. Tokenizes using whitespace.
2. Converts tokens to lowercase.
3. Applies the `kstem` filter for English stemming.
4. Strips HTML tags.

```sql
CREATE ANALYZER testanalyzer (
    TOKENIZER whitespace,
    TOKEN_FILTERS (lowercase, kstem),
    CHAR_FILTERS (html_strip)
);
```

---

### Custom Tokenizer with Parameters
Creates an analyzer using a custom `ngram` tokenizer with parameters:

```sql
CREATE ANALYZER my_ngram_analyzer (
    TOKENIZER my_ngram WITH (
        type = 'ngram',
        min_gram = 2,
        max_gram = 10
    )
);
```

---

### Extending a Built-in Analyzer
Extends the `snowball` analyzer to use German language rules:

```sql
CREATE ANALYZER "german_snowball" EXTENDS snowball WITH (
    language = 'german'
);
```

---

### Custom Char Filter with Mappings
Replaces `ph` → `f`, `qu` → `q`, etc.:

```sql
CREATE ANALYZER mymapping_analyzer (
    CHAR_FILTERS (
        mymapping WITH (
            type = 'mapping',
            mappings = ['ph=>f', 'qu=>q', 'foo=>bar']
        )
    )
);
```

---

### Full Example with All Components
```sql
CREATE ANALYZER advanced_analyzer (
    TOKENIZER whitespace,
    TOKEN_FILTERS (
        lowercase,
        custom_stemmer WITH (type = 'kstem')
    ),
    CHAR_FILTERS (
        html_strip,
        my_mapping WITH (
            type = 'mapping',
            mappings = ['I=>1', 'II=>2']
        )
    )
);
```

---

### Extending a Custom Analyzer
Overrides the tokenizer of `myanalyzer` while retaining its other components:

```sql
CREATE ANALYZER e2 EXTENDS myanalyzer (
    TOKENIZER mypattern WITH (
        type = 'pattern',
        pattern = '.*'
    )
);
```

---

## Important Notes
1. **Reserved Names**: Avoid using built-in tokenizer/filter names directly. Use `custom_name WITH (type = 'builtin_name')`.
2. **Existing Tables**: Existing tables continue using the old analyzer definition. Reindexing is required to apply changes.
3. **Validation**: Use `EXPLAIN ANALYZE` to test analyzer behavior before production use.

---

## Built-in Components
Commonly used components for reference:

### Tokenizers
- `standard`: Splits text into words.
- `ngram`: Splits text into n-grams (configure with `min_gram`/`max_gram`).
- `whitespace`: Splits text on whitespace.

### Token Filters
- `lowercase`: Converts tokens to lowercase.
- `kstem`: English-language stemming.
- `stop`: Removes stopwords.

### Char Filters
- `html_strip`: Removes HTML tags.
- `mapping`: Replaces characters via a map (e.g., `ph=>f`).

## 📋 Notes

- **Analyzer Uniqueness**: Analyzer names must be unique within the cluster. Attempting to create an analyzer with an existing name will result in an error.
- **Reindexing Requirement**: Changes to analyzer definitions do **not** automatically affect existing data. Reindexing is required for changes to take effect on previously indexed documents.
- **Component Naming Best Practices**:
  - Avoid reusing names of built-in components directly. Use a custom name and assign a `type`.
  - Example:
    ```sql
    TOKENIZER my_tokenizer WITH (type = 'standard')
    ```
- **Dynamic Use in Table Schema**:
  - Analyzers can be assigned to fulltext columns in table definitions using `INDEX USING fulltext WITH (analyzer = 'my_analyzer')`.
- **Validation & Testing**:
  - Use `EXPLAIN ANALYZE` or sample indexing workflows to test custom analyzer behavior before applying in production.

---

## 🔐 Permissions

- **Execution Rights**: The user must have the `DDL` (Data Definition Language) privilege to execute `CREATE ANALYZER`.
- **Cluster Scope**: Analyzer definitions are global to the cluster and available to all users and schemas once created.

---

## 🏁 Summary

| Feature                       | Supported                                 |
|-------------------------------|-------------------------------------------|
| Custom Analyzers              | ✅ Yes                                     |
| Extend Built-in Analyzers     | ✅ Yes (via `EXTENDS`)                     |
| Override Built-in Components  | ✅ Yes (tokenizer, token filters, etc.)    |
| Use in Fulltext Columns       | ✅ Yes                                     |
| Reindex Required for Updates  | ✅ Yes                                     |
| Requires DDL Privilege        | ✅ Yes                                     |
| Global Scope                  | ✅ Yes (cluster-wide availability)         |

---

## See Also

- [Drop an analyzer](./45_DROP_ANALYSER.md)
