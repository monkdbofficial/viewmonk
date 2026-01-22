'use client';

import { useState } from 'react';
import { X, Copy, Check, Database, Plus, Eye, Edit, Trash2, Search } from 'lucide-react';

interface CRUDInfoDialogProps {
  onClose: () => void;
}

type OperationType = 'create' | 'read' | 'update' | 'delete';

export default function CRUDInfoDialog({ onClose }: CRUDInfoDialogProps) {
  const [activeTab, setActiveTab] = useState<OperationType>('create');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({ code, id, title }: { code: string; id: string; title: string }) => (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
        <button
          onClick={() => copyToClipboard(code, id)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
        >
          {copiedCode === id ? (
            <>
              <Check className="w-3 h-3 text-green-600" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto text-xs">
        <code>{code}</code>
      </pre>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Complete CRUD Operations Guide
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Create, Read, Update, Delete - SQL Examples for Time-Series Data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'create'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-800'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            CREATE
          </button>
          <button
            onClick={() => setActiveTab('read')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'read'
                ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400 bg-white dark:bg-gray-800'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            READ
          </button>
          <button
            onClick={() => setActiveTab('update')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'update'
                ? 'text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-600 dark:border-yellow-400 bg-white dark:bg-gray-800'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Edit className="w-4 h-4" />
            UPDATE
          </button>
          <button
            onClick={() => setActiveTab('delete')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'delete'
                ? 'text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400 bg-white dark:bg-gray-800'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            DELETE
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'create' && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  CREATE - Creating Tables & Inserting Data
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Use CREATE TABLE to define schema and INSERT to add data.
                </p>
              </div>

              <CodeBlock
                id="create-iot-table"
                title="1. Create IoT Sensor Table"
                code={`-- Create table for IoT sensor data
CREATE TABLE demo.factory_sensors (
  sensor_id TEXT,
  timestamp TIMESTAMP,
  location TEXT,
  temperature DOUBLE,
  humidity DOUBLE,
  pressure DOUBLE,
  PRIMARY KEY (sensor_id, timestamp)
);`}
              />

              <CodeBlock
                id="create-app-metrics"
                title="2. Create Application Metrics Table"
                code={`-- Create table for application performance metrics
CREATE TABLE demo.app_metrics (
  app_name TEXT,
  timestamp TIMESTAMP,
  request_count INTEGER,
  error_count INTEGER,
  avg_response_ms DOUBLE,
  active_users INTEGER,
  PRIMARY KEY (app_name, timestamp)
);`}
              />

              <CodeBlock
                id="create-stock-table"
                title="3. Create Stock Market Table"
                code={`-- Create table for stock market data
CREATE TABLE demo.stock_prices (
  symbol TEXT,
  timestamp TIMESTAMP,
  open_price DOUBLE,
  close_price DOUBLE,
  high_price DOUBLE,
  low_price DOUBLE,
  volume BIGINT,
  PRIMARY KEY (symbol, timestamp)
);`}
              />

              <CodeBlock
                id="insert-single"
                title="4. Insert Single Row"
                code={`-- Insert a single sensor reading
INSERT INTO demo.factory_sensors
  (sensor_id, timestamp, location, temperature, humidity, pressure)
VALUES
  ('sensor_01', '2024-01-15T10:30:00Z', 'Floor 1', 22.5, 45.2, 1013.2);`}
              />

              <CodeBlock
                id="insert-multiple"
                title="5. Insert Multiple Rows"
                code={`-- Insert multiple sensor readings at once
INSERT INTO demo.factory_sensors
  (sensor_id, timestamp, location, temperature, humidity, pressure)
VALUES
  ('sensor_01', '2024-01-15T10:30:00Z', 'Floor 1', 22.5, 45.2, 1013.2),
  ('sensor_01', '2024-01-15T10:31:00Z', 'Floor 1', 22.6, 45.3, 1013.1),
  ('sensor_02', '2024-01-15T10:30:00Z', 'Floor 2', 23.1, 48.5, 1013.5),
  ('sensor_02', '2024-01-15T10:31:00Z', 'Floor 2', 23.2, 48.7, 1013.4);`}
              />

              <CodeBlock
                id="insert-with-arrays"
                title="6. Insert with Arrays"
                code={`-- Create table with array columns
CREATE TABLE demo.device_logs (
  device_id TEXT,
  timestamp TIMESTAMP,
  tags ARRAY(TEXT),
  readings ARRAY(DOUBLE),
  PRIMARY KEY (device_id, timestamp)
);

-- Insert data with arrays
INSERT INTO demo.device_logs (device_id, timestamp, tags, readings)
VALUES ('dev001', CURRENT_TIMESTAMP, ['production', 'critical'], [22.5, 45.2, 1013.2]);`}
              />
            </div>
          )}

          {activeTab === 'read' && (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">
                  READ - Querying & Analyzing Data
                </h3>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Use SELECT statements with WHERE, GROUP BY, and aggregations.
                </p>
              </div>

              <CodeBlock
                id="read-all"
                title="1. Select All Data"
                code={`-- Get all sensor readings
SELECT *
FROM demo.factory_sensors
ORDER BY timestamp DESC
LIMIT 100;`}
              />

              <CodeBlock
                id="read-filtered"
                title="2. Filter by Time Range"
                code={`-- Get readings from last 24 hours
SELECT sensor_id, timestamp, temperature, humidity
FROM demo.factory_sensors
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
  AND sensor_id = 'sensor_01'
ORDER BY timestamp DESC;`}
              />

              <CodeBlock
                id="read-aggregated"
                title="3. Aggregated Time-Series Data"
                code={`-- Get hourly averages
SELECT
  DATE_TRUNC('hour', timestamp) AS hour,
  sensor_id,
  AVG(temperature) AS avg_temp,
  MAX(temperature) AS max_temp,
  MIN(temperature) AS min_temp,
  AVG(humidity) AS avg_humidity
FROM demo.factory_sensors
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp), sensor_id
ORDER BY hour DESC, sensor_id;`}
              />

              <CodeBlock
                id="read-moving-average"
                title="4. Moving Average"
                code={`-- Calculate 5-period moving average
SELECT
  timestamp,
  sensor_id,
  temperature,
  AVG(temperature) OVER (
    PARTITION BY sensor_id
    ORDER BY timestamp
    ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
  ) AS moving_avg_5
FROM demo.factory_sensors
WHERE sensor_id = 'sensor_01'
ORDER BY timestamp DESC
LIMIT 100;`}
              />

              <CodeBlock
                id="read-anomalies"
                title="5. Detect Anomalies"
                code={`-- Find readings above/below normal range
SELECT
  sensor_id,
  timestamp,
  temperature,
  CASE
    WHEN temperature > 30 THEN 'TOO HOT'
    WHEN temperature < 15 THEN 'TOO COLD'
    ELSE 'NORMAL'
  END AS status
FROM demo.factory_sensors
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 day'
  AND (temperature > 30 OR temperature < 15)
ORDER BY timestamp DESC;`}
              />

              <CodeBlock
                id="read-percentiles"
                title="6. Calculate Percentiles"
                code={`-- Get 50th, 95th, and 99th percentiles
SELECT
  sensor_id,
  COUNT(*) AS readings,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY temperature) AS p50_temp,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY temperature) AS p95_temp,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY temperature) AS p99_temp
FROM demo.factory_sensors
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY sensor_id;`}
              />

              <CodeBlock
                id="read-latest"
                title="7. Get Latest Reading per Sensor"
                code={`-- Get most recent reading for each sensor
SELECT DISTINCT ON (sensor_id)
  sensor_id,
  timestamp,
  location,
  temperature,
  humidity,
  pressure
FROM demo.factory_sensors
ORDER BY sensor_id, timestamp DESC;`}
              />
            </div>
          )}

          {activeTab === 'update' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                  UPDATE - Modifying Existing Data
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Use UPDATE statements to modify existing records. Be careful with WHERE clause!
                </p>
              </div>

              <CodeBlock
                id="update-single"
                title="1. Update Single Record"
                code={`-- Update a specific reading
UPDATE demo.factory_sensors
SET temperature = 22.8,
    humidity = 46.0
WHERE sensor_id = 'sensor_01'
  AND timestamp = '2024-01-15T10:30:00Z';`}
              />

              <CodeBlock
                id="update-conditional"
                title="2. Conditional Update"
                code={`-- Update location for all sensors on Floor 1
UPDATE demo.factory_sensors
SET location = 'Floor 1 - Section A'
WHERE location = 'Floor 1'
  AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days';`}
              />

              <CodeBlock
                id="update-calculated"
                title="3. Update with Calculation"
                code={`-- Convert temperature from Celsius to Fahrenheit
UPDATE demo.factory_sensors
SET temperature = (temperature * 9/5) + 32
WHERE sensor_id = 'sensor_01'
  AND timestamp >= '2024-01-15T00:00:00Z';`}
              />

              <CodeBlock
                id="update-multiple-conditions"
                title="4. Update Multiple Columns"
                code={`-- Update multiple fields based on conditions
UPDATE demo.factory_sensors
SET
  temperature = CASE
    WHEN temperature > 100 THEN 100
    WHEN temperature < -50 THEN -50
    ELSE temperature
  END,
  humidity = CASE
    WHEN humidity > 100 THEN 100
    WHEN humidity < 0 THEN 0
    ELSE humidity
  END
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 day';`}
              />

              <CodeBlock
                id="update-array"
                title="5. Update Array Column"
                code={`-- Add tags to device logs
UPDATE demo.device_logs
SET tags = tags || ['updated', 'reviewed']
WHERE device_id = 'dev001'
  AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour';`}
              />

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  ⚠️ Important: Always Use WHERE Clause
                </h4>
                <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                  Without WHERE, UPDATE affects ALL rows! Always test with SELECT first:
                </p>
                <pre className="bg-gray-900 text-yellow-400 p-2 rounded text-xs">
{`-- Test your WHERE clause with SELECT first:
SELECT * FROM demo.factory_sensors
WHERE sensor_id = 'sensor_01' AND timestamp = '2024-01-15T10:30:00Z';

-- Then apply the UPDATE:
UPDATE demo.factory_sensors
SET temperature = 23.0
WHERE sensor_id = 'sensor_01' AND timestamp = '2024-01-15T10:30:00Z';`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'delete' && (
            <div className="space-y-6">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                  DELETE - Removing Data
                </h3>
                <p className="text-sm text-red-800 dark:text-red-200">
                  ⚠️ <strong>CAUTION:</strong> DELETE is permanent and cannot be undone. Always backup first!
                </p>
              </div>

              <CodeBlock
                id="delete-specific"
                title="1. Delete Specific Records"
                code={`-- Delete a specific reading
DELETE FROM demo.factory_sensors
WHERE sensor_id = 'sensor_01'
  AND timestamp = '2024-01-15T10:30:00Z';`}
              />

              <CodeBlock
                id="delete-old-data"
                title="2. Delete Old Data"
                code={`-- Delete data older than 90 days
DELETE FROM demo.factory_sensors
WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '90 days';`}
              />

              <CodeBlock
                id="delete-by-sensor"
                title="3. Delete All Data for a Sensor"
                code={`-- Remove all readings from a decommissioned sensor
DELETE FROM demo.factory_sensors
WHERE sensor_id = 'sensor_99';`}
              />

              <CodeBlock
                id="delete-conditional"
                title="4. Delete Based on Conditions"
                code={`-- Delete invalid readings
DELETE FROM demo.factory_sensors
WHERE temperature < -100
   OR temperature > 200
   OR humidity < 0
   OR humidity > 100;`}
              />

              <CodeBlock
                id="delete-with-subquery"
                title="5. Delete Using Subquery"
                code={`-- Delete readings from inactive sensors
DELETE FROM demo.factory_sensors
WHERE sensor_id IN (
  SELECT sensor_id
  FROM demo.sensor_status
  WHERE status = 'inactive'
);`}
              />

              <CodeBlock
                id="drop-table"
                title="6. Drop Entire Table"
                code={`-- ⚠️ DESTRUCTIVE: Remove table and all data
DROP TABLE IF EXISTS demo.factory_sensors;

-- Recreate if needed
CREATE TABLE demo.factory_sensors (
  sensor_id TEXT,
  timestamp TIMESTAMP,
  temperature DOUBLE,
  PRIMARY KEY (sensor_id, timestamp)
);`}
              />

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  💡 Best Practices for DELETE
                </h4>
                <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2 list-disc list-inside">
                  <li><strong>Always test with SELECT first:</strong> Use SELECT with same WHERE to see what will be deleted</li>
                  <li><strong>Use transactions:</strong> Wrap in BEGIN/COMMIT for safety</li>
                  <li><strong>Backup first:</strong> Export data before bulk deletes</li>
                  <li><strong>Consider archiving:</strong> Move to archive table instead of deleting</li>
                  <li><strong>Use LIMIT:</strong> Delete in batches for large datasets</li>
                </ul>
              </div>

              <CodeBlock
                id="delete-safe-pattern"
                title="7. Safe Delete Pattern"
                code={`-- Step 1: Check what will be deleted
SELECT COUNT(*)
FROM demo.factory_sensors
WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '90 days';

-- Step 2: Backup to archive table (optional)
CREATE TABLE demo.factory_sensors_archive AS
SELECT * FROM demo.factory_sensors
WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '90 days';

-- Step 3: Delete in transaction
BEGIN;
DELETE FROM demo.factory_sensors
WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '90 days';
-- Review changes, then COMMIT or ROLLBACK
COMMIT;`}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              💡 Tip: Click "Copy" on any example to use it in Query Editor
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
