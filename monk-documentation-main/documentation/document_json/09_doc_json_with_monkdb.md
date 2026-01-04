# Working with Document (JSON) Workloads Using MonkDB

MonkDB offers a unique blend of document-oriented storage and SQL-based querying, allowing for the efficient handling of complex, nested data structures. The concepts covered in the below documentation provide insights into how MonkDB manages **document storage**, **object and array data types**, **query execution on these structures**, **scalar functions for manipulation**, and **session-level settings related to unknown object keys**.

---

## Document-Oriented Features in MonkDB

MonkDB supports **semi-structured data storage**, meaning users can store **JSON-like documents** while still interacting with the data using standard **SQL queries**. This is achieved through **container data types**, primarily:

- `OBJECT` – Key-value structured data similar to JSON objects.
- `ARRAY` – Ordered collections of values of the same type.

### OBJECT Data Type

MonkDB allows users to store objects as values in table columns, much like embedding JSON within a SQL database. There are **two types of objects** in MonkDB:

- **Dynamic Objects** – New keys can be introduced without modifying the schema.
- **Strict Objects** – The schema is predefined, and new keys cannot be added dynamically.

Example of defining an `OBJECT` type column:

```psql
CREATE TABLE users (
    id INT PRIMARY KEY,
    name TEXT,
    address OBJECT(DYNAMIC)  -- Allows flexible JSON-like storage
);
```

Inserting an object:

```psql
INSERT INTO users (id, name, address) VALUES (
    1, 'Alice', { "city": "New York", "zipcode": "10001" }
);
```

Querying a nested object key:

```psql
SELECT address.city FROM users;
```

This would return:

```bash
New York
```

### ARRAY Data Type

Arrays allow for storing multiple values in a single column. All elements within an array must be of the **same data type**.

Example of an `ARRAY` column:

```psql
CREATE TABLE articles (
    id INT PRIMARY KEY,
    title TEXT,
    tags ARRAY(TEXT) -- An array of text elements
);
```

Inserting an array:

```psql
INSERT INTO articles (id, title, tags) VALUES (
    1, 'Intro to MonkDB', ['database', 'sql', 'scalability']
);
```

Querying a specific array element:

```psql
SELECT tags[1] FROM articles;
```

This retrieves:

```bash
'sql'
```

---

## Querying Container Data Types

MonkDB extends standard SQL syntax to work seamlessly with **nested objects** and **arrays**.

### Selecting Nested Object Fields

When querying fields within an object, use **dot notation**:

```psql
SELECT address.city FROM users;
```

You can also filter based on **object properties**:

```psql
SELECT * FROM users WHERE address.zipcode = '10001';
```

### Selecting and Filtering Arrays

MonkDB allows filtering data based on array elements. 

**Using `ANY` to Match Elements in an Array**

To check if an array contains a specific value:

```psql
SELECT * FROM users WHERE 'admin' = ANY (roles);
```

This selects all users who have **'admin'** as one of their roles.

**Using `ARRAY_LENGTH` to Filter by Array Size**

To find records where an array contains at least three elements:

```psql
SELECT * FROM articles WHERE array_length(tags) >= 3;
```

**Checking for an Exact Match**

To check if an array exactly matches another array:

```psql
SELECT * FROM users WHERE roles = ['admin', 'editor'];
```

---

## Scalar Functions for Objects and Arrays

MonkDB provides several built-in scalar functions to manipulate and extract data from objects and arrays.

### Object Functions

- `object_keys(object)` – Returns an array containing the keys of an object.

```psql
SELECT object_keys(address) FROM users;
```

**Example result**:

```bash
['city', 'zipcode']
```

- `object_values(object)` – Returns an array containing the values of an object.

```psql
SELECT object_values(address) FROM users;
```

**Example result**:

```bash
['New York', '10001']
```

### Array Functions

- `array_length(array)` – Returns the number of elements in an array.

```psql
SELECT array_length(tags) FROM articles;
```

**Result:**

```bash
3
```

- `array_cat(array1, array2)` – Concatenates two arrays.

```psql
SELECT array_cat(['AI', 'ML'], ['Big Data']);
```

**Result:**

```bash
['AI', 'ML', 'Big Data']
```

---

## Advanced SQL Querying with Objects and Arrays

MonkDB supports complex comparisons and filtering with container types.

### Checking If an Array Contains a Value

Using `ANY` to check for a value:

```psql
SELECT * FROM users WHERE 'admin' = ANY (roles);
```

### Using `UNNEST` to Flatten Arrays

To convert an array column into multiple rows:

```psql
SELECT unnest(tags) FROM articles;
```

This expands:

```bash
['database', 'sql', 'scalability']
```

Into:

```bash
database
sql
scalability
```

### Filtering Using `ARRAY_CONTAINS`

To check if an array contains a subset of elements:

```psql
SELECT * FROM articles WHERE array_contains(tags, ['sql']);
```

---

## Handling Unknown Object Keys in Queries

MonkDB includes a session-level setting called error_on_unknown_object_key, which defines how queries handle missing keys in an OBJECT column.

### Default Behavior (No Error)

By default, if you try to query an unknown key, MonkDB returns NULL:

```psql
SELECT address.state FROM users;
```

**Result:**

```bash
NULL
```

This is because **state** was not defined in the address object.

### Enforcing Strict Schema with `error_on_unknown_object_key`

To enforce strict schema validation:

```psql
SET error_on_unknown_object_key = TRUE;
```

Now, querying a missing key will raise an error instead of returning `NULL`.

---

## Simulation

[This](doc_json.py) Python script demonstrates MonkDB’s JSON document store capabilities using the MonkDB client (monkdb.client). It creates, inserts, queries, updates, and manipulates nested JSON objects inside MonkDB.

We are creating a new table:

- `id` → Primary Key (INTEGER)
- `name` → User’s Name (TEXT)
- `age` → User’s Age (INTEGER)
- `metadata` → JSON Object (OBJECT(DYNAMIC))
    - Stores arbitrary **JSON** data
    - Includes an indexed field `metadata['city']` for faster queries.

Then we are inserting & storing synthetic data using `OBJECT(DYNAMIC)`.

We are inserting synthetic JSON user data, where each user has:

- City (`metadata['city']`)
- Skills (`metadata['skills']`, an array)
- Nested JSON preferences (`metadata['profile']['preferences']`)

We are performing the following queries:

- **Fetching All Data**- Retrieves all users' data.
- **Querying JSON Nested Fields**- Uses dot notation (`metadata['city']`) to extract only city names from JSON.
- **Checking JSON Arrays**- Uses `ANY()` to filter users who have "AI" in their skills.
- **Updating JSON Data**- We are fetching Alice’s JSON metadata, and modifying the city field inside the dictionary. We then replace the entire JSON object (MonkDB does not allow direct field updates). Finally, We execute `REFRESH TABLE` to make the update immediately visible.

The below is the output of the simulation.

```bash
Dropped monkdb.doc_json table
✅ Table created successfully!
✅ Sample user data inserted successfully!

🔍 Number of records in table:
[
    [
        5
    ]
]

🔍 Full User Data:
[
    [
        4,
        "David",
        {
            "skills": [
                "Java",
                "Spring Boot"
            ],
            "city": "London"
        }
    ],
    [
        5,
        "Eve",
        {
            "skills": [
                "AI",
                "Machine Learning"
            ],
            "city": "Tokyo",
            "profile": {
                "preferences": {
                    "language": "Japanese",
                    "food": "Sushi"
                }
            }
        }
    ],
    [
        1,
        "Alice",
        {
            "skills": [
                "Python",
                "SQL",
                "AI"
            ],
            "city": "New York",
            "profile": {
                "preferences": {
                    "language": "English",
                    "food": "Italian"
                }
            }
        }
    ],
    [
        2,
        "Bob",
        {
            "skills": [
                "JavaScript",
                "Node.js"
            ],
            "city": "San Francisco",
            "profile": {
                "preferences": {
                    "language": "Spanish",
                    "food": "Mexican"
                }
            }
        }
    ],
    [
        3,
        "Charlie",
        {
            "skills": [
                "Go",
                "Rust"
            ],
            "city": "Berlin",
            "profile": {}
        }
    ]
]

🌍 Users and Their Cities:
[
    [
        "David",
        "London"
    ],
    [
        "Eve",
        "Tokyo"
    ],
    [
        "Alice",
        "New York"
    ],
    [
        "Bob",
        "San Francisco"
    ],
    [
        "Charlie",
        "Berlin"
    ]
]

💡 Users with Skills:
[
    [
        "David",
        [
            "Java",
            "Spring Boot"
        ]
    ],
    [
        "Eve",
        [
            "AI",
            "Machine Learning"
        ]
    ],
    [
        "Alice",
        [
            "Python",
            "SQL",
            "AI"
        ]
    ],
    [
        "Bob",
        [
            "JavaScript",
            "Node.js"
        ]
    ],
    [
        "Charlie",
        [
            "Go",
            "Rust"
        ]
    ]
]

🧠 Users with AI Skills:
[
    [
        "Eve"
    ],
    [
        "Alice"
    ]
]

🍔 Users with Food Preferences:
[
    [
        "Eve",
        "Sushi"
    ],
    [
        "Alice",
        "Italian"
    ],
    [
        "Bob",
        "Mexican"
    ]
]

🔑 JSON Keys for Each User:
[
    [
        "David",
        [
            "skills",
            "city"
        ]
    ],
    [
        "Eve",
        [
            "skills",
            "city",
            "profile"
        ]
    ],
    [
        "Alice",
        [
            "skills",
            "city",
            "profile"
        ]
    ],
    [
        "Bob",
        [
            "skills",
            "city",
            "profile"
        ]
    ],
    [
        "Charlie",
        [
            "skills",
            "city",
            "profile"
        ]
    ]
]

🔄 New Metadata Before Update:
{
    "skills": [
        "Python",
        "SQL",
        "AI"
    ],
    "city": "Paris",
    "profile": {
        "preferences": {
            "language": "English",
            "food": "Italian"
        }
    }
}

✏️ Successfully Updated Alice's City to Paris!

🔄 Updated Metadata After Update (Direct Fetch from Query):
[
    {
        "skills": [
            "Python",
            "SQL",
            "AI"
        ],
        "city": "Paris",
        "profile": {
            "preferences": {
                "language": "English",
                "food": "Italian"
            }
        }
    }
]

✅ Alice's Updated Metadata (After Refresh):
[
    [
        "Alice",
        {
            "skills": [
                "Python",
                "SQL",
                "AI"
            ],
            "city": "Paris",
            "profile": {
                "preferences": {
                    "language": "English",
                    "food": "Italian"
                }
            }
        }
    ]
]

🚀 MonkDB JSON Store Simulation Completed Successfully!
```