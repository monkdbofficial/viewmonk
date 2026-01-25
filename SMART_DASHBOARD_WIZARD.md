# Smart Dashboard Wizard

## Overview

The **Smart Dashboard Wizard** is an intelligent 3-step wizard that automatically generates enterprise-grade dashboards with multiple widgets based on your selected tables and pre-built templates. It analyzes your table schemas and creates professional visualizations tailored to your data.

## Key Features

### 1. **Template-Based Dashboard Creation** 🎯
Choose from 6 pre-built professional templates:

#### **Analytics Dashboard** 📊
- **Category**: Business Intelligence
- **Perfect For**: E-commerce, web analytics, marketing metrics
- **Recommended Tables**: events, analytics, metrics, logs
- **Auto-Generated Widgets**:
  - KPI stat cards (Total Events, Unique Users, Conversion Rate)
  - Trend line charts (Daily/Hourly trends)
  - Category breakdown bar charts
  - Distribution pie charts
  - Time-series area charts

#### **System Monitoring** 🖥️
- **Category**: Infrastructure & DevOps
- **Perfect For**: Server monitoring, system health, performance tracking
- **Recommended Tables**: servers, metrics, logs, alerts
- **Auto-Generated Widgets**:
  - Resource utilization gauges (CPU, Memory, Disk)
  - Performance trend lines (Response time, throughput)
  - Alert distribution charts
  - Status overview stat cards
  - Real-time area charts

#### **IoT Sensor Dashboard** 📡
- **Category**: Internet of Things
- **Perfect For**: Sensor networks, environmental monitoring, industrial IoT
- **Recommended Tables**: sensors, readings, devices, measurements
- **Auto-Generated Widgets**:
  - Current readings stat cards (Temperature, Humidity, Pressure)
  - Historical trend lines
  - Sensor comparison bar charts
  - Location-based distribution
  - Min/Max/Avg gauges

#### **Financial Metrics** 💰
- **Category**: Finance & Business
- **Perfect For**: Revenue tracking, sales analytics, financial reporting
- **Recommended Tables**: transactions, revenue, sales, orders
- **Auto-Generated Widgets**:
  - Revenue stat cards (Daily, Weekly, Monthly)
  - Trend line charts with moving averages
  - Category breakdown (Product, Region, Channel)
  - Growth rate calculations
  - Cumulative revenue area charts

#### **User Engagement** 👥
- **Category**: Product Analytics
- **Perfect For**: SaaS platforms, mobile apps, user behavior analysis
- **Recommended Tables**: users, sessions, events, activities
- **Auto-Generated Widgets**:
  - Active users stat cards (DAU, WAU, MAU)
  - Session duration trends
  - Feature usage bar charts
  - User retention cohort tables
  - Engagement funnel visualizations

#### **Inventory & Stock** 📦
- **Category**: Operations & Logistics
- **Perfect For**: Warehouse management, stock tracking, supply chain
- **Recommended Tables**: inventory, products, stock, warehouses
- **Auto-Generated Widgets**:
  - Stock level stat cards (Total, Low Stock, Out of Stock)
  - Inventory turnover trends
  - Product category breakdown
  - Warehouse distribution pie charts
  - Reorder alerts table

### 2. **Multi-Table Selection** 🔗
Select one or multiple tables to create comprehensive dashboards:
- Checkbox-based multi-selection
- Visual table count indicator
- Table metadata display (schema.table)
- Select/deselect all option
- Intelligent widget generation across tables

### 3. **Intelligent Widget Auto-Generation** 🤖

The wizard analyzes your table columns and automatically generates appropriate widgets:

#### Column Type Detection
```typescript
// Timestamp columns → Time axis for charts
timestamp, created_at, updated_at, event_time

// Numeric columns → Metrics, stat cards, gauges
count, value, amount, revenue, temperature, cpu_usage

// Text columns → Group by, categories, dimensions
status, category, location, sensor_id, user_type

// Boolean columns → Filters, status indicators
is_active, enabled, verified
```

#### Widget Generation Logic
For each table, the wizard creates:

1. **Stat Cards** (3-4 widgets)
   - Sum of numeric columns (Total Revenue, Total Events)
   - Count aggregations (Total Records, Unique Users)
   - Average calculations (Avg Temperature, Avg Response Time)
   - Size: Small (1/4 width)

2. **Trend Line Charts** (2-3 widgets)
   - Time-series trends using timestamp + numeric columns
   - Moving averages for smoothing
   - Multiple metrics on same chart
   - Size: Large (full width) or Medium (1/2 width)

3. **Bar Charts** (1-2 widgets)
   - Category breakdown using text columns
   - Top N analysis (Top 10 Products, Top Locations)
   - Grouped comparisons
   - Size: Medium (1/2 width)

4. **Pie Charts** (1-2 widgets)
   - Distribution analysis using text columns
   - Percentage breakdowns
   - Category composition
   - Size: Medium (1/2 width)

5. **Area Charts** (1-2 widgets)
   - Cumulative trends
   - Stacked metrics
   - Volume over time
   - Size: Large (full width)

6. **Gauges** (2-3 widgets)
   - Current value indicators
   - Min/Max thresholds
   - Performance metrics
   - Size: Small (1/4 width)

7. **Tables** (1 widget)
   - Recent records
   - Raw data preview
   - Multi-column display
   - Size: Large (full width)

### 4. **3-Step Wizard Flow** 📝

#### Step 1: Template Selection
- Browse 6 professional templates
- See template category and description
- View recommended table types
- Preview widget types included
- Click template card to select

#### Step 2: Schema & Table Selection
- **Schema Selection (New!)**:
  - Choose specific schema from dropdown
  - See table count per schema
  - Option to view "All Schemas"
  - Automatically filters tables below
- **Table Selection**:
  - See tables from selected schema (or all)
  - View table schema and name
  - Select single or multiple tables
  - See selection count badge
  - Recommended tables highlighted
  - Checkbox-based multi-selection
- **Auto-Clear**: Changing schema clears table selection

#### Step 3: Preview & Generate
- See all auto-generated widgets
- Preview widget types and configurations
- Review widget count summary
- Edit widget names if needed
- Click "Generate Dashboard" to create

### 5. **Widget Configuration** ⚙️

Each auto-generated widget includes:

```typescript
{
  chartType: 'line' | 'bar' | 'pie' | 'stat' | 'area' | 'gauge' | 'table',
  name: 'Auto-generated descriptive name',
  tableName: 'selected_table',
  schemaName: 'public',
  timestampColumn: 'timestamp',        // For time-series charts
  metricColumns: ['value', 'amount'],  // Numeric columns to visualize
  aggregation: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX',
  groupBy: 'category',                 // For grouped charts
  size: 'small' | 'medium' | 'large',  // Widget size
  isVisible: true,
  loading: false
}
```

## How to Use

### Quick Start: Create Your First Dashboard

1. **Open Wizard**
   - Click **Templates** button (📋) in top toolbar
   - Smart Dashboard Wizard modal opens

2. **Choose Template**
   - Browse 6 available templates
   - Read descriptions and recommendations
   - Click on template card to select
   - Example: Select "Analytics Dashboard" for web analytics

3. **Select Schema & Tables** (Two-Step Process)
   - **Step 3a: Select Schema**
     - Choose schema from dropdown (e.g., `public`, `analytics`, `monitoring`)
     - See table count per schema
     - Or select "All Schemas" to see all tables
   - **Step 3b: Select Tables**
     - Tables from selected schema are displayed
     - Check one or more tables
     - Example: Select `events`, `page_views`, `sessions` from `public` schema
     - Recommended tables show yellow badge
   - Click "Next" to proceed

4. **Preview & Generate**
   - See all auto-generated widgets (typically 6-10 per table)
   - Review widget names and types
   - Click **"Generate Dashboard"**
   - Wizard creates all widgets and closes

5. **View Dashboard**
   - Automatically switches to Visualizations tab
   - See all generated widgets
   - Widgets start loading data automatically
   - Customize individual widgets as needed

### Example Workflows

#### Workflow 1: E-Commerce Analytics

**Goal**: Create comprehensive sales analytics dashboard

**Steps**:
1. Select **"Financial Metrics"** template
2. Select schema: **"public"** (shows 12 tables)
3. Select tables: `orders`, `revenue`, `customers` from public schema
4. Wizard generates:
   - Total Revenue stat card
   - Daily revenue trend line
   - Top products bar chart
   - Revenue by category pie chart
   - Cumulative revenue area chart
   - Recent orders table
5. Click Generate → Dashboard created with 15+ widgets

**Result**: Complete financial dashboard tracking sales, trends, and customer behavior

#### Workflow 2: Server Monitoring

**Goal**: Monitor infrastructure health and performance

**Steps**:
1. Select **"System Monitoring"** template
2. Select schema: **"monitoring"** (shows 8 tables)
3. Select tables: `servers`, `metrics`, `alerts` from monitoring schema
4. Wizard generates:
   - CPU/Memory/Disk gauges
   - Response time trend lines
   - Server status stat cards
   - Alert distribution pie chart
   - Performance comparison bar chart
5. Click Generate → Monitoring dashboard created

**Result**: Real-time infrastructure monitoring with 12+ widgets

#### Workflow 3: IoT Temperature Monitoring

**Goal**: Track temperature sensors across locations

**Steps**:
1. Select **"IoT Sensor Dashboard"** template
2. Select schema: **"iot"** (shows 5 tables)
3. Select table: `temperature_readings` from iot schema
4. Wizard generates:
   - Current temperature stat cards
   - Temperature trend line (24h)
   - Min/Max/Avg gauges
   - Location distribution pie chart
   - Sensor comparison bar chart
   - Recent readings table
5. Click Generate → IoT dashboard created

**Result**: Complete sensor monitoring dashboard with 10+ widgets

#### Workflow 4: Multi-Table User Analytics

**Goal**: Track user engagement across multiple data sources

**Steps**:
1. Select **"User Engagement"** template
2. Select schema: **"analytics"** (shows 15 tables)
3. Select tables: `users`, `sessions`, `events`, `features` from analytics schema
4. Wizard generates widgets for EACH table:
   - **From users**: Total users, New users, Active users
   - **From sessions**: Session count, Avg duration, Bounce rate
   - **From events**: Event count, Events/user, Event trends
   - **From features**: Feature usage, Popular features
5. Click Generate → Comprehensive dashboard with 25+ widgets

**Result**: Multi-dimensional user analytics across all user activity

## Auto-Generation Examples

### Example 1: Single Table (Simple)

**Table**: `sensors` (id, sensor_id, name, location, temperature, humidity, timestamp)

**Template**: IoT Sensor Dashboard

**Generated Widgets**:
1. **Stat Card** - Total Sensors (COUNT)
2. **Stat Card** - Avg Temperature (AVG)
3. **Stat Card** - Avg Humidity (AVG)
4. **Line Chart** - Temperature Trend (timestamp × temperature)
5. **Line Chart** - Humidity Trend (timestamp × humidity)
6. **Bar Chart** - Temperature by Location (location × AVG(temperature))
7. **Pie Chart** - Sensor Distribution by Location (location × COUNT)
8. **Gauge** - Current Temperature
9. **Gauge** - Current Humidity
10. **Table** - Recent Readings (latest 10 records)

**Total**: 10 widgets auto-generated

### Example 2: Multiple Tables (Complex)

**Tables**:
- `orders` (id, customer_id, product_id, amount, status, created_at)
- `customers` (id, name, email, country, signup_date)
- `products` (id, name, category, price)

**Template**: Financial Metrics

**Generated Widgets**:

**From orders table (8 widgets)**:
1. Total Revenue (SUM amount)
2. Total Orders (COUNT)
3. Avg Order Value (AVG amount)
4. Revenue Trend (created_at × SUM amount)
5. Orders by Status (status × COUNT)
6. Revenue by Status (status × SUM amount)
7. Daily Orders Area Chart
8. Recent Orders Table

**From customers table (6 widgets)**:
9. Total Customers (COUNT)
10. New Customers (COUNT)
11. Customers by Country (country × COUNT)
12. Signup Trend (signup_date × COUNT)
13. Country Distribution Pie Chart
14. Recent Customers Table

**From products table (5 widgets)**:
15. Total Products (COUNT)
16. Avg Product Price (AVG price)
17. Products by Category (category × COUNT)
18. Price Distribution (category × AVG price)
19. Product Catalog Table

**Total**: 19 widgets across 3 tables

### Example 3: Column Type Detection

**Table**: `system_metrics`

**Columns**:
```sql
timestamp           TIMESTAMP  → Time axis
server_id           VARCHAR    → Group by dimension
cpu_usage           FLOAT      → Line chart metric
memory_usage        FLOAT      → Line chart metric
disk_usage          FLOAT      → Gauge metric
network_in          BIGINT     → Area chart metric
network_out         BIGINT     → Area chart metric
is_healthy          BOOLEAN    → Filter/status indicator
status              VARCHAR    → Category for pie chart
```

**Generated Widgets**:
1. **Stat Cards** (4):
   - Avg CPU Usage
   - Avg Memory Usage
   - Avg Disk Usage
   - Total Network Traffic

2. **Trend Lines** (3):
   - CPU Usage Over Time (timestamp × cpu_usage, grouped by server_id)
   - Memory Usage Trend (timestamp × memory_usage)
   - Network Traffic (timestamp × network_in + network_out)

3. **Gauges** (3):
   - Current CPU Usage
   - Current Memory Usage
   - Current Disk Usage

4. **Bar Charts** (2):
   - CPU by Server (server_id × AVG cpu_usage)
   - Memory by Server (server_id × AVG memory_usage)

5. **Pie Charts** (1):
   - Server Status Distribution (status × COUNT)

6. **Tables** (1):
   - Recent Metrics (latest 20 records)

**Total**: 14 widgets intelligently generated from column analysis

## Widget Naming Convention

The wizard auto-generates descriptive names:

### Pattern 1: Single Metric Stat Cards
```
Total {MetricName}        → "Total Revenue"
Average {MetricName}      → "Average Temperature"
Count of {TableName}      → "Count of Orders"
Max {MetricName}          → "Max CPU Usage"
Min {MetricName}          → "Min Temperature"
```

### Pattern 2: Trend Charts
```
{MetricName} Trend                    → "Revenue Trend"
{MetricName} Over Time                → "CPU Usage Over Time"
{TableName} - {MetricName} Trend      → "Sensors - Temperature Trend"
Daily {MetricName}                    → "Daily Orders"
```

### Pattern 3: Grouped Charts
```
{MetricName} by {GroupColumn}         → "Revenue by Category"
{TableName} by {GroupColumn}          → "Orders by Status"
Top 10 {GroupColumn}                  → "Top 10 Products"
{GroupColumn} Distribution            → "Location Distribution"
```

### Pattern 4: Multi-Table Widgets
```
{TableName} - {MetricName}            → "Orders - Total Revenue"
{Schema}.{Table} - {Metric}           → "public.sensors - Avg Temp"
```

## Performance Considerations

### Widget Generation Performance
- **Single table**: Generates 6-10 widgets in ~100ms
- **3 tables**: Generates 15-25 widgets in ~300ms
- **5 tables**: Generates 30-50 widgets in ~500ms

### Database Query Performance
- Wizard fetches table schemas using information_schema
- Efficient column metadata retrieval
- No data queries during generation
- Data loading happens after dashboard creation

### Optimization Tips
1. **Select relevant tables only** - Don't select all tables if not needed
2. **Start with template** - Templates optimize widget types
3. **Use appropriate aggregations** - SUM for totals, AVG for rates
4. **Limit time ranges** - Set global filters after generation

## Schema Selection Benefits

### Why Schema-First Selection?

1. **Better Organization** 📁
   - Large databases often have 50+ tables across multiple schemas
   - Schema selection reduces clutter and makes finding tables easier
   - Groups related tables together logically

2. **Cleaner UI** 🎨
   - Only shows relevant tables based on selected schema
   - Reduces scrolling and searching
   - Faster table discovery

3. **Prevents Errors** ✅
   - Avoids accidentally mixing tables from different schemas
   - Ensures data relationships are maintained
   - Reduces dashboard errors

4. **Performance** ⚡
   - Filters table list client-side for instant results
   - Reduces cognitive load when selecting tables
   - Faster decision making

### Schema Selection Patterns

#### Pattern 1: Single Schema Dashboard
**Use Case**: All related data in one schema
```
Schema: "public"
Tables: orders, customers, products
Result: E-commerce dashboard from public schema
```

#### Pattern 2: Schema-Specific Dashboard
**Use Case**: Monitoring or analytics schema
```
Schema: "monitoring"
Tables: servers, metrics, alerts, logs
Result: Infrastructure dashboard from monitoring schema
```

#### Pattern 3: All Schemas (Advanced)
**Use Case**: Cross-schema analytics
```
Schema: "All Schemas"
Tables: public.users, analytics.events, monitoring.logs
Result: Company-wide analytics dashboard
```

**Note**: When selecting "All Schemas", table names show as `schema.table` for clarity

## Best Practices

### 1. **Choose the Right Template**
- **Analytics** → Web traffic, user behavior, events
- **Monitoring** → Servers, systems, infrastructure
- **IoT** → Sensors, devices, measurements
- **Financial** → Revenue, sales, transactions
- **Engagement** → Users, sessions, retention
- **Inventory** → Stock, products, warehouses

### 2. **Select Related Tables**
✅ **Good**: Select tables that work together from the same schema
- **public schema**: orders + customers + products (complete sales view)
- **iot schema**: sensors + readings + alerts (full IoT monitoring)
- **analytics schema**: users + sessions + events (user journey)

❌ **Avoid**: Unrelated tables in single dashboard
- orders + server_logs + sensor_data (mixed contexts)
- Mixing tables from unrelated schemas without purpose

💡 **Tip**: Use schema selection to filter related tables automatically
- Select "public" schema → See only business tables
- Select "monitoring" schema → See only infrastructure tables
- Select "analytics" schema → See only analytics tables

### 3. **Review Before Generating**
- Check widget count (aim for 10-30 widgets)
- Verify table selections
- Ensure tables have timestamp columns
- Confirm numeric columns exist

### 4. **Customize After Generation**
- Edit widget names for clarity
- Adjust time ranges
- Add filters
- Reorder widgets
- Delete unnecessary widgets
- Combine similar metrics

### 5. **Use Appropriate Aggregations**
- **SUM** → Revenue, counts, totals
- **AVG** → Temperatures, ratings, durations
- **COUNT** → Records, users, events
- **MIN/MAX** → Extremes, thresholds, ranges

## Integration Points

### Dashboard Manager Integration
- Generated dashboards can be saved
- Appears in saved dashboards list
- Can be shared with team
- Supports versioning

### Global Filters Integration
- Apply filters to all generated widgets
- Time range filters work across all charts
- Category filters affect grouped widgets

### Alert Monitor Integration
- Set alerts on generated widgets
- Monitor thresholds on stat cards
- Alert on trend anomalies

### Export Integration
- Export entire dashboard as PDF
- Export individual widgets as CSV
- Share dashboard link

## Troubleshooting

### Issue: "No tables available"
**Cause**: Database connection not established or no tables exist
**Solution**:
- Check database connection
- Verify user has table read permissions
- Ensure tables exist in accessible schemas

### Issue: "No tables in selected schema"
**Cause**: Selected schema has no tables or tables are filtered out
**Solution**:
- Select a different schema from the dropdown
- Choose "All Schemas" to see all available tables
- Verify the schema exists and contains tables
- Check user permissions for the selected schema

### Issue: "My table selection cleared"
**Cause**: Schema selection changed (this is by design)
**Solution**:
- When you change schema, table selection is automatically cleared
- This prevents selecting incompatible tables from different schemas
- Select your schema first, then select tables

### Issue: "No widgets generated"
**Cause**: Selected tables have no compatible columns
**Solution**:
- Ensure tables have at least one numeric column
- Verify timestamp column exists for trends
- Check table has data

### Issue: "Widget not loading data"
**Cause**: SQL query error or missing columns
**Solution**:
- Check widget configuration
- Verify column names are correct
- Ensure aggregations are valid
- Review query logs

### Issue: "Too many widgets created"
**Cause**: Selected many tables with many columns
**Solution**:
- Generate dashboard with fewer tables
- Delete unwanted widgets after generation
- Use more specific templates

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + T` | Open Templates Wizard |
| `Enter` | Next step in wizard |
| `Esc` | Cancel wizard |
| `Ctrl/Cmd + A` | Select all tables (Step 2) |
| `Space` | Toggle table selection (Step 2) |

## Advanced Features

### 1. **Smart Column Analysis**
The wizard analyzes column names and types to make intelligent decisions:

```typescript
// Detects timestamp columns
['timestamp', 'created_at', 'updated_at', 'event_time', 'date']

// Detects common metrics
['revenue', 'amount', 'price', 'value', 'count', 'total']

// Detects categories
['status', 'category', 'type', 'group', 'location', 'region']

// Detects IDs (ignores for metrics)
['id', 'user_id', 'customer_id', '_id', 'uuid']
```

### 2. **Template Matching Algorithm**
Matches tables to templates based on name similarity:

```typescript
// Analytics template matches
'events', 'analytics', 'metrics', 'logs', 'tracking'

// Monitoring template matches
'servers', 'metrics', 'system', 'monitoring', 'health'

// IoT template matches
'sensors', 'devices', 'readings', 'measurements', 'telemetry'

// Similarity score: 80%+ = Strong match (recommended badge)
```

### 3. **Widget Sizing Algorithm**
Automatically assigns sizes based on widget type:

```typescript
// Small (1/4 width) - Quick glance metrics
- Stat cards
- Gauges
- Single-value indicators

// Medium (1/2 width) - Comparative analysis
- Bar charts
- Pie charts
- Small tables

// Large (full width) - Detailed analysis
- Line charts
- Area charts
- Large tables
- Multi-metric dashboards
```

## Technical Details

### Supported Widget Types
- ✅ Line Chart
- ✅ Bar Chart
- ✅ Pie Chart
- ✅ Area Chart
- ✅ Stat Card
- ✅ Gauge
- ✅ Table
- ✅ Multi-metric charts

### Supported Aggregations
- SUM
- AVG
- COUNT
- MIN
- MAX
- COUNT_DISTINCT

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Dependencies
- React 18+
- TypeScript 4.5+
- Lucide React (icons)
- Recharts (visualizations)

## Future Enhancements

Planned features:
- ✅ Custom widget templates
- ✅ Drag-and-drop widget reordering in preview
- ✅ Widget edit before generation
- ✅ Save as custom template
- ✅ AI-powered widget suggestions
- ✅ Automatic dashboard refresh scheduling
- ✅ Collaborative dashboard editing
- ✅ Widget library marketplace

## Real-World Use Cases

### Use Case 1: Startup Analytics Dashboard
**Company**: Early-stage SaaS startup
**Need**: Monitor user growth, engagement, revenue
**Solution**:
1. Select "User Engagement" + "Financial Metrics" templates
2. Select tables: users, subscriptions, events, revenue
3. Generate → 20 widgets created
4. Result: Complete growth dashboard in 2 minutes

### Use Case 2: Manufacturing IoT Monitoring
**Company**: Industrial manufacturing plant
**Need**: Monitor 500+ temperature sensors across factory floors
**Solution**:
1. Select "IoT Sensor Dashboard" template
2. Select tables: sensors, temperature_readings, alerts
3. Generate → 15 widgets with real-time monitoring
4. Result: Plant-wide monitoring dashboard

### Use Case 3: E-Commerce Operations
**Company**: Online retail platform
**Need**: Track orders, inventory, customers, revenue
**Solution**:
1. Select "Financial Metrics" + "Inventory & Stock" templates
2. Select tables: orders, inventory, customers, products
3. Generate → 30 widgets across all operations
4. Result: Comprehensive operations dashboard

### Use Case 4: Multi-Tenant SaaS Platform
**Company**: B2B SaaS with 100+ customers
**Need**: Per-tenant analytics and system monitoring
**Solution**:
1. Select "Analytics Dashboard" template
2. Select tables: tenant_metrics, usage_data, billing
3. Add global filter by tenant_id
4. Generate → 18 widgets, filter by tenant
5. Result: Reusable template for all tenants

## Support

For questions or issues:
- Check template recommendations
- Review auto-generated widget configurations
- Verify table schemas have required columns
- Contact support team

---

**Version**: 1.0.0
**Last Updated**: 2026-01-24
**Component**: SmartDashboardWizard.tsx
