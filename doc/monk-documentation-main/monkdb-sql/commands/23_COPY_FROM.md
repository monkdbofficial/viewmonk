# MonkDB: `COPY FROM` Statement

The `COPY FROM` statement in MonkDB facilitates the bulk import of data from files into database tables. This command supports both JSON and CSV file formats and is designed to handle large datasets efficiently.

---

## SQL Statement

```sql
COPY table_identifier
  [ ( column_ident [, ...] ) ]
  [ PARTITION (partition_column = value [, ...]) ]
  FROM uri [ WITH ( option = value [, ...] ) ] [ RETURN SUMMARY ];
```

## 🚀 Description

The COPY FROM statement imports data from a specified URI into the designated table. Each node in the MonkDB cluster attempts to read the files available at the URI and import the data. 

Example:

```sql
COPY comments FROM 'file:///tmp/data/comments.json';
```

## 📂 File Formats

MonkDB accepts both JSON and CSV inputs. The format is inferred from the file extension (.json or .csv) if possible. Alternatively, the format can be specified explicitly using the WITH clause. If the format is not specified and cannot be inferred, the file is processed as JSON. ​

### JSON Files:

- Must contain a single JSON object per line.​
- Must be UTF-8 encoded.​
- Empty lines are skipped.​

**Example JSON data**:

```json
{"id": 1, "comment": "hello, this is great"}
{"id": 2, "comment": "hello, this is not good, and need a review."}
```

### CSV Files:

- May or may not contain a header.​
- If a header is present, it defines the column names.​
- If no header is present, columns are imported in the order defined by the table schema.​

**Example CSV data with header:**

```csv
id,comment
1,"hello, this is great"
2,"hello, this is not good, and need a review."
```

**Example CSV data without header**:

```csv
1,"hello, this is great"
2,"hello, this is not good, and need a review."
```

## 🔍 Data Type Verification

MonkDB verifies that the data types of the columns in the import file match the table's schema. It attempts to cast the data types accordingly and enforces all column constraints. For instance, a `WKT` string cannot be imported into a column of geo_shape or geo_point type, as there is no implicit cast to the GeoJSON format. ​

**Note**: If the `COPY FROM` statement encounters an error, the log output on the node will display an error message. Any data that was imported prior to the failure will have been written to the table and should be removed before attempting to restart the import process.

## 🔧 Parameters

- `table_ident`: The name (optionally schema-qualified) of the table into which data will be imported.​
- `column_ident`: Optional list of column names to import data into. If not specified, data is imported into all columns.​
- `uri`: The URI(s) of the file(s) to import. Supports `file://`, `s3://`, `az://`, and other schemes. They are described [below](#-uri-globbing).​

## 🌐 URI Globbing

With file and s3 URI schemes, pathname globbing (i.e., * wildcards) can be used in the `COPY FROM` statement to construct URIs that match multiple directories and files. For example, using `file:///home/data/*/*.json` as the URI would match all JSON files located in subdirectories of the /home/data directory. ​

**Matching files**:

- /home/data/key/1.json​
- /home/data/value/2.json​
- /home/data/1/box.json​

However, these files would not match:

- /home/data/1.json (two few subdirectories)
- /home/data/key/value/2.json (too many subdirectories)
- /home/data/1/box.js (file extension mismatch)

We support file, s3, az and other schemes.

### file

The `file://` scheme allows users to specify an absolute path to one or more files that are accessible via the local filesystem of one or more MonkDB nodes. This scheme is particularly useful for importing data into MonkDB tables using the `COPY FROM` statement. Files must be accessible on at least one node, and the system user running the MonkDB process must have read access to the specified files. Additionally, only the MonkDB superuser is permitted to use the `file://` scheme.

Files must be accessible on at least one node, and the system user running the MonkDB process must have read access to each specified file. Furthermore, only the MonkDB superuser is permitted to utilize the `file://` scheme.

By default, every node will attempt to import all specified files. If a file is available on multiple nodes, you can set the `shared` option to `true` to prevent duplicate imports.

For Windows systems, use the below method to import files.

```cmd
file://C:\/home/data/comments.json
```

### s3

A user can leverage `s3://` scheme to access contents from **AWS S3** bucket(s). 

S3-compatible storage providers can be specified using an optional pair of host and port, which defaults to Amazon S3 if not explicitly provided. For example:

```sql
COPY t FROM 's3://access_Key:secret_Key@s3.amazonaws.com:443/customer_bucket/keys/abc.json' WITH (protocol = 'https')
```

This demonstrates how to import data from an S3-compatible source into a MonkDB table using the `COPY` statement. The protocol option ensures secure HTTPS communication for the transfer.

The operation with S3s would happen in anonymous mode if the credentials aren't set.

> A secretkey provided by Amazon Web Services can contain characters such as ‘/’, ‘+’ or ‘=’. These characters must be URL encoded. For a detailed explanation read the official [AWS documentation](https://docs.aws.amazon.com/AmazonS3/latest/API/RESTAuthentication.html). 

### az

You may use `az://` scheme to access contents/blobs from **Azure Blob Storage**. The URI to access AZ storage must be like this `URI must look like az:://<your_account>.<your_endpoint_suffix>/<your_container>/<your_blob_path>.`. For example `az://testaccount.blob.core.windows.net/test-container/testdir1/testdir2/testfile.json`

Azure supports `key` or `sas_token` based authentication. Hence, you must provide either of them in the `WITH` clause.

A protocol may be provided in the `WITH` clause, otherwise `https` is used by default.

```sql
COPY t
FROM 'az://testaccount.blob.core.windows.net/test-container/testdir1/testdir2/testfile.json'
WITH (
    key = 'key'
)
```

### Other schemes supported by MonkDB

In addition to the three schemes described above, MonkDB supports all protocols supported by the URL implementation of its JVM (typically `http`, `https`, `ftp`, and `jar`). Please refer to the documentation of the JVM vendor for an accurate list of supported protocols.


## 🛠️ Clauses

### PARTITION

If a table is partitioned, the optional `PARTITION` clause can be used to import data into a specific partition. The syntax is as follows:

```
[ PARTITION ( partition_column = value [ , ... ] ) ]
```

#### Key Components:
- **partition_column**: A column name used for table partitioning.
- **value**: The corresponding value for the partition column.

All partition columns defined in the `PARTITIONED BY` clause must be included in the parentheses, along with their respective values, using the `partition_column = value` syntax, separated by commas. Since each partition corresponds to a unique set of row values for the partition columns, this clause uniquely identifies a single partition for data import.

#### Example:
Suppose a table `sales` is partitioned by the `year` and `region` columns:

```sql
CREATE TABLE sales (
  id INT,
  product TEXT,
  region TEXT,
  amount DOUBLE
)
PARTITIONED BY (region);
```

To import data into the partition where `region = 'us_west'`, you would run:

```sql
COPY sales
PARTITION (region = 'us_west')
FROM 'file:///tmp/sales_west.json'
WITH (format = 'json')
RETURN SUMMARY;
```

> Partitioned tables do not retain the values of the partition columns for each individual row. Consequently, every row will be imported into the designated partition, irrespective of the values assigned to the partition columns.

### WITH

You can use the optional `WITH` clause to specify option values in the `COPY FROM` statement. The syntax is as follows:

```sql
[ WITH ( option = value [, ...] ) ]
```

### Supported Options

- **bulk_size**
    - *Type:* integer
    - *Default:* 10000
    - *Optional:* Yes
    - MonkDB processes the lines it reads from the path in bulk. This option specifies the size of each batch, and the provided value must be greater than 0.

  **Example:**
  ```sql
  COPY quotes FROM 'file:///home/import_data/comments.json' WITH (bulk_size = 5000);
  ```

- **fail_fast**
    - *Type:* boolean
    - *Default:* false
    - *Optional:* Yes
    - Indicates whether the `COPY FROM` operation should abort early after encountering an error. Due to distributed execution, it may continue processing some records before aborting.

  **Example:**
  ```sql
  COPY quotes FROM 'file:///home/import_data/comments.json' WITH (fail_fast = true);
  ```

- **wait_for_completion**
    - *Type:* boolean
    - *Default:* true
    - *Optional:* Yes
    - Indicates if the `COPY FROM` should wait for the copy operation to complete. If set to false, the request returns immediately, and the copy operation runs in the background.

  **Example:**
  ```sql
  COPY quotes FROM 'file:///home/import_data/comments.json' WITH (wait_for_completion = false);
  ```

- **shared**
    - *Type:* boolean
    - *Default:* Depends on the scheme of each URI.
    - *Optional:* Yes
    - Set to `true` if the URI location is accessible by more than one MonkDB node to prevent importing the same file multiple times.

- **node_filters**
    - *Type:* text
    - *Optional:* Yes
    - A filter expression to select nodes for executing the read operation. It takes the form:
    ```json
    {
        name = '<node_name_regex>',
        id = '<node_id_regex>'
    }
    ```
    Only one key is required.

- **num_readers**
    - *Type:* integer
    - *Default:* Number of nodes available in the cluster.
    - *Optional:* Yes
    - Specifies how many nodes will read resources specified in the URI. The value must be greater than zero.

- **compression**
    - *Type:* text
    - *Values:* gzip
    - *Default:* Not compressed.
    - *Optional:* Yes
    - Defines whether and how exported data should be compressed.

- **protocol**
    - *Type:* text
    - *Values:* http, https
    - *Default:* https
    - *Optional:* Yes
    - Protocol to use, applicable for `s3` and `az` schemes only.

- **overwrite_duplicates**
    - *Type:* boolean
    - *Default:* false
    - *Optional:* Yes
    - By default, `COPY FROM` does not overwrite rows if a document with the same primary key already exists. Set to `true` to overwrite duplicate rows.

- **empty_string_as_null**
    - *Type:* boolean
    - *Default:* false
    - *Optional:* Yes
    - Converts empty strings into `NULL` when set to true. This option is only supported when using `CSV` format.

- **delimiter**
    - *Type:* text
    - *Default:* ,
    - *Optional:* Yes
    - Specifies a single one-byte character that separates columns within each line of a file, applicable only for `CSV` format.

- **format**
    - *Type:* text
    - *Values:* csv, json
    - *Default:* json
    - Specifies the format of the input file. If not specified and cannot be inferred from the file extension, it will be processed as `JSON`.

- **header**
    - *Type:* boolean
    - *Default:* true
    - *Optional:* Yes
    - Indicates if the first line of a `CSV` file contains a header with column names. If set to false, it must not contain column names in the first line.

**Example of Using Header Option**:
```sql
COPY quotes FROM 'file:///home/import_data/comments.csv' WITH (format='csv', header=false);
```

- **skip**
    - *Type*: integer 
    - *Default*: `0`
    - *Optional*: Yes 
    - Skips the first n rows while copying. If using this option to skip a header, set `header = false` as well.

**Example**:
```sql
COPY quotes FROM 'file:///home/import_data/comments.csv' WITH (skip=1, header=false);
```

- **key** 
    - *Type*: text 
    - *Optional*: Yes 
    - Used for az scheme only; it is required if `sas_token` is not provided.

- **sas_token** 
    - *Type*: text 
    - *Optional*: Yes 
    - Used for az scheme only; provides authentication for Azure Storage accounts as an alternative to the Azure Storage Account Key. 
    - It is required if `key` is not provided.

### RETURN SUMMARY

By using the optional `RETURN SUMMARY` clause, a per-node result set will be returned containing information about any possible failures and successfully inserted records.

### Syntax
```
[ RETURN SUMMARY ]
```

### Returned Columns

| Column Name                     | Description                                                                                  | Return Type |
|---------------------------------|----------------------------------------------------------------------------------------------|-------------|
| **node**                        | Information about the node that has processed the URI resource.                             | OBJECT      |
| **node['id']**                  | The ID of the node.                                                                         | TEXT        |
| **node['name']**                | The name of the node.                                                                       | TEXT        |
| **uri**                         | The URI that the node has processed.                                                        | TEXT        |
| **error_count**                 | The total number of records that failed. A NULL value indicates a general URI reading error, and the error will be listed inside the `errors` column. | BIGINT      |
| **success_count**               | The total number of records that were inserted. A NULL value indicates a general URI reading error, and the error will be listed inside the `errors` column. | BIGINT      |
| **errors**                      | Contains detailed information about all errors, limited to at most 25 error messages.      | OBJECT      |
| **errors[ERROR_MSG]**           | Contains information about a specific type of error.                                      | OBJECT      |
| **errors[ERROR_MSG]['count']**  | The number of records that failed with this error.                               | BIGINT      |
| **errors[ERROR_MSG]['line_numbers']** | The line numbers of the source URI where the error occurred, limited to the first 50 errors to avoid buffer pressure on clients. | ARRAY       |

### Example Usage
To illustrate how to use the `RETURN SUMMARY` clause, consider a simple example where you have a `users` table and a CSV file containing several records:

```sql
CREATE TABLE "doc"."users" (
    "id" INTEGER,
    "name" TEXT,
    "country" TEXT
);
```

If you attempt to import the following records:

```csv
"id","name","country"
"1", "Ana", "DE"
"2", "Sara", "DE"
"\\", "Peter", "DE"
```

You can execute the following command:

```sql
COPY "doc"."users" FROM 'file:///path/to/users.csv' RETURN SUMMARY;
```

The output might indicate:

```sql
COPY OK, 2 records affected (1.1 seconds)
```

However, upon inspecting the `errors` field in the output using `RETURN SUMMARY`, you can see that the third row wasn’t imported due to an error (e.g., invalid ID format). This output provides valuable information about how many records failed and where those errors occurred.

Using this optional clause is highly recommended whenever you run your queries in MonkDB, as it helps identify and troubleshoot issues during data imports effectively.

## 📋 Notes

- **Node Behavior**: Each node in the MonkDB cluster attempts to read the file(s) independently. Ensure the path or bucket is accessible across all nodes if you're not using the `shared = true` option.
- **Partial Imports**: If an error occurs during import, rows already imported remain in the table. You should manually clean up partial imports if necessary.
- **File Access**: URIs must be accessible from the database cluster. Use `file://` for local files and `s3://` for Amazon S3. It is same for Azure (`az://`)
- **Performance**: Use the `bulk_size` and `compression` options in the `WITH` clause to optimize large imports.
- **Format Detection**: If the file format is not explicitly defined using `WITH (format = ...)`, MonkDB attempts to infer it from the file extension or defaults to `json`.

---

## 🔐 Permissions

- **Execution Rights**: The user must have `INSERT` privileges on the target table.
- **Cluster Access**: The node running the import must have OS-level access to the file path (for `file://`) or S3 credentials configured (for `s3://`). It is same for Azure (`az://`)

---

## 🏁 Summary

| Command     | Description                                         | Requires Special Permissions | Format Support | Supports Summary |
|-------------|-----------------------------------------------------|------------------------------|----------------|------------------|
| `COPY FROM` | Bulk-import data from files into a table            | INSERT privilege             | JSON, CSV      | ✅ Yes           |

