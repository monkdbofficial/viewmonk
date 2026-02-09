# Complete CRUD Operations Demo - MonkDB Query Editor

This file contains a complete demonstration of all CRUD operations (CREATE, READ, UPDATE, DELETE) in MonkDB.
Copy and paste these queries into the Query Editor at `/query-editor` and run them one by one.

---

## ⚠️ IMPORTANT - How to Copy Queries

**DO NOT copy the ```sql or ``` lines!**
- ✅ CORRECT: Copy only the SQL statement (the text between the code fences)
- ❌ WRONG: Do not copy the backticks (```) or the word "sql"

Example:
```
WRONG: ```sql DROP TABLE...```
CORRECT: DROP TABLE IF EXISTS demo.employees;
```

---

## 1. CREATE TABLE

### Step 1.1: Drop existing table (if exists)

**Copy this query (without the backticks):**
```sql
DROP TABLE IF EXISTS demo.employees;
```

**OR copy from here directly:**

DROP TABLE IF EXISTS demo.employees;

### Step 1.2: Create the employees table

**Copy from here (raw SQL):**

CREATE TABLE demo.employees (
  id INTEGER PRIMARY KEY,
  employee_name TEXT NOT NULL,
  email TEXT,
  department TEXT,
  position TEXT,
  salary DOUBLE,
  hire_date TIMESTAMP,
  age INTEGER,
  city TEXT,
  is_active INTEGER DEFAULT 1
);

---

## 2. INSERT DATA (10+ Items)

### Step 2.1: Insert first batch of employees (5 records)

**Copy from here (raw SQL):**

INSERT INTO demo.employees (id, employee_name, email, department, position, salary, hire_date, age, city, is_active) VALUES
(1, 'John Smith', 'john.smith@company.com', 'Engineering', 'Senior Developer', 95000.00, '2020-01-15', 32, 'New York', 1),
(2, 'Sarah Johnson', 'sarah.j@company.com', 'Engineering', 'Tech Lead', 120000.00, '2019-03-22', 38, 'San Francisco', 1),
(3, 'Michael Brown', 'michael.b@company.com', 'Sales', 'Sales Manager', 85000.00, '2021-06-10', 29, 'Chicago', 1),
(4, 'Emily Davis', 'emily.d@company.com', 'Marketing', 'Marketing Director', 110000.00, '2018-11-05', 41, 'Los Angeles', 1),
(5, 'David Wilson', 'david.w@company.com', 'Engineering', 'Junior Developer', 65000.00, '2022-08-20', 25, 'Austin', 1);

### Step 2.2: Insert second batch of employees (5 records)
```sql
INSERT INTO demo.employees (id, employee_name, email, department, position, salary, hire_date, age, city, is_active) VALUES
(6, 'Jessica Martinez', 'jessica.m@company.com', 'HR', 'HR Manager', 75000.00, '2020-02-14', 35, 'Seattle', 1),
(7, 'Robert Taylor', 'robert.t@company.com', 'Engineering', 'DevOps Engineer', 105000.00, '2021-01-08', 33, 'Boston', 1),
(8, 'Amanda Garcia', 'amanda.g@company.com', 'Sales', 'Sales Representative', 55000.00, '2022-03-15', 27, 'Miami', 1),
(9, 'Christopher Lee', 'chris.l@company.com', 'Finance', 'Financial Analyst', 80000.00, '2019-09-01', 36, 'Denver', 1),
(10, 'Michelle White', 'michelle.w@company.com', 'Engineering', 'Senior Developer', 98000.00, '2020-07-12', 31, 'Portland', 1);
```

### Step 2.3: Insert third batch of employees (5 more records)
```sql
INSERT INTO demo.employees (id, employee_name, email, department, position, salary, hire_date, age, city, is_active) VALUES
(11, 'James Anderson', 'james.a@company.com', 'Marketing', 'Content Manager', 72000.00, '2021-04-20', 28, 'Atlanta', 1),
(12, 'Lisa Thomas', 'lisa.t@company.com', 'Engineering', 'QA Engineer', 78000.00, '2020-10-05', 30, 'Phoenix', 1),
(13, 'Daniel Moore', 'daniel.m@company.com', 'Sales', 'Senior Sales Rep', 68000.00, '2019-12-01', 34, 'Dallas', 1),
(14, 'Jennifer Jackson', 'jennifer.j@company.com', 'HR', 'Recruiter', 62000.00, '2022-01-10', 26, 'San Diego', 1),
(15, 'Kevin Harris', 'kevin.h@company.com', 'Finance', 'Accountant', 70000.00, '2021-08-18', 29, 'Houston', 1);
```

### Step 2.4: Verify all records were inserted
```sql
SELECT COUNT(*) as total_employees FROM demo.employees;
```

Expected result: 15 employees

---

## 3. READ OPERATIONS (Query the Data)

### Query 3.1: Select all employees
```sql
SELECT * FROM demo.employees;
```

### Query 3.2: Select specific columns
```sql
SELECT id, employee_name, department, position, salary
FROM demo.employees
ORDER BY salary DESC;
```

### Query 3.3: Filter by department
```sql
SELECT employee_name, position, salary, city
FROM demo.employees
WHERE department = 'Engineering'
ORDER BY salary DESC;
```

### Query 3.4: Find high earners (salary > 80000)
```sql
SELECT employee_name, department, position, salary
FROM demo.employees
WHERE salary > 80000
ORDER BY salary DESC;
```

### Query 3.5: Aggregation - Average salary by department
```sql
SELECT
  department,
  COUNT(*) as employee_count,
  ROUND(AVG(salary), 2) as avg_salary,
  ROUND(MIN(salary), 2) as min_salary,
  ROUND(MAX(salary), 2) as max_salary
FROM demo.employees
GROUP BY department
ORDER BY avg_salary DESC;
```

### Query 3.6: Find employees hired in 2021 or later
```sql
SELECT employee_name, department, hire_date, city
FROM demo.employees
WHERE hire_date >= '2021-01-01'
ORDER BY hire_date DESC;
```

### Query 3.7: Count employees by city
```sql
SELECT city, COUNT(*) as employee_count
FROM demo.employees
GROUP BY city
ORDER BY employee_count DESC;
```

### Query 3.8: Find employees aged between 25 and 35
```sql
SELECT employee_name, age, department, position
FROM demo.employees
WHERE age BETWEEN 25 AND 35
ORDER BY age;
```

---

## 4. UPDATE OPERATIONS

### Update 4.1: Give 10% raise to Engineering department
```sql
UPDATE demo.employees
SET salary = salary * 1.10
WHERE department = 'Engineering';
```

### Update 4.2: Verify the salary updates
```sql
SELECT employee_name, department, ROUND(salary, 2) as salary
FROM demo.employees
WHERE department = 'Engineering'
ORDER BY salary DESC;
```

### Update 4.3: Promote a specific employee
```sql
UPDATE demo.employees
SET position = 'VP of Engineering',
    salary = 150000.00
WHERE employee_name = 'Sarah Johnson';
```

### Update 4.4: Update city for specific employee
```sql
UPDATE demo.employees
SET city = 'Remote'
WHERE id = 5;
```

### Update 4.5: Mark employee as inactive (soft delete)
```sql
UPDATE demo.employees
SET is_active = 0
WHERE id = 8;
```

### Update 4.6: Bulk update - Change department name
```sql
UPDATE demo.employees
SET department = 'Human Resources'
WHERE department = 'HR';
```

### Update 4.7: Update multiple fields for employees hired before 2020
```sql
UPDATE demo.employees
SET salary = salary * 1.05,
    position = position || ' (Senior)'
WHERE hire_date < '2020-01-01' AND is_active = 1;
```

### Update 4.8: Verify all updates
```sql
SELECT id, employee_name, department, position, ROUND(salary, 2) as salary, city, is_active
FROM demo.employees
ORDER BY id;
```

---

## 5. DELETE OPERATIONS

### Delete 5.1: Delete inactive employees
```sql
DELETE FROM demo.employees
WHERE is_active = 0;
```

### Delete 5.2: Verify deletion
```sql
SELECT COUNT(*) as remaining_employees FROM demo.employees;
```

### Delete 5.3: Delete employees with low salary (less than 60000)
```sql
DELETE FROM demo.employees
WHERE salary < 60000;
```

### Delete 5.4: Delete employees from specific city
```sql
DELETE FROM demo.employees
WHERE city = 'Miami';
```

### Delete 5.5: Delete a specific employee by ID
```sql
DELETE FROM demo.employees
WHERE id = 13;
```

### Delete 5.6: See remaining employees
```sql
SELECT id, employee_name, department, city, ROUND(salary, 2) as salary
FROM demo.employees
ORDER BY id;
```

### Delete 5.7: Delete all employees from Sales department
```sql
DELETE FROM demo.employees
WHERE department = 'Sales';
```

### Delete 5.8: Final count after deletions
```sql
SELECT
  COUNT(*) as total_remaining,
  COUNT(DISTINCT department) as departments,
  COUNT(DISTINCT city) as cities
FROM demo.employees;
```

---

## 6. DROP TABLE (Clean Up)

### Step 6.1: View final state before dropping
```sql
SELECT * FROM demo.employees;
```

### Step 6.2: Drop the table completely
```sql
DROP TABLE IF EXISTS demo.employees;
```

### Step 6.3: Verify table is dropped (this should return an error)
```sql
SELECT * FROM demo.employees;
```

Expected: Error - table does not exist

---

## Summary of Operations Performed

1. ✅ Created `demo.employees` table with 10 columns
2. ✅ Inserted 15 employee records (in 3 batches)
3. ✅ Read data with 8 different query patterns (filters, aggregations, sorting)
4. ✅ Updated records:
   - Salary increases for Engineering department
   - Promotion for specific employee
   - Changed cities and departments
   - Soft delete (set is_active = 0)
   - Bulk updates with conditions
5. ✅ Deleted records:
   - Inactive employees
   - Low salary employees
   - Employees by city
   - Employees by department
   - Specific employee by ID
6. ✅ Dropped the table completely

---

## How to Use This File

1. Open MonkDB Workbench
2. Navigate to `/query-editor`
3. Copy and paste each query section
4. Run queries **ONE AT A TIME** using `Ctrl+Enter` or the Run button
5. Review the results after each query
6. Follow the numbered sequence for best results

---

## Tips

- **ALWAYS run DROP TABLE first** to start with a clean slate
- **Run INSERT statements in order** to maintain data integrity
- **Verify results** after UPDATE and DELETE operations
- **Use WHERE clause carefully** to avoid unintended changes
- **Test with SELECT** before running UPDATE or DELETE

---

## Additional Practice Queries

### Find top 3 highest paid employees
```sql
SELECT employee_name, position, ROUND(salary, 2) as salary
FROM demo.employees
ORDER BY salary DESC
LIMIT 3;
```

### Calculate total payroll by department
```sql
SELECT
  department,
  COUNT(*) as headcount,
  ROUND(SUM(salary), 2) as total_payroll,
  ROUND(AVG(salary), 2) as avg_salary
FROM demo.employees
GROUP BY department
ORDER BY total_payroll DESC;
```

### Find employees with gmail addresses
```sql
SELECT employee_name, email, department
FROM demo.employees
WHERE email LIKE '%@company.com%'
ORDER BY employee_name;
```

---

**END OF DEMO**

All queries are ready to use in the MonkDB Query Editor!
