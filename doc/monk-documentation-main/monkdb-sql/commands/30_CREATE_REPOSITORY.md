# MonkDB: `CREATE REPOSITORY` Statement

The `CREATE REPOSITORY` statement is used to register a new repository, which serves as a storage location for creating, managing, and restoring snapshots of your MonkDB data.

---

## SQL Statement

```sql
CREATE REPOSITORY repository_name TYPE type
[ WITH (parameter_name [= value], [, ...]) ]
```

---

## Description

The `CREATE REPOSITORY` statement registers a repository with a specified name and type. Additional parameters can be configured using the `WITH` clause, depending on the repository type.

**Note:** If the underlying storage backend already contains MonkDB snapshots, they will automatically become available to the cluster upon repository creation.

### Parameters
- **repository_name**: The name of the repository to register.
- **type**: The repository type (e.g., `fs`, `s3`, `azure`, `gcs`, `url`).

### Important Considerations
- Repository parameters cannot be changed after creation. To modify parameters, you must first drop the repository using `DROP REPOSITORY` and then recreate it with the updated configuration.
- Dropping a repository removes its record from `sys.repositories` but does not delete the snapshots from the backend storage. If you create a new repository using the same backend storage, the existing snapshots will become available again.

---

## Clauses

### WITH

Use the `WITH` clause to specify repository-specific parameters:

```sql
[ WITH (parameter_name [= value], [, ...]) ]
```


### Common Parameters (Applicable to All Repository Types)

- **max_restore_bytes_per_sec**
    - *Type:* bigint
    - *Default:* `40mb`
    - The maximum rate (in bytes per second) at which a single MonkDB node will read snapshot data from this repository during a restore operation. Setting the value to `0` disables throttling. Note that the rate is also subject to throttling via the recovery settings.
- **max_snapshot_bytes_per_sec**
    - *Type:* bigint
    - *Default:* `40mb`
    - The maximum rate (in bytes per second) at which a single MonkDB node will write snapshot data to this repository during a snapshot operation. Setting the value to `0` disables throttling.

---

## Repository Types

MonkDB supports the following built-in repository types:

- `fs`
- `s3`
- `azure`
- `gcs`
- `url`

Additional repository types can be supported via plugins.

---

## 1. `fs` Repository

The `fs` repository stores snapshots on the local file system. In a multi-node cluster, a shared data storage volume must be mounted locally on all master and data nodes.

**Note:** You must configure the list of allowed file system paths using the `path.repo` setting in your MonkDB configuration file (`monkdb.yml`).

### Parameters

- **location**
    - *Type:* text
    - *Required:* Yes
    - An absolute or relative path to the directory where MonkDB will store snapshots. If the path is relative, MonkDB will append it to the first entry in the `path.repo` setting. Windows UNC paths are allowed if the server name and shares are specified with escaped backslashes.
- **compress**
    - *Type:* boolean
    - *Default:* `true`
    - Specifies whether MonkDB should compress the metadata part of the snapshot. The actual table data is not compressed.
- **chunk_size**
    - *Type:* bigint or text
    - *Default:* `null`
    - Defines the maximum size of any single file within the snapshot. If set to `null`, MonkDB will not split large files into smaller chunks. You can specify the chunk size with units (e.g., `1g`, `5m`, `9k`). If no unit is specified, the unit defaults to bytes.

### Example

```sql
CREATE REPOSITORY my_fs_repo TYPE fs
WITH (location = '/mnt/snapshots', compress = true);
```


---

## 2. `s3` Repository

The `s3` repository stores snapshots on Amazon Simple Storage Service (Amazon S3) or S3-compatible storage.

**Note:** If you are using IAM roles, leave the `access_key` and `secret_key` parameters undefined. Ensure the IAM role is attached to each EC2 instance running a MonkDB master or data node.

### Parameters

- **access_key**
    - *Type:* text
    - *Required:* No (use IAM roles instead)
    - The access key for authentication against AWS.  This parameter is masked in `sys.repositories`.
- **secret_key**
    - *Type:* text
    - *Required:* No (use IAM roles instead)
    - The secret key for authentication against AWS. This parameter is masked in `sys.repositories`.
- **endpoint**
    - *Type:* text
    - *Default:* The default AWS API endpoint
    - The AWS API endpoint to use. You can specify a regional endpoint to force the use of a specific AWS region.
- **protocol**
    - *Type:* text
    - *Values:* `http`, `https`
    - *Default:* `https`
    - The protocol to use for communication with S3.
- **bucket**
    - *Type:* text
    - The name of the Amazon S3 bucket to use for storing snapshots. MonkDB will attempt to create the bucket if it does not exist.
- **base_path**
    - *Type:* text
    - *Default:* The root directory
    - The bucket path to use for snapshots. Must be a relative path (i.e., not start with `/`).
- **compress**
    - *Type:* boolean
    - *Default:* `true`
    - Specifies whether MonkDB should compress the metadata part of the snapshot.
- **chunk_size**
    - *Type:* bigint or text
    - *Default:* `null`
    - Defines the maximum size of any single file within the snapshot.
- **readonly**
    - *Type:* boolean
    - *Default:* `false`
    - If `true`, the repository is read-only.
- **server_side_encryption**
    - *Type:* boolean
    - *Default:* `false`
    - If `true`, files are server-side encrypted by AWS using the AES256 algorithm.
- **buffer_size**
    - *Type:* text
    - *Default:* `5mb`
    - *Minimum:* `5mb`
    - If a chunk is smaller than `buffer_size`, MonkDB will upload the chunk with a single request.  If a chunk exceeds `buffer_size`, MonkDB will split the chunk into multiple parts of `buffer_size` length and upload them separately.
- **max_retries**
    - *Type:* integer
    - *Default:* `3`
    - The number of retries in case of errors.
- **use_throttle_retries**
    - *Type:* boolean
    - *Default:* `true`
    - Whether MonkDB should throttle retries.
- **canned_acl**
    - *Type:* text
    - *Values:* `private`, `public-read`, `public-read-write`, `authenticated-read`, `log-delivery-write`, `bucket-owner-read`, `bucket-owner-full-control`
    - *Default:* `private`
    - The Canned ACL to apply when MonkDB creates new buckets and objects.
- **storage_class**
    - *Type:* text
    - *Values:* `standard`, `reduced_redundancy`, `standard_ia`
    - *Default:* `standard`
    - The S3 storage class to use for objects stored in the repository.
- **use_path_style_access**
    - *Type:* boolean
    - *Default:* `false`
    - Whether MonkDB should use path-style access. Useful for some S3-compatible providers.

### Example

```sql
CREATE REPOSITORY my_s3_repo TYPE s3
WITH (
bucket = 'my-monkdb-snapshots',
base_path = 'monkdb-backups',
access_key = 'YOUR_ACCESS_KEY',
secret_key = 'YOUR_SECRET_KEY',
server_side_encryption = true
);
```


---

## 3. `azure` Repository

The `azure` repository stores snapshots on Azure Blob Storage.

### Parameters

- **account**
    - *Type:* text
    - The Azure Storage account name. This parameter is masked in `sys.repositories`.
- **key**
    - *Type:* text
    - The Azure Storage account secret key.  This parameter is masked in `sys.repositories`.
- **sas_token**
    - *Type:* text
    - The Shared Access Signatures (SAS) token used for authentication.  This parameter is masked in `sys.repositories`.
    - The SAS token must have read, write, list, and delete permissions for the repository base path and all its contents.
- **endpoint**
    - *Type:* text
    - The Azure Storage account endpoint.  Cannot be used in combination with `endpoint_suffix`.  Allows you to connect to Azure Storage instances served on private endpoints.
- **secondary_endpoint**
    - *Type:* text
    - The Azure Storage account secondary endpoint.  Cannot be used if `endpoint` is not specified.
- **endpoint_suffix**
    - *Type:* text
    - *Default:* `core.windows.net`
    - The Azure Storage account endpoint suffix.  Allows you to force the use of a specific Azure service region. Cannot be used in combination with `endpoint`.
- **container**
    - *Type:* text
    - *Default:* `monkdb-snapshots`
    - The blob container name. You must create the container before creating the repository.
- **base_path**
    - *Type:* text
    - *Default:* The root directory
    - The container path to use for snapshots.
- **compress**
    - *Type:* boolean
    - *Default:* `true`
    - Whether MonkDB should compress the metadata part of the snapshot.
- **chunk_size**
    - *Type:* bigint or text
    - *Default:* `256mb`
    - *Maximum:* `256mb`
    - *Minimum:* `1b`
    - Defines the maximum size of any single file within the snapshot.
- **readonly**
    - *Type:* boolean
    - *Default:* `false`
    - If `true`, the repository is read-only.
- **location_mode**
    - *Type:* text
    - *Values:* `primary_only`, `secondary_only`, `primary_then_secondary`, `secondary_then_primary`
    - *Default:* `primary_only`
    - The location mode for storing blob data. If set to `secondary_only`, `readonly` will be forced to `true`.
- **max_retries**
    - *Type:* integer
    - *Default:* `3`
    - The number of retries (in case of failures) before considering the snapshot failed.
- **timeout**
    - *Type:* text
    - *Default:* `30s`
    - The client-side timeout for any single request to Azure.
- **proxy_type**
    - *Type:* text
    - *Values:* `http`, `socks`, `direct`
    - *Default:* `direct`
    - The type of proxy to use when connecting to Azure.
- **proxy_host**
    - *Type:* text
    - The hostname of the proxy.
- **proxy_port**
    - *Type:* integer
    - *Default:* `0`
    - The port number of the proxy.

### Example

```sql
CREATE REPOSITORY my_azure_repo TYPE azure
WITH (
account = 'myazureaccount',
key = 'MY_AZURE_ACCOUNT_KEY',
container = 'monkdb-backups',
base_path = 'snapshots',
compress = true
);
```


---

## 4. `gcs` Repository

The `gcs` repository stores snapshots on Google Cloud Storage (GCS).

### Parameters

- **bucket**
    - *Type:* text
    - *Required:* Yes
    - The name of the Google Cloud Storage bucket to use for storing snapshots. The bucket must already exist.
- **private_key_id**
    - *Type:* text
    - *Required:* Yes
    - The private key ID for the Google Service account from the JSON Google Service account credentials.  This parameter is masked in `sys.repositories`.
- **private_key**
    - *Type:* text
    - *Required:* Yes
    - The private key in PKCS #8 format for the Google Service account from the JSON Google Service account credentials.  This parameter is masked in `sys.repositories`.
- **client_id**
    - *Type:* text
    - *Required:* Yes
    - The client ID for the Google Service account from the JSON Google Service account credentials. This parameter is masked in `sys.repositories`.
- **client_email**
    - *Type:* text
    - *Required:* Yes
    - The client email for the Google Service account from the JSON Google Service account credentials.  This parameter is masked in `sys.repositories`.
- **base_path**
    - *Type:* text
    - *Default:* The root directory
    - The container path to use for snapshots.
- **compress**
    - *Type:* boolean
    - *Default:* `true`
    - Whether MonkDB should compress the metadata part of the snapshot.
- **chunk_size**
    - *Type:* bigint or text
    - *Default:* `null`
    - Defines the maximum size of any single file within the snapshot. If set to null, the default value 5 Terabyte is used.
- **connect_timeout**
    - *Type:* text
    - *Default:* `0`
    - Defines the timeout to establish a connection to the Google Cloud Storage service. The value should specify the unit (e.g., `5s`). A value of `-1` corresponds to an infinite timeout. The default value of `0` indicates to use the default value of `20s` from the Google Cloud Storage library.
- **read_timeout**
    - *Type:* text
    - *Default:* `0`
    - Defines the timeout to read data from an established connection.
- **endpoint**
    - *Type:* text
    - *Required:* False
    - Endpoint root URL to connect to an alternative storage provider.
- **token_uri**
    - *Type:* text
    - *Required:* False
    - Endpoint OAuth token URI to connect to an alternative OAuth provider.

### Example

```sql
CREATE REPOSITORY my_gcs_repo TYPE gcs
WITH (
bucket = 'my-gcs-bucket',
private_key_id = 'YOUR_PRIVATE_KEY_ID',
private_key = 'YOUR_PRIVATE_KEY',
client_id = 'YOUR_CLIENT_ID',
client_email = 'YOUR_CLIENT_EMAIL',
base_path = 'monkdb-backups',
compress = true
);
```


---

## 5. `url` Repository

The `url` repository provides read-only access to an `fs` repository via one of the supported network access protocols (e.g., HTTP). This allows restoring snapshots from a remote location.

**Note:** The URL must match one of the URLs configured by the `repositories.url.allowed_urls` setting in `monkdb.yml`.

### Parameters

- **url**
    - *Type:* text
    - The root URL of the `fs` repository.

### Example

```sql
CREATE REPOSITORY remote_fs_repo TYPE url
WITH (url = 'http://example.com/monkdb-snapshots');
```

---

## See Also

- [Drop repository](./49_DROP_REPOSITORY.md)
