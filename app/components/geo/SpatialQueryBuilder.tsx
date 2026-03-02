'use client';

import { useState, useEffect } from 'react';
import { MapPin, Circle, Square, Maximize2, Play, Copy, Check, AlertCircle, CheckCircle, History, Zap, Code, RefreshCw, HelpCircle, X } from 'lucide-react';
import TableColumnSelector, { TableColumnSelection } from './TableColumnSelector';
import { geospatialConfig } from '@/app/config/geospatial.config';

interface QueryTemplate {
  name: string;
  type: 'distance' | 'within' | 'intersects';
  description: string;
  icon: any;
}

interface SpatialQueryBuilderProps {
  onQueryExecute?: (query: string) => void;
  onQueryChange?: (query: string) => void;
  initialCollection?: string;
  queryHistory?: string[];
  onLoadQuery?: (query: string) => void;
}

export default function SpatialQueryBuilder({
  onQueryExecute,
  onQueryChange,
  initialCollection = '',
  queryHistory = [],
  onLoadQuery
}: SpatialQueryBuilderProps) {
  const [queryType, setQueryType] = useState<'distance' | 'within' | 'intersects'>('distance');
  const [tableSelection, setTableSelection] = useState<TableColumnSelection | null>(null);
  const collection = tableSelection?.fullTableName || '';
  const fieldName = tableSelection?.geoColumn || '';

  // Distance query parameters - use better defaults for user-friendliness
  const [centerLat, setCenterLat] = useState(geospatialConfig.query.presets.usa.lat.toString());
  const [centerLng, setCenterLng] = useState(geospatialConfig.query.presets.usa.lng.toString());
  const [radius, setRadius] = useState('50'); // Default to 50 km - more likely to get results
  const [radiusUnit, setRadiusUnit] = useState<'meters' | 'kilometers' | 'miles'>('kilometers');

  // Within/Intersects parameters
  const [geometry, setGeometry] = useState('POLYGON((-74.0060 40.7128, -73.9352 40.7306, -73.9712 40.7831, -74.0060 40.7128))');

  // UI state
  const [generatedQuery, setGeneratedQuery] = useState('-- Select a table to begin');
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [orderBy, setOrderBy] = useState(true);
  const [limit, setLimit] = useState(geospatialConfig.query.defaultLimit.toString());
  const [wktError, setWktError] = useState<string | null>(null);
  const [showSuggestedQueries, setShowSuggestedQueries] = useState(false);
  const [tableStats, setTableStats] = useState<{rowCount?: number, sampleData?: any} | null>(null);
  const [editMode, setEditMode] = useState<'visual' | 'sql'>('visual');
  const [customQuery, setCustomQuery] = useState('');
  const [savedCustomQueries, setSavedCustomQueries] = useState<Array<{id: string, name: string, sql: string}>>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [queryName, setQueryName] = useState('');
  const [showGuidance, setShowGuidance] = useState(false);

  // WKT validation patterns
  const WKT_PATTERNS = {
    POINT: /^POINT\s*\(\s*-?\d+\.?\d*\s+-?\d+\.?\d*\s*\)$/i,
    LINESTRING: /^LINESTRING\s*\(.*\)$/i,
    POLYGON: /^POLYGON\s*\(\(.*\)\)$/i,
    MULTIPOINT: /^MULTIPOINT\s*\(.*\)$/i,
    MULTILINESTRING: /^MULTILINESTRING\s*\(.*\)$/i,
    MULTIPOLYGON: /^MULTIPOLYGON\s*\(.*\)$/i,
  };

  const validateWKT = (wkt: string): boolean => {
    const trimmed = wkt.trim();
    if (!trimmed) {
      setWktError('Geometry cannot be empty');
      return false;
    }

    // Check if matches any WKT pattern
    const isValid = Object.values(WKT_PATTERNS).some(pattern => pattern.test(trimmed));

    if (!isValid) {
      setWktError(
        'Invalid WKT format. Examples:\n' +
        '• POINT(lon lat): POINT(-74.006 40.7128)\n' +
        '• LINESTRING: LINESTRING(lon1 lat1, lon2 lat2)\n' +
        '• POLYGON: POLYGON((lon1 lat1, lon2 lat2, lon3 lat3, lon1 lat1))'
      );
      return false;
    }

    setWktError(null);
    return true;
  };

  const handleGeometryChange = (value: string) => {
    setGeometry(value);
    if (value.trim()) {
      validateWKT(value);
    } else {
      setWktError(null);
    }
  };

  // Get available query templates based on geo column type
  const getAvailableQueryTemplates = (): QueryTemplate[] => {
    // Check if the geo column is geo_point or geo_shape
    const geoColumnInfo = tableSelection?.columns.find(c => c.name === fieldName);
    const isGeoPoint = geoColumnInfo?.type.toLowerCase().includes('geo_point');

    const allTemplates: QueryTemplate[] = [
      {
        name: 'Distance',
        type: 'distance',
        description: 'Find points within a radius of a location',
        icon: Circle,
      },
      {
        name: 'Within',
        type: 'within',
        description: 'Find points inside a polygon',
        icon: Square,
      },
      {
        name: 'Intersects',
        type: 'intersects',
        description: 'Find shapes that intersect with geometry',
        icon: Maximize2,
      },
    ];

    // If geo_point, exclude intersects (it requires geo_shape)
    if (isGeoPoint) {
      return allTemplates.filter(t => t.type !== 'intersects');
    }

    return allTemplates;
  };

  const queryTemplates = getAvailableQueryTemplates();

  // Auto-switch query type if current type is not available for this column
  useEffect(() => {
    const availableTypes = queryTemplates.map(t => t.type);
    if (!availableTypes.includes(queryType)) {
      // Switch to distance as default safe option
      setQueryType('distance');
    }
  }, [fieldName, tableSelection]);

  // Generate query based on parameters
  useEffect(() => {
    if (!collection || !fieldName || !tableSelection) {
      setGeneratedQuery('-- Select a table and configure query parameters to generate SQL');
      return;
    }

    // Build proper column list for geospatial queries - FULLY DYNAMIC!
    // Always include: id, name, latitude, longitude for map display
    let selectColumns = '';

    // DYNAMIC column detection using patterns instead of hardcoded names
    const columns = [];
    const addedColumns = new Set<string>();

    // 1. ID column (CRITICAL - must be first for map display!)
    const idCol = tableSelection.columns.find(c =>
      c.name.toLowerCase() === 'id' ||
      c.name.toLowerCase() === '_id' ||
      c.name.toLowerCase().endsWith('_id') && c.name.toLowerCase() === c.name.toLowerCase().split('_').pop()
    );

    if (idCol) {
      columns.push('id');
      addedColumns.add('id');
    } else {
      // If no id column exists, generate sequential numbers
      columns.push('ROW_NUMBER() OVER() as id');
      addedColumns.add('id');
    }

    // 2. Name/Title column (for display purposes)
    const nameCol = tableSelection.columns.find(c => {
      const lower = c.name.toLowerCase();
      return lower === 'name' ||
             lower === 'title' ||
             lower.includes('_name') ||
             lower.includes('name_');
    });

    if (nameCol) {
      if (nameCol.name !== 'name') {
        columns.push(`${nameCol.name} as name`);
      } else {
        columns.push('name');
      }
      addedColumns.add(nameCol.name);
    } else {
      // Fallback: use first text column or generic name
      columns.push("'Location' as name");
    }

    // 3. Always extract latitude/longitude from geo_point for map display
    columns.push(`latitude(${fieldName}) as latitude`);
    columns.push(`longitude(${fieldName}) as longitude`);
    addedColumns.add(fieldName);

    // 4. Add other useful columns dynamically (location, category, numeric fields)
    tableSelection.columns.forEach(col => {
      if (addedColumns.has(col.name) || col.name === fieldName) return;

      const lower = col.name.toLowerCase();

      // Location-related columns (city, state, region, country, etc.)
      if (lower.includes('city') ||
          lower.includes('state') ||
          lower.includes('region') ||
          lower.includes('country') ||
          lower.includes('location') ||
          lower.includes('address')) {
        columns.push(col.name);
        addedColumns.add(col.name);
      }
      // Category/Type columns
      else if (lower.includes('category') ||
               lower.includes('type') ||
               lower.includes('status')) {
        columns.push(col.name);
        addedColumns.add(col.name);
      }
      // Numeric columns (revenue, price, amount, count, etc.) - round them
      else if (lower.includes('revenue') ||
               lower.includes('price') ||
               lower.includes('amount') ||
               lower.includes('total') ||
               lower.includes('cost') ||
               lower.includes('value')) {
        columns.push(`ROUND(${col.name}, 2) as ${col.name}`);
        addedColumns.add(col.name);
      }
    });

    // If user selected specific columns, add those too (excluding duplicates)
    if (tableSelection.columns.length > 0) {
      tableSelection.columns.forEach(col => {
        const colName = col.name;
        if (!['id', 'store_name', 'name', 'city', 'state', 'category', 'revenue', fieldName].includes(colName)) {
          columns.push(colName);
        }
      });
    }

    selectColumns = columns.length > 0 ? columns.join(',\n  ') : '*';

    let query = '';

    switch (queryType) {
      case 'distance':
        const radiusInMeters = radiusUnit === 'kilometers'
          ? parseFloat(radius) * 1000
          : radiusUnit === 'miles'
          ? parseFloat(radius) * 1609.34
          : parseFloat(radius);

        // Add distance calculation for reference
        const distanceCol = radiusUnit === 'kilometers'
          ? `ROUND(distance(${fieldName}, 'POINT(${centerLng} ${centerLat})') / 1000, 2) as distance_km`
          : radiusUnit === 'miles'
          ? `ROUND(distance(${fieldName}, 'POINT(${centerLng} ${centerLat})') / 1609.34, 2) as distance_miles`
          : `ROUND(distance(${fieldName}, 'POINT(${centerLng} ${centerLat})'), 2) as distance_meters`;

        query = `SELECT\n  ${selectColumns},\n  ${distanceCol}
FROM ${collection}
WHERE distance(${fieldName}, 'POINT(${centerLng} ${centerLat})') < ${radiusInMeters}`;

        if (orderBy) {
          query += `\nORDER BY distance(${fieldName}, 'POINT(${centerLng} ${centerLat})')`;
        }
        break;

      case 'within':
        query = `SELECT\n  ${selectColumns}
FROM ${collection}
WHERE within(${fieldName}, '${geometry}')`;
        break;

      case 'intersects':
        query = `SELECT\n  ${selectColumns}
FROM ${collection}
WHERE intersects(${fieldName}, '${geometry}')`;
        break;
    }

    if (limit && parseInt(limit) > 0) {
      query += `\nLIMIT ${limit}`;
    }

    query += ';';

    setGeneratedQuery(query);
    if (onQueryChange) {
      onQueryChange(query);
    }
  }, [queryType, collection, fieldName, centerLat, centerLng, radius, radiusUnit, geometry, orderBy, limit, tableSelection]);

  const handleExecuteQuery = () => {
    if (onQueryExecute) {
      const queryToExecute = editMode === 'sql' ? customQuery : generatedQuery;
      onQueryExecute(queryToExecute);
    }
  };

  const switchToSQLMode = () => {
    setCustomQuery(generatedQuery);
    setEditMode('sql');
  };

  const formatSQL = () => {
    // Basic SQL formatting
    const formatted = customQuery
      .replace(/SELECT/gi, 'SELECT\n  ')
      .replace(/FROM/gi, '\nFROM')
      .replace(/WHERE/gi, '\nWHERE')
      .replace(/ORDER BY/gi, '\nORDER BY')
      .replace(/GROUP BY/gi, '\nGROUP BY')
      .replace(/LIMIT/gi, '\nLIMIT')
      .replace(/,/g, ',\n  ')
      .replace(/\n\s+\n/g, '\n');
    setCustomQuery(formatted);
  };

  const saveCustomQuery = () => {
    if (!queryName.trim()) {
      alert('Please enter a name for your query');
      return;
    }

    const newQuery = {
      id: Date.now().toString(),
      name: queryName.trim(),
      sql: customQuery
    };

    setSavedCustomQueries(prev => [...prev, newQuery]);
    setQueryName('');
    setShowSaveDialog(false);

    // Save to localStorage
    const saved = [...savedCustomQueries, newQuery];
    localStorage.setItem('spatial-custom-queries', JSON.stringify(saved));
  };

  const loadCustomQuery = (sql: string) => {
    setCustomQuery(sql);
    setEditMode('sql');
  };

  const deleteCustomQuery = (id: string) => {
    const updated = savedCustomQueries.filter(q => q.id !== id);
    setSavedCustomQueries(updated);
    localStorage.setItem('spatial-custom-queries', JSON.stringify(updated));
  };

  // Load saved queries from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('spatial-custom-queries');
    if (saved) {
      try {
        setSavedCustomQueries(JSON.parse(saved));
      } catch {
        // malformed localStorage data — start with empty saved queries
      }
    }
  }, []);

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(generatedQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadExample = (type: 'distance' | 'within' | 'intersects') => {
    setQueryType(type);

    switch (type) {
      case 'distance':
        setCenterLat('40.7128');
        setCenterLng('-74.0060');
        setRadius('50');
        setRadiusUnit('kilometers');
        break;
      case 'within':
        setGeometry('POLYGON((-74.0060 40.7128, -73.9352 40.7306, -73.9712 40.7831, -74.0060 40.7128))');
        break;
      case 'intersects':
        setGeometry('POLYGON((-74.0060 40.7128, -73.9352 40.7306, -73.9712 40.7831, -74.0060 40.7128))');
        break;
    }
  };

  // Quick preset locations
  const presetLocations = [
    { name: 'Times Square, NYC', lat: '40.7589', lng: '-73.9851', icon: '🗽' },
    { name: 'Downtown LA', lat: '34.0522', lng: '-118.2437', icon: '🌴' },
    { name: 'Chicago Loop', lat: '41.8781', lng: '-87.6298', icon: '🏙️' },
    { name: 'Miami Beach', lat: '25.7907', lng: '-80.1300', icon: '🏖️' },
    { name: 'San Francisco', lat: '37.7749', lng: '-122.4194', icon: '🌉' },
  ];

  const loadPresetLocation = (lat: string, lng: string) => {
    setCenterLat(lat);
    setCenterLng(lng);
  };

  // Preset polygon examples
  const presetPolygons = [
    {
      name: 'Manhattan Triangle',
      wkt: 'POLYGON((-74.0060 40.7128, -73.9352 40.7306, -73.9712 40.7831, -74.0060 40.7128))',
      icon: '📍'
    },
    {
      name: 'LA Downtown Area',
      wkt: 'POLYGON((-118.2600 34.0400, -118.2300 34.0400, -118.2300 34.0600, -118.2600 34.0600, -118.2600 34.0400))',
      icon: '🌆'
    },
    {
      name: 'Simple Square',
      wkt: 'POLYGON((-74.01 40.70, -74.00 40.70, -74.00 40.71, -74.01 40.71, -74.01 40.70))',
      icon: '⬜'
    },
  ];

  const loadPresetPolygon = (wkt: string) => {
    setGeometry(wkt);
    validateWKT(wkt);
  };

  // Generate suggested queries based on ACTUAL selected table and columns
  const getSuggestedQueries = () => {
    if (!collection || !fieldName || !tableSelection) return [];

    // Detect available columns dynamically
    const availableColumns = tableSelection.columns || [];
    const hasId = availableColumns.some(c => c.name.toLowerCase() === 'id');
    const nameCol = availableColumns.find(c =>
      c.name.toLowerCase().includes('name') ||
      c.name.toLowerCase() === 'title'
    )?.name;
    const locationCol = availableColumns.find(c =>
      c.name.toLowerCase().includes('city') ||
      c.name.toLowerCase().includes('location')
    )?.name;
    const categoryCol = availableColumns.find(c =>
      c.name.toLowerCase().includes('category') ||
      c.name.toLowerCase().includes('type') ||
      c.name.toLowerCase().includes('state') ||
      c.name.toLowerCase().includes('region')
    )?.name;

    // Build SELECT columns dynamically
    const selectCols = [];
    if (hasId) selectCols.push('id');
    if (nameCol) selectCols.push(`${nameCol} as name`);
    selectCols.push(`latitude(${fieldName}) as latitude`);
    selectCols.push(`longitude(${fieldName}) as longitude`);
    if (locationCol && locationCol !== fieldName) selectCols.push(locationCol);

    const selectStr = selectCols.join(',\n  ');

    const queries = [];

    // Query 1: All Records (Always available)
    queries.push({
      name: 'All Records (First 100)',
      icon: '📋',
      type: 'View All',
      sql: `SELECT\n  ${selectStr}\nFROM ${collection}\nLIMIT 100;`,
      description: 'View first 100 records from the table'
    });

    // Query 2: Nearest Locations (Always available for geo tables)
    queries.push({
      name: 'Nearest to Point',
      icon: '📍',
      type: 'Distance',
      sql: `SELECT\n  ${selectStr},\n  ROUND(distance(${fieldName}, 'POINT(-74.0060 40.7128)') / 1000, 2) as distance_km\nFROM ${collection}\nORDER BY distance(${fieldName}, 'POINT(-74.0060 40.7128)')\nLIMIT 10;`,
      description: 'Find 10 nearest locations to NYC'
    });

    // Query 3: Group by category (Only if category column exists)
    if (categoryCol) {
      queries.push({
        name: `Group By ${categoryCol}`,
        icon: '🗺️',
        type: 'Grouping',
        sql: `SELECT\n  ${categoryCol},\n  COUNT(*) as count\nFROM ${collection}\nGROUP BY ${categoryCol}\nORDER BY count DESC;`,
        description: `Group and count records by ${categoryCol}`
      });
    }

    // Query 4: Within Radius (Always available)
    queries.push({
      name: 'Within 50km Radius',
      icon: '⭕',
      type: 'Distance',
      sql: `SELECT\n  ${selectStr},\n  ROUND(distance(${fieldName}, 'POINT(-118.2437 34.0522)') / 1000, 2) as distance_km\nFROM ${collection}\nWHERE distance(${fieldName}, 'POINT(-118.2437 34.0522)') < 50000\nORDER BY distance_km\nLIMIT 100;`,
      description: '50km around Downtown LA'
    });

    return queries;
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Spatial Query Builder
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Build and execute geospatial queries visually
            </p>
          </div>
          <button
            onClick={() => setShowGuidance(true)}
            className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
            title="View user guide"
          >
            <HelpCircle className="h-4 w-4" />
            Guide
          </button>
        </div>

        {/* Quick Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => {
              loadExample('distance');
              loadPresetLocation('40.7589', '-73.9851');
              setRadius('50');
              setRadiusUnit('kilometers');
            }}
            className="flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
            title="Quick start: Find stores near Times Square"
          >
            <Zap className="h-3 w-3" />
            NYC 50km
          </button>
          <button
            onClick={() => {
              loadExample('distance');
              loadPresetLocation('34.0522', '-118.2437');
              setRadius('50');
              setRadiusUnit('kilometers');
            }}
            className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
            title="Quick start: Find stores near LA"
          >
            <Zap className="h-3 w-3" />
            LA 50km
          </button>
          <button
            onClick={() => {
              loadExample('within');
              loadPresetPolygon('POLYGON((-74.0060 40.7128, -73.9352 40.7306, -73.9712 40.7831, -74.0060 40.7128))');
            }}
            className="flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-900/50 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/30"
            title="Quick start: Manhattan area"
          >
            <Zap className="h-3 w-3" />
            Manhattan
          </button>
        </div>
      </div>

      {/* Query History - Recent Queries */}
      {queryHistory && queryHistory.length > 0 && (
        <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 p-3 dark:border-gray-700 dark:from-purple-900/10 dark:to-blue-900/10">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              📜 Recent Queries
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Click to rerun
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {queryHistory.slice(0, 3).map((query, idx) => {
              // Extract query type from SQL
              const isDistance = query.includes('distance(');
              const isWithin = query.includes('within(');
              const icon = isDistance ? '📍' : isWithin ? '🗺️' : '🔍';
              const type = isDistance ? 'Distance' : isWithin ? 'Within' : 'Query';

              return (
                <button
                  key={idx}
                  onClick={() => onLoadQuery && onLoadQuery(query)}
                  className="group flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs transition-all hover:border-blue-400 hover:bg-blue-50 hover:shadow dark:border-gray-600 dark:bg-gray-800 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
                  title={query.substring(0, 100)}
                >
                  <span>{icon}</span>
                  <span className="font-medium text-gray-700 group-hover:text-blue-700 dark:text-gray-300 dark:group-hover:text-blue-300">
                    {type} #{idx + 1}
                  </span>
                  <Play className="h-3 w-3 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Query Type Selection - Professional Dropdown */}
      <div className="border-b border-gray-200 bg-gradient-to-br from-blue-50/50 to-white p-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
        <label className="mb-3 block text-sm font-semibold text-gray-900 dark:text-white">
          Query Type
        </label>

        <div className="relative">
          <select
            value={queryType}
            onChange={(e) => loadExample(e.target.value as 'distance' | 'within' | 'intersects')}
            className="w-full appearance-none rounded-lg border-2 border-gray-300 bg-white px-4 py-3 pr-10 text-sm font-medium text-gray-900 shadow-sm transition-all hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-blue-500"
            style={{
              backgroundImage: 'none'
            }}
          >
            {queryTemplates.map((template) => {
              const iconMap = {
                distance: '📍',
                within: '🗺️',
                intersects: '🔍'
              };
              return (
                <option key={template.type} value={template.type}>
                  {iconMap[template.type]} {template.name} - {template.description}
                </option>
              );
            })}
          </select>

          {/* Custom dropdown arrow */}
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Selected query type description */}
        <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 dark:bg-blue-950/30">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {queryTemplates.find(t => t.type === queryType)?.description}
          </p>
        </div>
      </div>

      {/* Query Parameters */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Table and Column Selection */}
          <TableColumnSelector
            onSelectionChange={setTableSelection}
            initialTable={initialCollection}
            showGeoColumnsOnly={false}
          />

          {/* Suggested Queries - Shows when table is selected */}
          {collection && fieldName && (
            <div className="rounded-lg border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 dark:border-indigo-900/50 dark:from-indigo-900/10 dark:to-purple-900/10">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">
                    Suggested Queries
                  </h4>
                </div>
                <button
                  onClick={() => setShowSuggestedQueries(!showSuggestedQueries)}
                  className="text-xs font-medium text-indigo-700 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200"
                >
                  {showSuggestedQueries ? 'Hide' : 'Show'}
                </button>
              </div>

              {showSuggestedQueries && (
                <div className="space-y-2">
                  <p className="mb-3 text-xs text-indigo-700 dark:text-indigo-300">
                    Quick-start with these common queries for <strong>{collection}</strong>:
                  </p>
                  {getSuggestedQueries().map((query, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (onQueryExecute) {
                          onQueryExecute(query.sql);
                        }
                      }}
                      className="group flex w-full items-start gap-3 rounded-lg border border-indigo-300 bg-white p-3 text-left transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:shadow dark:border-indigo-700 dark:bg-indigo-900/20 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/30"
                    >
                      <span className="text-xl">{query.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">
                            {query.name}
                          </span>
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                            {query.type}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                          {query.description}
                        </p>
                      </div>
                      <Play className="h-4 w-4 flex-shrink-0 text-indigo-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-indigo-500" />
                    </button>
                  ))}
                </div>
              )}

              {!showSuggestedQueries && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400">
                  Click "Show" to see {getSuggestedQueries().length} suggested queries →
                </p>
              )}
            </div>
          )}

          {/* Distance Query Parameters */}
          {queryType === 'distance' && (
            <>
              {/* Quick Preset Locations */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-900/20">
                <h4 className="mb-2 text-xs font-semibold text-blue-900 dark:text-blue-300">
                  ⚡ Quick Locations
                </h4>
                <div className="flex flex-wrap gap-2">
                  {presetLocations.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => loadPresetLocation(preset.lat, preset.lng)}
                      className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-all hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                      title={`${preset.lat}, ${preset.lng}`}
                    >
                      {preset.icon} {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                  Center Point
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                      Latitude
                    </label>
                    <input
                      type="text"
                      value={centerLat}
                      onChange={(e) => setCenterLat(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="40.7128"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                      Longitude
                    </label>
                    <input
                      type="text"
                      value={centerLng}
                      onChange={(e) => setCenterLng(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="-74.0060"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                  Search Radius
                </h4>

                {/* Quick Radius Presets */}
                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => { setRadius('1'); setRadiusUnit('kilometers'); }}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    1 km
                  </button>
                  <button
                    onClick={() => { setRadius('5'); setRadiusUnit('kilometers'); }}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    5 km
                  </button>
                  <button
                    onClick={() => { setRadius('10'); setRadiusUnit('kilometers'); }}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    10 km
                  </button>
                  <button
                    onClick={() => { setRadius('50'); setRadiusUnit('kilometers'); }}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    50 km
                  </button>
                  <button
                    onClick={() => { setRadius('1'); setRadiusUnit('miles'); }}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    1 mi
                  </button>
                  <button
                    onClick={() => { setRadius('5'); setRadiusUnit('miles'); }}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    5 mi
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                      Distance
                    </label>
                    <input
                      type="text"
                      value={radius}
                      onChange={(e) => setRadius(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                      Unit
                    </label>
                    <select
                      value={radiusUnit}
                      onChange={(e) => setRadiusUnit(e.target.value as any)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="meters">Meters</option>
                      <option value="kilometers">Kilometers</option>
                      <option value="miles">Miles</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Within/Intersects Parameters */}
          {(queryType === 'within' || queryType === 'intersects') && (
            <>
              {/* Quick Preset Polygons */}
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-900/50 dark:bg-purple-900/20">
                <h4 className="mb-2 text-xs font-semibold text-purple-900 dark:text-purple-300">
                  ⚡ Example Polygons
                </h4>
                <div className="flex flex-wrap gap-2">
                  {presetPolygons.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => loadPresetPolygon(preset.wkt)}
                      className="rounded-lg border border-purple-300 bg-white px-3 py-1.5 text-xs font-medium text-purple-700 transition-all hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
                      title="Click to load this polygon"
                    >
                      {preset.icon} {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Geometry (WKT Format)
                </label>
                <textarea
                  value={geometry}
                  onChange={(e) => handleGeometryChange(e.target.value)}
                  rows={4}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-mono dark:bg-gray-700 dark:text-white ${
                    wktError
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-600'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600'
                  }`}
                  placeholder="POLYGON((lon1 lat1, lon2 lat2, lon3 lat3, lon1 lat1))"
                />
                {wktError ? (
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-900/50 dark:bg-red-900/20">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                    <p className="text-xs text-red-700 dark:text-red-400 whitespace-pre-line">{wktError}</p>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Enter geometry in Well-Known Text (WKT) format. Supported: POINT, LINESTRING, POLYGON, MULTI* variants
                  </p>
                )}
              </div>
            </>
          )}

          {/* Advanced Options */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                {queryType === 'distance' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="orderBy"
                      checked={orderBy}
                      onChange={(e) => setOrderBy(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="orderBy" className="text-sm text-gray-700 dark:text-gray-300">
                      Order by distance (nearest first)
                    </label>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                    Result Limit
                  </label>
                  <input
                    type="text"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="100"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SQL Query Section */}
      <div className="border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-900 dark:to-gray-800">
        {/* Mode Toggle */}
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-900 dark:text-white">
            📝 SQL Query
          </label>
          <div className="flex gap-2">
            {/* Mode Toggle Buttons */}
            <div className="flex rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
              <button
                onClick={() => setEditMode('visual')}
                className={`flex items-center gap-1.5 rounded-l-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  editMode === 'visual'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <Zap className="h-3 w-3" />
                Visual Builder
              </button>
              <button
                onClick={switchToSQLMode}
                className={`flex items-center gap-1.5 rounded-r-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  editMode === 'sql'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <Code className="h-3 w-3" />
                SQL Editor
              </button>
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopyQuery}
              className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Visual Mode - Read-only Preview */}
        {editMode === 'visual' && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <AlertCircle className="h-3 w-3" />
              Auto-generated from visual builder. Switch to SQL Editor to modify.
            </div>
            <pre className="mb-3 max-h-40 overflow-auto rounded-lg border border-gray-300 bg-gray-900 p-3 text-xs text-gray-100 shadow-inner dark:border-gray-700">
              <code>{generatedQuery}</code>
            </pre>
          </div>
        )}

        {/* SQL Editor Mode - Editable */}
        {editMode === 'sql' && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                <AlertCircle className="h-3 w-3" />
                Edit SQL directly. Your changes won't affect visual builder settings.
              </div>
              <button
                onClick={formatSQL}
                className="flex items-center gap-1 rounded-lg bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
              >
                <Code className="h-3 w-3" />
                Format SQL
              </button>
            </div>
            <textarea
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              rows={8}
              className="mb-3 w-full rounded-lg border border-blue-300 bg-gray-900 p-3 font-mono text-xs text-gray-100 shadow-inner focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-blue-700"
              placeholder="Enter your custom SQL query here..."
              spellCheck={false}
            />
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>💡 Tip: Write any SQL query, not just geospatial ones!</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleExecuteQuery}
            disabled={editMode === 'visual' ? (!collection || !fieldName) : !customQuery.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-blue-600 disabled:hover:to-blue-700"
          >
            <Play className="h-4 w-4" />
            {editMode === 'sql' ? 'Execute Custom Query' : 'Execute Query & View Results'}
          </button>

          {/* Reset Button for SQL Mode */}
          {editMode === 'sql' && (
            <button
              onClick={() => setCustomQuery(generatedQuery)}
              className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Reset to auto-generated query"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          )}

          {/* Save Query Button for SQL Mode */}
          {editMode === 'sql' && customQuery.trim() && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="flex items-center gap-1 rounded-lg border border-green-300 bg-green-50 px-3 py-3 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
              title="Save this custom query"
            >
              <CheckCircle className="h-4 w-4" />
              Save Query
            </button>
          )}
        </div>

        {/* Saved Custom Queries */}
        {savedCustomQueries.length > 0 && (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900/50 dark:bg-green-900/20">
            <div className="mb-2 text-xs font-semibold text-green-900 dark:text-green-300">
              💾 My Saved Queries ({savedCustomQueries.length})
            </div>
            <div className="space-y-1.5">
              {savedCustomQueries.map((query) => (
                <div
                  key={query.id}
                  className="flex items-center justify-between rounded-lg border border-green-300 bg-white p-2 dark:border-green-700 dark:bg-green-900/20"
                >
                  <button
                    onClick={() => loadCustomQuery(query.sql)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      {query.name}
                    </span>
                  </button>
                  <button
                    onClick={() => deleteCustomQuery(query.id)}
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Query Dialog */}
        {showSaveDialog && (
          <div className="mt-3 rounded-lg border-2 border-blue-300 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/30">
            <h4 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-300">
              Save Custom Query
            </h4>
            <input
              type="text"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && saveCustomQuery()}
              placeholder="Enter a name for this query..."
              className="mb-3 w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm dark:border-blue-600 dark:bg-gray-800 dark:text-white"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={saveCustomQuery}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => { setShowSaveDialog(false); setQueryName(''); }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Query Stats */}
        {collection && fieldName && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs dark:border-green-900/50 dark:bg-green-900/20">
            <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
            <span className="text-green-700 dark:text-green-300">
              Ready to query <strong>{collection}</strong> using <strong>{fieldName}</strong> column
              {limit && ` (limit: ${limit} results)`}
            </span>
          </div>
        )}
      </div>

      {/* User Guidance Modal */}
      {showGuidance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2">
                  <HelpCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Spatial Query Builder Guide
                  </h2>
                  <p className="text-sm text-blue-100">
                    Complete guide to building geospatial queries
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuidance(false)}
                className="rounded-lg p-2 text-white transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Overview */}
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                    <div className="h-1 w-1 rounded-full bg-blue-600"></div>
                    Overview
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    The Spatial Query Builder helps you create SQL queries for geospatial data without writing code.
                    Build queries visually or write custom SQL with full editing capabilities.
                  </p>
                </section>

                {/* Quick Start */}
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                    <div className="h-1 w-1 rounded-full bg-green-600"></div>
                    Quick Start
                  </h3>
                  <div className="space-y-2">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                      <p className="text-sm font-semibold text-green-900 dark:text-green-300">
                        ⚡ Use Quick Actions for instant results:
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-green-800 dark:text-green-400">
                        <li>• Click "NYC 50km" or "LA 50km" for pre-configured queries</li>
                        <li>• Click "Execute Query" to see results on the map immediately</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Query Types */}
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                    <div className="h-1 w-1 rounded-full bg-purple-600"></div>
                    Query Types
                  </h3>
                  <div className="space-y-3">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                      <div className="mb-2 flex items-center gap-2">
                        <Circle className="h-4 w-4 text-blue-600" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">Distance Query</h4>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Find all points within a specific radius from a center location.
                      </p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        Example: "Find all stores within 50km of Times Square"
                      </p>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                      <div className="mb-2 flex items-center gap-2">
                        <Square className="h-4 w-4 text-purple-600" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">Within Query</h4>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Find all points that fall inside a polygon boundary.
                      </p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        Example: "Find all stores within Manhattan" (requires WKT polygon)
                      </p>
                    </div>

                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                      <p className="text-xs text-yellow-800 dark:text-yellow-400">
                        <strong>Note:</strong> Query types available depend on your column type. geo_point columns support Distance and Within. geo_shape columns support all types including Intersects.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Dual Mode Interface */}
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                    <div className="h-1 w-1 rounded-full bg-indigo-600"></div>
                    Visual Builder vs SQL Editor
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                      <div className="mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-blue-600" />
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300">Visual Builder</h4>
                      </div>
                      <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-400">
                        <li>• No SQL knowledge required</li>
                        <li>• Auto-generates queries</li>
                        <li>• Perfect for beginners</li>
                        <li>• Read-only preview</li>
                      </ul>
                    </div>

                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
                      <div className="mb-2 flex items-center gap-2">
                        <Code className="h-4 w-4 text-purple-600" />
                        <h4 className="font-semibold text-purple-900 dark:text-purple-300">SQL Editor</h4>
                      </div>
                      <ul className="space-y-1 text-xs text-purple-800 dark:text-purple-400">
                        <li>• Full SQL editing power</li>
                        <li>• Write custom queries</li>
                        <li>• Format SQL with one click</li>
                        <li>• Save queries for reuse</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Key Features */}
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                    <div className="h-1 w-1 rounded-full bg-orange-600"></div>
                    Key Features
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <div className="rounded bg-blue-100 p-1.5 dark:bg-blue-900/30">
                        <History className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Query History</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Last 10 queries saved automatically. Click to re-run instantly.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <div className="rounded bg-green-100 p-1.5 dark:bg-green-900/30">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Saved Queries</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Save custom SQL queries with names. Load with one click anytime.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <div className="rounded bg-purple-100 p-1.5 dark:bg-purple-900/30">
                        <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Suggested Queries</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Smart suggestions based on your table. Click "Show" to see examples.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <div className="rounded bg-indigo-100 p-1.5 dark:bg-indigo-900/30">
                        <Code className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Format SQL</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          In SQL Editor mode, click "Format SQL" to auto-format your query.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Workflow */}
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                    <div className="h-1 w-1 rounded-full bg-teal-600"></div>
                    Typical Workflow
                  </h3>
                  <div className="rounded-lg border-2 border-teal-200 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-900/20">
                    <ol className="space-y-2 text-sm text-teal-900 dark:text-teal-300">
                      <li className="flex items-start gap-2">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">1</span>
                        <span className="pt-0.5">Select your schema and table with geo column</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">2</span>
                        <span className="pt-0.5">Choose query type (Distance or Within)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">3</span>
                        <span className="pt-0.5">Configure parameters (location, radius, polygon)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">4</span>
                        <span className="pt-0.5">Review auto-generated SQL or switch to SQL Editor</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">5</span>
                        <span className="pt-0.5">Click "Execute Query" to see results on map</span>
                      </li>
                    </ol>
                  </div>
                </section>

                {/* Pro Tips */}
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                    <div className="h-1 w-1 rounded-full bg-yellow-600"></div>
                    Pro Tips
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-300">
                      <span className="text-base">💡</span>
                      <p>Use Quick Actions (NYC 50km, LA 50km) for instant demo queries</p>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-300">
                      <span className="text-base">💡</span>
                      <p>Default radius is 50km - adjust based on your data density</p>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-300">
                      <span className="text-base">💡</span>
                      <p>Switch to SQL Editor to modify auto-generated queries or write custom SQL</p>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-300">
                      <span className="text-base">💡</span>
                      <p>Save frequently-used queries with descriptive names for quick access</p>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-300">
                      <span className="text-base">💡</span>
                      <p>Use preset locations and polygons to quickly test different areas</p>
                    </div>
                  </div>
                </section>

                {/* Dynamic Features */}
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                    <div className="h-1 w-1 rounded-full bg-pink-600"></div>
                    Smart Dynamic Features
                  </h3>
                  <div className="rounded-lg border border-pink-200 bg-pink-50 p-4 dark:border-pink-800 dark:bg-pink-900/20">
                    <ul className="space-y-2 text-sm text-pink-900 dark:text-pink-300">
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 flex-shrink-0 text-pink-600 dark:text-pink-400" />
                        <span>Automatically detects column types (id, name, location fields)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 flex-shrink-0 text-pink-600 dark:text-pink-400" />
                        <span>Auto-generates optimal SELECT columns based on your table</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 flex-shrink-0 text-pink-600 dark:text-pink-400" />
                        <span>Extracts latitude/longitude from geo_point columns automatically</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 flex-shrink-0 text-pink-600 dark:text-pink-400" />
                        <span>Works with any table structure - no hardcoded column names</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 flex-shrink-0 text-pink-600 dark:text-pink-400" />
                        <span>Query types adapt to your geo column type (point vs shape)</span>
                      </li>
                    </ul>
                  </div>
                </section>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
              <button
                onClick={() => setShowGuidance(false)}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Got it, let's build queries!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
