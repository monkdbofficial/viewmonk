# Smart Data Import & Insert Features

## Overview

The **Data Import Panel** provides enterprise-level data import capabilities with auto-generated forms, multi-format support, and intelligent schema detection for MonkDB time-series tables.

## Key Features

### 1. **Auto-Generated Forms** 🎯
Forms are automatically generated based on your table schema:
- **Intelligent Field Types**: Automatically detects and uses appropriate input types
  - `INTEGER/BIGINT` → Number input
  - `TEXT/VARCHAR` → Text input or Textarea
  - `BOOLEAN` → Checkbox
  - `DATE` → Date picker
  - `TIME` → Time picker
  - `TIMESTAMP` → DateTime picker
  - `JSON` → Textarea with JSON validation
  - `EMAIL` → Email input
  - `URL` → URL input

- **Smart Validation**:
  - Required fields marked with red asterisk (*)
  - Auto-increment fields hidden
  - Primary key indicators (PK)
  - Default values pre-filled

### 2. **Multi-Format Import** 📁
Support for multiple file formats:

#### **CSV Import** 📊
- Upload CSV files with headers
- Automatic column mapping
- Batch processing
- Validation before import

#### **JSON Import** 📋
- Single or array of records
- Automatic schema mapping
- Nested object support

#### **Excel Import** 📈
- .xlsx and .xls support (coming soon)
- Multiple sheets support
- Column type inference

#### **SQL Import** 💾
- Execute .sql files directly
- Supports INSERT, UPDATE, CREATE statements
- Multi-statement execution
- SQL preview before execution

### 3. **Table Schema Detection** 🔍
Automatically fetches and displays:
- Column names with icons
- Data types
- Nullable constraints
- Primary keys
- Auto-increment fields
- Default values

### 4. **Batch Operations** ⚡
- Add multiple records before importing
- Preview all records in table view
- Edit or remove records from batch
- Generate SQL for review

### 5. **SQL Generation** 💻
- Auto-generate INSERT statements
- Copy SQL to clipboard
- Export SQL for later use
- Parameterized queries for safety

## How to Use

### Method 1: Manual Form Entry

1. **Select Table**
   - Click the **Upload** icon (⬆️) in toolbar
   - Choose your target table from dropdown
   - View auto-generated schema

2. **View Table Schema**
   - See all columns with types
   - Identify required fields (*)
   - Check primary keys (PK)
   - Download CSV template if needed

3. **Fill Form**
   - Enter data in auto-generated fields
   - Required fields are marked
   - Auto-increment fields hidden
   - Default values pre-filled

4. **Add to Batch**
   - Click "Add Record to Batch"
   - Record appears in preview table
   - Repeat for multiple records

5. **Import**
   - Review all records
   - Click "Import Data"
   - See success/error count

### Method 2: CSV Import

1. **Select Table**
   - Choose target table
   - Click "CSV/JSON" button

2. **Upload File**
   - Select .csv file from computer
   - File is parsed automatically
   - Records appear in preview

3. **Verify Data**
   - Check column mapping
   - Review first few records
   - Remove any bad records

4. **Import**
   - Click "Import Data"
   - Progress shown
   - Results displayed

### Method 3: SQL File Import

1. **Select Table**
   - Choose target table
   - Click "SQL File" button

2. **Upload SQL**
   - Select .sql file
   - SQL appears in preview
   - Syntax highlighted

3. **Review & Execute**
   - Check SQL statements
   - Copy if needed
   - Click "Import Data"

## CSV Template Export

**Download Empty Template**:
1. Select your table
2. Click "CSV Template" button
3. CSV file downloads with correct headers
4. Fill in Excel/Google Sheets
5. Import back

**Template Format**:
```csv
column1,column2,column3
value1,value2,value3
value4,value5,value6
```

## Auto-Generated Field Examples

### Text Fields
```typescript
// VARCHAR, TEXT, CHAR
<input type="text" placeholder="Enter name" />
```

### Number Fields
```typescript
// INTEGER, BIGINT, SMALLINT, SERIAL
<input type="number" placeholder="Enter count" />
```

### Boolean Fields
```typescript
// BOOLEAN
<input type="checkbox" />
```

### Date/Time Fields
```typescript
// DATE
<input type="date" />

// TIME
<input type="time" />

// TIMESTAMP
<input type="datetime-local" />
```

### Large Text Fields
```typescript
// TEXT, JSON, JSONB
<textarea rows="4" placeholder="Enter data" />
```

## SQL Generation Examples

### Example 1: Simple Insert
**Table**: `sensors` (id, name, location, value)

**Form Data**:
- name: "Sensor-01"
- location: "Building A"
- value: 23.5

**Generated SQL**:
```sql
-- Insert 1 record(s) into public.sensors

INSERT INTO public.sensors (name, location, value)
VALUES ('Sensor-01', 'Building A', 23.5);
```

### Example 2: Multiple Records
**Table**: `temperature_readings` (sensor_id, timestamp, temperature)

**Batch Data**:
1. sensor_id: 1, timestamp: 2026-01-24 10:00:00, temperature: 22.3
2. sensor_id: 1, timestamp: 2026-01-24 11:00:00, temperature: 23.1
3. sensor_id: 2, timestamp: 2026-01-24 10:00:00, temperature: 21.8

**Generated SQL**:
```sql
-- Insert 3 record(s) into public.temperature_readings

INSERT INTO public.temperature_readings (sensor_id, timestamp, temperature)
VALUES (1, '2026-01-24 10:00:00', 22.3);

INSERT INTO public.temperature_readings (sensor_id, timestamp, temperature)
VALUES (1, '2026-01-24 11:00:00', 23.1);

INSERT INTO public.temperature_readings (sensor_id, timestamp, temperature)
VALUES (2, '2026-01-24 10:00:00', 21.8);
```

### Example 3: NULL Handling
**Table**: `users` (id, email, phone, address)

**Form Data**:
- email: "user@example.com"
- phone: "" (empty)
- address: NULL

**Generated SQL**:
```sql
-- Insert 1 record(s) into public.users

INSERT INTO public.users (email, phone, address)
VALUES ('user@example.com', NULL, NULL);
```

## Real-World Use Cases

### Use Case 1: IoT Sensor Data
**Scenario**: Import temperature sensor readings from CSV

**Steps**:
1. Export data from IoT platform as CSV
2. Select `sensor_readings` table
3. Upload CSV file
4. Verify timestamp format matches
5. Import 10,000+ records
6. Check success count

**CSV Format**:
```csv
sensor_id,timestamp,temperature,humidity
S001,2026-01-24T10:00:00Z,23.5,65
S001,2026-01-24T10:05:00Z,23.7,64
S002,2026-01-24T10:00:00Z,22.1,70
```

### Use Case 2: Manual Event Logging
**Scenario**: Admin manually logs system events

**Steps**:
1. Select `system_events` table
2. Use manual form
3. Fill: event_type, severity, message
4. Add to batch
5. Log multiple events
6. Import all at once

### Use Case 3: Database Migration
**Scenario**: Migrate data from another database

**Steps**:
1. Export data as SQL from old system
2. Select target table in MonkDB
3. Upload .sql file
4. Review INSERT statements
5. Execute SQL
6. Verify row count

### Use Case 4: Batch User Creation
**Scenario**: Onboard 100 new users from Excel

**Steps**:
1. Download CSV template for `users` table
2. Fill in Excel with user data
3. Save as CSV
4. Upload to Data Import Panel
5. Verify email formats
6. Import with validation

## Error Handling

### Common Errors

**1. Type Mismatch**
```
Error: Invalid input for integer column
Solution: Check data types match schema
```

**2. NULL in Required Field**
```
Error: NULL value in non-nullable column
Solution: Fill all required fields (marked with *)
```

**3. Duplicate Primary Key**
```
Error: Duplicate key value violates unique constraint
Solution: Check for duplicate IDs in batch
```

**4. Invalid Date Format**
```
Error: Invalid date format
Solution: Use YYYY-MM-DD or ISO 8601 format
```

### Success Indicators

✅ **Green Badge**: Shows count of records ready to import
✅ **Success Message**: "Successfully imported N record(s)"
✅ **Activity Log**: Import logged for audit trail
✅ **Notification**: Toast notification on completion

### Partial Success Handling

If some records fail:
- ✅ Success count shown
- ❌ Error count shown
- 📝 Failed records logged
- 🔄 Can retry failed records

## Performance Tips

### 1. **Batch Size**
- Optimal: 100-1000 records per import
- Large imports: Split into multiple batches
- Real-time: Use single record inserts

### 2. **CSV Format**
- Use UTF-8 encoding
- Avoid special characters in headers
- Match column names exactly
- Include headers in first row

### 3. **SQL Imports**
- Use transactions for atomicity
- Batch INSERT statements
- Avoid excessive logging
- Use COPY for very large datasets

### 4. **Form Entry**
- Use batch mode for multiple records
- Generate SQL and review before import
- Validate locally before submission

## Security Considerations

### Input Validation
- ✅ All inputs sanitized
- ✅ SQL injection prevention
- ✅ Type checking enforced
- ✅ Length limits applied

### File Upload Safety
- ✅ File type validation
- ✅ Size limits enforced
- ✅ Content scanning
- ✅ Malicious code detection

### SQL Execution
- ✅ Parameterized queries
- ✅ Transaction rollback on error
- ✅ User permissions checked
- ✅ Audit logging enabled

## Integration Points

### Dashboard Integration
- Import data directly from dashboard
- Refresh visualizations after import
- Real-time updates supported

### Activity Logging
- All imports logged
- User tracking
- Timestamp recording
- Success/failure tracking

### Notification System
- Success notifications
- Error alerts
- Progress updates
- Completion messages

## Advanced Features

### 1. **Smart Type Conversion**
Automatically converts:
- Strings to numbers for numeric columns
- Date strings to timestamps
- JSON strings to JSON objects
- Boolean strings ('true'/'false') to boolean

### 2. **Bulk Operations**
- Import 1000+ records at once
- Parallel processing
- Progress tracking
- Error recovery

### 3. **Template System**
- Download table-specific templates
- Pre-filled with column names
- Type hints in headers
- Example data included

### 4. **SQL Preview**
- See exact SQL before execution
- Copy for documentation
- Review for optimization
- Modify if needed

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + I` | Open Import Panel |
| `Ctrl/Cmd + U` | Upload File |
| `Ctrl/Cmd + Enter` | Add Record to Batch |
| `Ctrl/Cmd + S` | Save/Import Data |
| `Esc` | Close Panel |

## Troubleshooting

### Issue: "Failed to fetch table schema"
**Solution**:
- Check database connection
- Verify table permissions
- Ensure table exists

### Issue: "Import failed for all records"
**Solution**:
- Check column names match exactly
- Verify data types are correct
- Review required field constraints
- Check for unique constraint violations

### Issue: "CSV parsing error"
**Solution**:
- Ensure UTF-8 encoding
- Check for proper comma separation
- Verify headers are in first row
- Remove BOM if present

### Issue: "Form fields not showing"
**Solution**:
- Select table from dropdown
- Wait for schema to load
- Refresh page if needed
- Check console for errors

## Best Practices

### 1. **Before Importing**
- ✅ Download and review CSV template
- ✅ Validate data in spreadsheet first
- ✅ Check for duplicates
- ✅ Ensure consistent formatting

### 2. **During Import**
- ✅ Start with small batch (10-100 records)
- ✅ Verify success before larger import
- ✅ Use batch mode for efficiency
- ✅ Review generated SQL

### 3. **After Import**
- ✅ Check success/error counts
- ✅ Verify data in table
- ✅ Review activity log
- ✅ Create backup if needed

### 4. **For Large Datasets**
- ✅ Split into multiple files
- ✅ Import during off-peak hours
- ✅ Monitor database performance
- ✅ Use COPY command for massive imports (100K+ rows)

## API Integration

The import functionality can be integrated programmatically:

```typescript
// Fetch table schema
const schema = await handleFetchTableSchema('public', 'sensors');

// Prepare records
const records = [
  { sensor_id: 1, value: 23.5, timestamp: new Date() },
  { sensor_id: 2, value: 24.1, timestamp: new Date() }
];

// Import data
const result = await handleImportData('public', 'sensors', records);
console.log(`Imported ${result.success}, failed ${result.errors}`);
```

## Future Enhancements

Planned features:
- ✅ Excel (.xlsx) direct import
- ✅ Data transformation rules
- ✅ Scheduled imports
- ✅ FTP/SFTP integration
- ✅ API webhook imports
- ✅ Data validation rules
- ✅ Import templates library
- ✅ Undo/rollback capability

## Technical Details

### Supported Databases
- PostgreSQL 12+
- TimescaleDB
- MonkDB
- Any PostgreSQL-compatible database

### File Size Limits
- CSV: Up to 50MB
- JSON: Up to 25MB
- SQL: Up to 10MB
- Configurable in settings

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Support

For questions or issues:
- Check table permissions
- Review error messages
- Check activity log
- Contact support team

---

**Version**: 1.0.0
**Last Updated**: 2026-01-24
**Component**: DataImportPanel.tsx
