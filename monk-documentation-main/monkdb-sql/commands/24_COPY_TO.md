# MonkDB: `COPY TO` Statement

A user may leverage the `COPY TO` statement to export table data to a file.

---

## SQL Statement

```sql
COPY table_ident [ PARTITION ( partition_column = value [ , ... ] ) ]
                 [ ( column [ , ...] ) ]
                 [ WHERE condition ]
                 TO DIRECTORY output_uri
                 [ WITH ( copy_parameter [= value] [, ... ] ) ]
```

---

## Description

The `COPY TO` command exports the contents of a table to one or more files into a specified directory with unique filenames. Each node with at least one shard of the table will export its contents onto its local disk.

The exported files are JSON-formatted, containing one table row per line. Due to the distributed nature of MonkDB, the files remain on the nodes where the shards are located.

**Example:**
```sql
COPY quotes TO DIRECTORY '/home/' WITH (compression='gzip');
```

```sql
COPY OK, 3 rows affected ...
```

---

### Notes:
- **Only user tables** can be exported. System tables like `sys.nodes` and blob tables are not supported by the `COPY TO` statement.
- The `COPY` statements use overload protection to ensure other queries can still perform. Adjust these settings during large exports if needed.

---

## Parameters

- **table_ident**- The name (optionally schema-qualified) of the table to be exported.
- **column**- (Optional) A list of column expressions that should be exported. 

**Example:**
```sql
COPY quotes (quote, author) TO DIRECTORY '/home/';
```

```sql
COPY OK, 3 rows affected ...
```

**Note:** Declaring columns changes the output format to JSON list format, which is not supported by the `COPY FROM` statement.

---

## Clauses

### **PARTITION**
If the table is partitioned, the optional `PARTITION` clause can be used to export data from a specific partition.

```sql
[ PARTITION ( partition_column = value [ , ... ] ) ]
```

#### Parameters:
- **partition_column:** One of the column names used for table partitioning.
- **value:** The respective column value.

All partition columns specified by the `PARTITIONED BY` clause must be listed inside parentheses along with their respective values using the syntax `partition_column = value`, separated by commas.

**Tip:** Use `SHOW CREATE TABLE` to view all partition columns defined by the `PARTITIONED BY` clause.

---

### **WHERE**
The `WHERE` clause uses the same syntax as SELECT statements, allowing partial exports.

**Example:**
```sql
COPY quotes WHERE category = 'documents' TO DIRECTORY '/home/';
```

```sql
COPY OK, 3 rows affected ...
```

---

### **TO**
The `TO` clause specifies an output location.

#### Syntax:
```sql
TO DIRECTORY output_uri_path
```

#### Parameters:
- **output_uri:** A string literal that is a well-formed URI. Supported URI schemes include:
  - **file**
  - **s3**
  - **az**

**Note:** If no URI scheme is provided, MonkDB assumes it is a pathname and prepends the `file://` scheme automatically. For example:
```
/home/file.json → file:///home/file.json
```

---

## URI Schemes

### **file**
Use the `file://` scheme to specify an absolute path to an output location on the local filesystem.

**Example:**

```cmd
file:///path/to/dir
```

**Tips:**

- If running MonkDB inside a container, ensure that the location is accessible within the container.
- On Windows, include the drive letter in the file URI:

```cmd
file://C:/home/export_data/comments.json
```

---

### **s3**
Use the `s3://` scheme to access buckets on Amazon S3 or compatible storage providers.

#### Syntax:
```cmd
s3://[<accesskey>:<secretkey>@][<host>:<port>/]<bucketname>/<path>
```

#### Example:
```sql
COPY t TO DIRECTORY 's3://myAccessKey:mySecretKey@s3.amazonaws.com:80/expBucket/key1' WITH (protocol = 'http');
```

If no credentials are provided, S3 operates in anonymous mode. Ensure secret keys are URL encoded if they contain special characters like `/`, `+`, or `=`.

---

### **az**
Use the `az://` scheme to access files on Azure Blob Storage.

#### Syntax:
```cmd
az://<account>.<endpoint_suffix>/<container>/<blob_path>
```

#### Example:
```sql
COPY source TO DIRECTORY 'az://myaccount.blob.core.windows.net/exp-container/dir1/dir2/file1.json' WITH (key = 'key');
```

Provide either an account key (`key`) or SAS token (`sas_token`) for authentication. The protocol defaults to HTTPS unless specified otherwise.

---

## WITH Clause

You can use the optional `WITH` clause to specify copy parameter values.

#### Syntax:
```
[ WITH ( copy_parameter [= value] [, ... ] ) ]
```

### Supported Parameters:

| Parameter          | Type     | Default        | Description                                                                 |
|--------------------|----------|----------------|-----------------------------------------------------------------------------|
| **compression**    | text     | Not compressed | Specifies compression format (`gzip`).                                     |
| **protocol**       | text     | https          | Protocol for S3 and Azure Blob Storage (`http`, `https`).                  |
| **format**         | text     | Depends on columns | Output format (`json_object`, `json_array`).                               |
| **wait_for_completion** | boolean  | true          | Waits for completion if set to true; runs in background otherwise.         |
| **key**            | text     | -              | Azure Storage Account Key; required if SAS token is not provided.          |
| **sas_token**      | text     | -              | SAS token for Azure Blob Storage; alternative to account key.              |

---

## Examples

### Exporting Data Locally
Export all rows from a table as JSON objects into `/home/` directory:
```sql
COPY quotes TO DIRECTORY '/home/' WITH (compression='gzip');
COPY OK, 3 rows affected ...
```

### Exporting Specific Columns
Export only specific columns (`quote`, `author`) from a table:
```sql
COPY quotes (quote, author) TO DIRECTORY '/home/';
COPY OK, 3 rows affected ...
```

### Exporting Partitioned Data
Export data from a specific partition (`year = 2025`, `region = 'Asia'`) into `/home/` directory:
```sql
COPY sales_data PARTITION (year = 2025, region = 'Asia') TO DIRECTORY '/home/';
COPY OK, 2 rows affected ...
``` 

### Exporting Data with WHERE Clause
Export only rows where category equals "philosophy":
```sql
COPY quotes WHERE category = 'philosophy' TO DIRECTORY '/home/';
COPY OK, 3 rows affected ...
``` 

### Exporting Data to S3
Export data to an S3 bucket using credentials:
```sql
COPY quotes TO DIRECTORY 's3://myAccessKey:mySecretKey@s3.amazonaws.com/expBucket/data/' WITH (protocol='https');
COPY OK, 5 rows affected ...
``` 
---

## 📋 Notes

- **Local File Access**: When using `file://` URIs, ensure that the destination path is writable by the MonkDB process and accessible on each node that holds shards.
- **Distributed Export**: Data is exported independently on each node that holds table shards. This may result in multiple files spread across nodes.
- **Format Compatibility**:
  - If you specify columns to export, the output is a **JSON array** format.
  - Without column specification, each line in the file is a **JSON object**, which is compatible with `COPY FROM`.
- **Overload Protection**: The `COPY` command includes overload protection to ensure it doesn’t impact cluster health. Adjust runtime settings if exporting large tables.
- **Blob and System Tables**: System tables and blob tables are **not supported** for export.
- **Compression**: When using compression (e.g. `gzip`), each file is compressed independently on each node.
- **Authentication**: For S3 and Azure targets, proper credentials (`accesskey/secretkey`, `sas_token`, or `key`) must be configured either inline or at the node level.

---

## 🔐 Permissions

- **Table Access**: User must have `READ` privileges on the target table.
- **Node File Access**:
  - For `file://` URIs, MonkDB must have OS-level write access to the specified path.
  - For `s3://` or `az://` URIs, valid credentials must be configured per node or specified inline in the URI.

---

## 🏁 Summary

| Feature                     | Supported                                             |
|-----------------------------|-------------------------------------------------------|
| Export Format               | JSON (object or array)                                |
| Compression Support         | ✅ (e.g., `gzip`)                                      |
| Partition Export            | ✅ (via `PARTITION` clause)                            |
| Conditional Export          | ✅ (via `WHERE` clause)                                |
| Column Selection            | ✅ (changes format to JSON array)                     |
| Output to Local Disk        | ✅ `file://`                                           |
| Output to S3                | ✅ `s3://`                                             |
| Output to Azure Blob        | ✅ `az://`                                             |
| Requires Table Read Access  | ✅                                                    |
| Writes Per Node             | ✅ Export files created locally on each node          |

---

