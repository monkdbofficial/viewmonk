# MonkDB SQL Lexical Structure

This document provides a detailed overview of the lexical structure of SQL as implemented in MonkDB. Understanding this structure is essential for writing valid SQL statements and effectively interacting with the MonkDB database.

---

## **Overview**

An SQL input in MonkDB consists of a sequence of commands, each comprising a series of tokens and terminated by a semicolon (`;`). Tokens can be categorized as:
- Keywords
- Identifiers
- Quoted identifiers
- Literals (constants)
- Special character symbols

---

## **String Literals**

String literals represent sequences of characters enclosed in single quotes (`'`). For example:

```sql
'This is a string'
```

MonkDB also supports dollar-quoted strings, which simplify the inclusion of single quotes within strings. Dollar-quoted strings are enclosed by `$<tag>$` delimiters, where `<tag>` can be zero or more characters. For instance:

```sql
$tag$I'm a string$tag$
```


**Note:** Nested dollar-quoted strings are not supported.

---

## **Escape Strings**

To include special characters within a string literal, MonkDB uses the single quote (`'`) as the escape character. To represent a single quote within a string, use two adjacent single quotes:

```sql
'Jack''s car'
```


**Note:** Two adjacent single quotes are not equivalent to the double-quote character (`"`).

---

## **String Literals with C-Style Escapes**

MonkDB supports C-style escape sequences prefixed with the letter `E` or `e`. For example:

```sql
e'hello\nWorld'
```

### Supported Escape Sequences:
| Escape Sequence | Meaning             |
|------------------|---------------------|
| `\b`            | Backspace           |
| `\f`            | Form feed           |
| `\n`            | Newline             |
| `\r`            | Carriage return     |
| `\t`            | Tab                 |
| `\o`, `\oo`, `\ooo` | Octal byte value (o = [0-7]) |
| `\xh`, `\xhh`   | Hexadecimal byte value (h = [0-9, A-F, a-f]) |
| `\uxxxx`, `\Uxxxxxxxx` | 16 or 32-bit hexadecimal Unicode character value |

For example:

```sql
e'\u0061\x61\141'
```


This is equivalent to the string literal `'aaa'`.

To include a backslash (`\`) within a string, use two adjacent backslashes (`\\`):

```sql
e'aa\nbb'
```


This results in the string: `aa\nbb`.

---

## **Keywords and Identifiers**

### **Keywords**
Keywords in MonkDB are case-insensitive. For example, the identifiers `HelloWorld`, `helloworld`, and `Helloworld` are considered equivalent.

### **Quoted Identifiers**
Quoted identifiers are case-sensitive and enclosed in double quotes (`"`). For instance:

```psql
CREATE TABLE "sampleTable" ("idSample" TEXT);
```


### **Naming Restrictions**
Identifiers must adhere to these rules:
1. May not contain characters such as: `/ \ * ? " < > | <whitespace> , # .`
2. Must not exceed 255 bytes when encoded with UTF-8.
3. Table and schema names:
   - May not contain uppercase letters.
   - May not start with an underscore (`_`).

Attempting to use unquoted camel case names will result in an error due to MonkDB's restrictions.

---

## **Special Characters**

Special characters include symbols such as:
- `*`
- `,`
- `;`
- `(`
- `)`

These symbols have specific syntactical meanings in SQL statements and must be used appropriately.

---

## **Comments**

Comments are used to annotate SQL code and are ignored during execution. MonkDB supports two types of comments:

1. **Single-line comments:** Begin with `--` and continue to the end of the line.

```psql
-- This is a single-line comment
SELECT * FROM my_table;
```

2. **Multi-line comments:** Enclosed between `/*` and `*/`.

```psql
/*
This is a
multi-line comment
*/
SELECT * FROM my_table;
```

---

By understanding and adhering to MonkDB's lexical structure, users can effectively write and troubleshoot SQL statements within the database.





