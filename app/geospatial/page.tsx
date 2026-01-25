'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SpatialQueryBuilder from '../components/geo/SpatialQueryBuilder';
import EnterpriseDataPanel from '../components/geo/EnterpriseDataPanel';
import TableColumnSelector, { TableColumnSelection } from '../components/geo/TableColumnSelector';
import { Map, Database, Settings, Code, AlertTriangle, CheckCircle, Copy, Check, AlertCircle, RefreshCw, Info, Play, X, MapPin, Eye, EyeOff, Search } from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from '../components/ToastContext';
import { geospatialConfig } from '../config/geospatial.config';

// Dynamically import MapboxViewerPro to avoid SSR issues
const DynamicMapViewer = dynamic(() => import('../components/geo/MapboxViewerPro'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading Mapbox Pro...</p>
      </div>
    </div>
  ),
});

interface GeoPoint {
  id: string;
  coordinates: [number, number];
  properties?: Record<string, any>;
}

interface GeoShape {
  id: string;
  type: 'Polygon' | 'LineString' | 'MultiPolygon';
  coordinates: any;
  properties?: Record<string, any>;
}

type ActiveTab = 'map' | 'query' | 'manage';

export default function GeospatialPage() {
  const activeConnection = useActiveConnection();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [geoPoints, setGeoPoints] = useState<GeoPoint[]>([]);
  const [geoShapes, setGeoShapes] = useState<GeoShape[]>([]);
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [drawnGeometry, setDrawnGeometry] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noGeoColumnError, setNoGeoColumnError] = useState<{tableName: string, show: boolean} | null>(null);
  const [hasExecutedQuery, setHasExecutedQuery] = useState(false);
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [savedQueries, setSavedQueries] = useState<Array<{id: string, name: string, sql: string, type: string}>>([]);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [showQueryInfo, setShowQueryInfo] = useState<string | null>(null);
  const [showUsageInfo, setShowUsageInfo] = useState(false);
  const [showDemoQueries, setShowDemoQueries] = useState(false);
  const [mapTableSelection, setMapTableSelection] = useState<TableColumnSelection | null>(null);
  const [showMapFilters, setShowMapFilters] = useState(false);
  const [mapFilters, setMapFilters] = useState<Array<{column: string, operator: string, value: string}>>([]);
  const [isRestoringFromStorage, setIsRestoringFromStorage] = useState(false);

  // Load saved table selection and filters on mount
  useEffect(() => {
    try {
      // Load saved table selection
      const savedTable = localStorage.getItem('geospatial_map_table');
      if (savedTable) {
        const tableSelection: TableColumnSelection = JSON.parse(savedTable);

        // Validate that the saved data has all required properties
        if (tableSelection.schema &&
            tableSelection.table &&
            tableSelection.columns &&
            Array.isArray(tableSelection.columns) &&
            tableSelection.columns.length > 0) {

          setMapTableSelection(tableSelection);
          setIsRestoringFromStorage(true);

          // Load saved filters
          const savedFilters = localStorage.getItem('geospatial_map_filters');
          if (savedFilters) {
            setMapFilters(JSON.parse(savedFilters));
          }
        } else {
          console.warn('Invalid saved table data, clearing localStorage');
          localStorage.removeItem('geospatial_map_table');
          localStorage.removeItem('geospatial_map_filters');
        }
      }
    } catch (error) {
      console.error('Failed to load saved map data:', error);
      // Clear invalid data
      localStorage.removeItem('geospatial_map_table');
      localStorage.removeItem('geospatial_map_filters');
    }
  }, []); // Run only once on mount

  // Persist map table selection to localStorage
  useEffect(() => {
    if (mapTableSelection && mapTableSelection.columns && mapTableSelection.columns.length > 0) {
      // Save complete selection including columns
      localStorage.setItem('geospatial_map_table', JSON.stringify(mapTableSelection));
    }
  }, [mapTableSelection]);

  // Persist filters to localStorage
  useEffect(() => {
    if (mapFilters.length > 0) {
      localStorage.setItem('geospatial_map_filters', JSON.stringify(mapFilters));
    } else {
      localStorage.removeItem('geospatial_map_filters');
    }
  }, [mapFilters]);

  // Load all data from selected table on Map View
  const handleMapTableSelection = async (selection: TableColumnSelection | null) => {
    setMapTableSelection(selection);

    if (!selection || !activeConnection) {
      return;
    }

    // Validate columns array exists
    if (!selection.columns || !Array.isArray(selection.columns) || selection.columns.length === 0) {
      console.error('Invalid selection: columns missing or empty', selection);
      toast.error('Invalid Selection', 'Table columns data is missing. Please select the table again.');
      return;
    }

    console.log('Map table selection:', selection);
    console.log('Available columns:', selection.columns);

    // Build query to load all data from selected table
    const geoCol = selection.columns.find(c => c.type.toLowerCase().includes('geo'));
    if (!geoCol) {
      const tableName = `${selection.schema}.${selection.table}`;
      setNoGeoColumnError({ tableName, show: true });
      toast.error('No Geo Column', 'Selected table does not have a geospatial column.');
      return;
    }

    // Clear any previous error
    setNoGeoColumnError(null);

    const geoColumnName = geoCol.name;
    const isGeoPoint = geoCol.type.toLowerCase().includes('geo_point');

    // Find name/label column
    const nameCol = selection.columns.find(c =>
      c.name.toLowerCase().includes('name') ||
      c.name.toLowerCase().includes('title') ||
      c.name.toLowerCase().includes('label')
    );
    const nameColumnName = nameCol ? nameCol.name : 'id';

    // Find id column
    const idCol = selection.columns.find(c =>
      c.name.toLowerCase() === 'id' ||
      c.name.toLowerCase() === '_id'
    );
    const idColumnName = idCol ? idCol.name : 'id';

    // Build SELECT columns
    let selectColumns = [];

    // Always include id first
    if (idCol) {
      selectColumns.push(idColumnName);
    } else {
      selectColumns.push('ROW_NUMBER() OVER() as id');
    }

    // Add name column
    if (nameCol) {
      selectColumns.push(`${nameColumnName} as name`);
    }

    // Add latitude/longitude for GEO_POINT
    if (isGeoPoint) {
      selectColumns.push(`latitude(${geoColumnName}) as latitude`);
      selectColumns.push(`longitude(${geoColumnName}) as longitude`);
    }

    // Add other columns (limit to first 10 to avoid overwhelming)
    const otherCols = selection.columns
      .filter(c =>
        c.name !== idColumnName &&
        c.name !== nameColumnName &&
        c.name !== geoColumnName &&
        !c.type.toLowerCase().includes('geo')
      )
      .slice(0, 10)
      .map(c => {
        // Round numeric columns
        if (c.type.toLowerCase().includes('double') || c.type.toLowerCase().includes('float')) {
          return `ROUND(${c.name}, 2) as ${c.name}`;
        }
        return c.name;
      });

    selectColumns = selectColumns.concat(otherCols);

    // Build WHERE clause from filters
    let whereClause = '';
    if (mapFilters.length > 0) {
      const conditions = mapFilters.map(filter => {
        const column = selection.columns.find(c => c.name === filter.column);
        const isNumeric = column?.type.toLowerCase().includes('int') ||
                          column?.type.toLowerCase().includes('double') ||
                          column?.type.toLowerCase().includes('float');

        switch (filter.operator) {
          case 'equals':
            return isNumeric ? `${filter.column} = ${filter.value}` : `${filter.column} = '${filter.value}'`;
          case 'contains':
            return `${filter.column} LIKE '%${filter.value}%'`;
          case 'starts_with':
            return `${filter.column} LIKE '${filter.value}%'`;
          case 'greater_than':
            return `${filter.column} > ${filter.value}`;
          case 'less_than':
            return `${filter.column} < ${filter.value}`;
          default:
            return isNumeric ? `${filter.column} = ${filter.value}` : `${filter.column} = '${filter.value}'`;
        }
      });
      whereClause = `\nWHERE ${conditions.join(' AND ')}`;
    }

    const query = `SELECT
  ${selectColumns.join(',\n  ')}
FROM ${selection.schema}.${selection.table}${whereClause}
LIMIT 1000;`;

    console.log('Generated query:', query);
    console.log('Select columns:', selectColumns);

    await handleQueryExecute(query);
    toast.success('Table Loaded', `Loaded data from ${selection.schema}.${selection.table}`);
  };

  // Auto-reload data when restoring from localStorage
  useEffect(() => {
    if (isRestoringFromStorage && mapTableSelection && activeConnection) {
      handleMapTableSelection(mapTableSelection);
      setIsRestoringFromStorage(false); // Reset flag after reload
    }
  }, [isRestoringFromStorage, mapTableSelection, activeConnection]);

  const handleQueryExecute = async (query: string) => {
    if (!activeConnection) {
      toast.error('No Database Connection', 'Please connect to a MonkDB database first.');
      return;
    }

    setLoading(true);
    setError(null);
    setHasExecutedQuery(true);

    // Add to query history (keep last 10)
    setQueryHistory(prev => {
      const updated = [query, ...prev.filter(q => q !== query)];
      return updated.slice(0, 10);
    });

    try {
      console.log('Executing geospatial query:', query);
      const result = await activeConnection.client.query(query);

      // Transform database results - CrateDB returns rows as arrays
      // Dynamically map columns based on result.cols metadata
      const results = result.rows.map((row, index) => {
        const obj: any = {};

        // Map each column by its name from metadata
        result.cols.forEach((col: string, colIndex: number) => {
          obj[col] = row[colIndex];
        });

        // Ensure we have required fields for mapping
        // If no id column, generate one
        if (!obj.id && obj.id !== 0) {
          obj.id = index;
        }

        // If no name column, generate a default
        if (!obj.name) {
          obj.name = `Result ${index + 1}`;
        }

        return obj;
      });

      setQueryResults(results);

      // Transform to map points
      const newPoints: GeoPoint[] = results
        .filter((r: any) => r.latitude !== null && r.latitude !== undefined &&
                            r.longitude !== null && r.longitude !== undefined)
        .map((r: any) => ({
          id: String(r.id),
          coordinates: [r.longitude, r.latitude],
          properties: r,
        }));

      console.log('Transformed points:', newPoints.length, newPoints);

      if (newPoints.length > 0) {
        setGeoPoints(newPoints);
        toast.success('Query Executed', `Found ${results.length} results, ${newPoints.length} mapped points`);
        // Keep user on query tab to see results on right side map
      } else {
        toast.success('Query Executed', `${results.length} results returned`);
      }
    } catch (error) {
      console.error('Failed to execute geospatial query:', error);
      const errorMessage = (error as Error).message;
      setError(errorMessage);
      setQueryResults([]);
      toast.error('Query Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDataImport = (data: any[]) => {
    console.log('Importing data:', data);
    const newPoints: GeoPoint[] = data
      .filter((item) => item.type === 'Point')
      .map((item) => ({
        id: item.id,
        coordinates: item.coordinates,
        properties: item.properties,
      }));

    const newShapes: GeoShape[] = data
      .filter((item) => item.type !== 'Point')
      .map((item) => ({
        id: item.id,
        type: item.type,
        coordinates: item.coordinates,
        properties: item.properties,
      }));

    setGeoPoints([...geoPoints, ...newPoints]);
    setGeoShapes([...geoShapes, ...newShapes]);
    setActiveTab('map');
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedCoords([lat, lng]);
  };

  const handleDrawComplete = (geometry: any) => {
    setDrawnGeometry(geometry);
    console.log('Drawn geometry:', geometry);
  };

  const handleCopyTemplate = (template: string, templateName: string) => {
    navigator.clipboard.writeText(template);
    setCopiedTemplate(templateName);
    toast.success('Template Copied', 'SQL template copied to clipboard');
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  // Demo queries - Educational SQL templates with column guidance
  const demoQueries = [
    {
      id: 'radius',
      title: 'Proximity Search Template',
      description: 'Find all records within a radius of a specific point',
      queryType: 'Proximity Search (Distance)',
      useCase: 'Finding nearby locations (stores, offices, customers, etc.)',
      whatItDoes: [
        'Calculates distance from a reference point',
        'Filters records within specified radius (meters)',
        'Returns record details with calculated distance',
        'Orders results by distance (nearest first)',
      ],
      expectedResults: 'All records within the specified radius',
      location: 'Use Query Builder for visual interface',
      coordinates: 'POINT(longitude latitude)',
      query: `-- 📍 Proximity Search Template
-- Find locations within a radius of a point

SELECT
  id,                              -- Required: Unique identifier
  name_column as name,             -- Required: Display label (store_name, customer_name, etc.)
  latitude(geo_column) as latitude,   -- Required: Latitude for map display
  longitude(geo_column) as longitude, -- Required: Longitude for map display
  other_column1,                   -- Optional: Any additional data (city, address, etc.)
  other_column2,                   -- Optional: More data (category, type, etc.)
  ROUND(distance(geo_column, 'POINT(-73.9851 40.7589)') / 1000, 2) as distance_km
FROM schema.table
WHERE distance(geo_column, 'POINT(-73.9851 40.7589)') < 50000
ORDER BY distance(geo_column, 'POINT(-73.9851 40.7589)');

-- 📝 Column Requirements:
-- ✅ id: Unique identifier (INTEGER or TEXT)
-- ✅ name/label: Display name for markers (TEXT)
-- ✅ geo_column: GEO_POINT column with coordinates
-- ✅ Additional columns: Any data you want in map popups

-- 🔧 How to Customize:
-- 1. Replace 'schema.table' with your table name (e.g., monkdb.stores)
-- 2. Replace 'geo_column' with your GEO_POINT column name (e.g., location)
-- 3. Replace 'name_column' with your name/label column (e.g., store_name)
-- 4. Replace POINT coordinates with your center point
-- 5. Adjust radius: 50000 meters = 50km

-- 💡 Example:
-- SELECT id, store_name as name, latitude(location), longitude(location),
--        city, state FROM monkdb.stores
-- WHERE distance(location, 'POINT(-118.2437 34.0522)') < 10000;`,
      icon: '📍',
    },
    {
      id: 'nearest',
      title: 'Nearest Neighbor Template',
      description: 'Find the N closest records to a specific location',
      queryType: 'Nearest Neighbor Search',
      useCase: 'Finding closest locations for delivery, service routing, or recommendations',
      whatItDoes: [
        'Calculates distance from reference point to all records',
        'Sorts all records by proximity (nearest first)',
        'Returns only the top N nearest records',
        'Useful for "find 5 nearest stores" type queries',
      ],
      expectedResults: 'Top N records closest to your location',
      location: 'Use Query Builder for visual interface',
      coordinates: 'POINT(longitude latitude)',
      query: `-- 🎯 Nearest Neighbor Template
-- Find the N closest locations to a point

SELECT
  id,                              -- Required: Unique identifier
  name_column as name,             -- Required: Display label
  latitude(geo_column) as latitude,   -- Required: For map
  longitude(geo_column) as longitude, -- Required: For map
  other_column1,                   -- Optional: Additional info (category, rating, etc.)
  ROUND(distance(geo_column, 'POINT(-118.2437 34.0522)') / 1000, 2) as distance_km
FROM schema.table
ORDER BY distance(geo_column, 'POINT(-118.2437 34.0522)')
LIMIT 10;                          -- Number of results (change to 5, 20, etc.)

-- 📝 Column Requirements:
-- ✅ id: Unique identifier
-- ✅ name/label: What to display on map markers
-- ✅ geo_column: GEO_POINT column (location, coordinates, position, etc.)

-- 🔧 How to Customize:
-- 1. Change LIMIT number (5, 10, 20 for top N results)
-- 2. Replace POINT with your location coordinates
-- 3. Add more columns for richer marker popups
-- 4. Order by distance is automatic (nearest first)

-- 💡 Example Use Cases:
-- • Find 5 nearest coffee shops: LIMIT 5
-- • Find 10 closest warehouses: LIMIT 10
-- • Route planning: LIMIT 3 for top choices`,
      icon: '🎯',
    },
    {
      id: 'within',
      title: 'Within Polygon Template',
      description: 'Find all records inside a polygon area',
      queryType: 'Polygon Search (Within)',
      useCase: 'Regional analysis, delivery zones, city boundaries, custom areas',
      whatItDoes: [
        'Checks if points are within a polygon boundary',
        'Filters records by geographic area',
        'Returns all matching records in the region',
        'Perfect for city limits, districts, or custom zones',
      ],
      expectedResults: 'All records within the defined polygon area',
      location: 'Use Query Builder to draw polygon visually',
      coordinates: 'POLYGON((lon lat, lon lat, ...))',
      query: `-- 🗺️ Within Polygon Template
-- Find all locations inside a specific area

SELECT
  id,                              -- Required: Unique identifier
  name_column as name,             -- Required: Display label
  latitude(geo_column) as latitude,   -- Required: For map
  longitude(geo_column) as longitude, -- Required: For map
  other_column1,                   -- Optional: Zone, district, etc.
  other_column2                    -- Optional: Status, type, etc.
FROM schema.table
WHERE within(geo_column, 'POLYGON((
  -118.5 34.0,    -- Southwest corner (lon lat)
  -118.0 34.0,    -- Southeast corner
  -118.0 34.5,    -- Northeast corner
  -118.5 34.5,    -- Northwest corner
  -118.5 34.0     -- Close polygon (same as first point)
))');

-- 📝 Column Requirements:
-- ✅ id: Unique identifier
-- ✅ name/label: Display name for markers
-- ✅ geo_column: GEO_POINT column with coordinates

-- 🔧 How to Customize:
-- 1. Draw polygon visually in Query Builder (easier!)
-- 2. OR manually define POLYGON coordinates (lon lat format)
-- 3. First and last point must be identical (close the polygon)
-- 4. Coordinates are in longitude, latitude order

-- 💡 Example Use Cases:
-- • All stores in downtown area
-- • Customers in specific ZIP code boundary
-- • Deliveries within city limits
-- • Locations in a sales territory

-- ⚠️ Important:
-- Polygon must be closed (first point = last point)
-- Use longitude THEN latitude (POINT(lon lat))`,
      icon: '🗺️',
    },
  ];

  const tabs = [
    { id: 'map', label: 'Map View', icon: Map },
    { id: 'query', label: 'Query Builder', icon: Database },
    { id: 'manage', label: 'Data Management', icon: Settings },
  ];

  // Show no connection state
  if (!activeConnection) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Map className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
            No Active Connection
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please connect to a MonkDB database to use geospatial data tools.
          </p>
          <a
            href="/connections"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Manage Connections
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Map className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Geospatial Data Tools
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Visualize, query, and manage geospatial data with MonkDB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Demo Queries Button */}
            <button
              onClick={() => setShowDemoQueries(true)}
              className="flex items-center gap-2 rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 transition-colors hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-900/20 dark:hover:bg-purple-900/30"
              title="View demo queries"
            >
              <Code className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                Demo Queries
              </span>
            </button>
            {/* Usage Info Button */}
            <button
              onClick={() => setShowUsageInfo(true)}
              className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 transition-colors hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
              title="How to use Geospatial Tools"
            >
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Usage Guide
              </span>
            </button>
            {/* Connection Status */}
            <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 dark:border-green-900/50 dark:bg-green-900/20">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                Connected
              </span>
            </div>
            {/* Data Count */}
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {geoPoints.length} Points
                  </span>
                </div>
                <div className="mx-2 h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {geoShapes.length} Shapes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-4 p-4">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex gap-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ActiveTab)}
                    className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-red-900 dark:text-red-300">
                    Query Execution Failed
                  </h3>
                  <pre className="mt-2 overflow-x-auto rounded bg-red-100 p-3 font-mono text-xs text-red-800 dark:bg-red-900/30 dark:text-red-200">
                    {error}
                  </pre>
                  <button
                    onClick={() => setError(null)}
                    className="mt-3 text-xs font-medium text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex gap-4 overflow-hidden" style={{ height: 'calc(100vh - 24rem)' }}>
        {/* Main Panel */}
        <div className="relative flex-1 overflow-hidden">
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
              <div className="text-center">
                <RefreshCw className="mx-auto h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Executing query...
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Please wait while we fetch geospatial data
                </p>
              </div>
            </div>
          )}

          {/* Map View - Table Selection & Empty State */}
          {activeTab === 'map' && geoPoints.length === 0 && geoShapes.length === 0 && !loading && (
            <div className="flex h-full flex-col gap-4 overflow-auto p-6">
              {/* Compact Hero Section */}
              <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-6 dark:border-blue-900 dark:from-blue-950 dark:via-gray-800 dark:to-blue-950">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                    <Map className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="mb-1.5 text-xl font-bold text-gray-900 dark:text-white">
                      Geospatial Data Visualization
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Visualize location data on interactive maps with filtering, clustering, and heatmap analysis
                    </p>
                  </div>
                  <div className="hidden items-center gap-2 lg:flex">
                    <span className="rounded-md bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      🗺️ Maps
                    </span>
                    <span className="rounded-md bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      🔍 Filters
                    </span>
                    <span className="rounded-md bg-orange-100 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                      🔥 Heatmap
                    </span>
                  </div>
                </div>
              </div>

              {/* Table Selector Card */}
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 dark:bg-blue-500">
                    <Database className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Select Data Source
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Choose a table with GEO_POINT or GEO_SHAPE columns
                    </p>
                  </div>
                </div>

                {/* Table Column Selector */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                  <TableColumnSelector
                    onSelectionChange={handleMapTableSelection}
                    showGeoColumnsOnly={true}
                    compact={true}
                  />
                </div>

                {/* No Geo Column Error - Dismissible */}
                {noGeoColumnError?.show && (
                  <div className="mt-4 rounded-lg border-2 border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-red-900 dark:text-red-200">
                          No Geospatial Columns Found
                        </h4>
                        <p className="mt-1 text-sm text-red-800 dark:text-red-300">
                          The table <strong>{noGeoColumnError.tableName}</strong> does not have any geospatial columns (GEO_POINT or GEO_SHAPE).
                        </p>
                        <p className="mt-2 text-xs text-red-700 dark:text-red-400">
                          Please select a different table or add geospatial columns to this table in Data Management.
                        </p>
                      </div>
                      <button
                        onClick={() => setNoGeoColumnError(null)}
                        className="flex-shrink-0 rounded-lg p-1 text-red-600 transition-colors hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/40"
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {mapTableSelection && (
                  <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                    <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
                      <CheckCircle className="h-4 w-4" />
                      <span>
                        Loading all data from <strong>{mapTableSelection.schema}.{mapTableSelection.table}</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Alternative Options - Compact */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <button
                  onClick={() => setActiveTab('query')}
                  className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-purple-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-purple-700"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                    <Code className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">Custom Query Builder</span>
                      <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Advanced</span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Write SQL for proximity searches & spatial analysis
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-purple-600 transition-transform group-hover:translate-x-1 dark:text-purple-400">→</span>
                </button>

                <button
                  onClick={() => setActiveTab('manage')}
                  className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-orange-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-orange-700"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                    <Settings className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">Import Data</span>
                      <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">CSV/GeoJSON</span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Import from CSV, GeoJSON, Shapefiles & more
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-orange-600 transition-transform group-hover:translate-x-1 dark:text-orange-400">→</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'map' && (geoPoints.length > 0 || geoShapes.length > 0) && (
            <div className="flex h-full flex-col gap-2">
              {/* No Geo Column Error - Dismissible (Active Map) */}
              {noGeoColumnError?.show && (
                <div className="rounded-lg border-2 border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                    <div className="flex-1">
                      <p className="text-sm text-red-800 dark:text-red-300">
                        <strong>{noGeoColumnError.tableName}</strong> does not have geospatial columns. Please select a table with GEO_POINT or GEO_SHAPE columns.
                      </p>
                    </div>
                    <button
                      onClick={() => setNoGeoColumnError(null)}
                      className="flex-shrink-0 rounded-lg p-1 text-red-600 transition-colors hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/40"
                      title="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Compact Control Bar */}
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-2 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
                {/* Current Table Badge */}
                {mapTableSelection ? (
                  <div className="flex items-center gap-2 rounded-md bg-blue-100 px-3 py-1.5 dark:bg-blue-900/30">
                    <Database className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-blue-900 dark:text-blue-300">
                      {mapTableSelection.schema}.{mapTableSelection.table}
                    </span>
                    <span className="text-xs text-blue-700 dark:text-blue-400">
                      ({geoPoints.length + geoShapes.length})
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 dark:bg-gray-700">
                    <MapPin className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Query Results ({geoPoints.length + geoShapes.length})
                    </span>
                  </div>
                )}

                {/* Spacer */}
                <div className="flex-1"></div>

                {/* Table Selector - Inline */}
                <div className="flex items-center gap-2">
                  <TableColumnSelector
                    onSelectionChange={handleMapTableSelection}
                    showGeoColumnsOnly={true}
                    compact={true}
                  />
                  {mapTableSelection && (
                    <button
                      onClick={() => setShowMapFilters(!showMapFilters)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        showMapFilters || mapFilters.length > 0
                          ? 'border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                      title="Filter data"
                    >
                      🔍 Filters {mapFilters.length > 0 && `(${mapFilters.length})`}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMapTableSelection(null);
                      setGeoPoints([]);
                      setGeoShapes([]);
                      setQueryResults([]);
                      setMapFilters([]);
                    }}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                    title="Clear map"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Filter Panel */}
              {showMapFilters && mapTableSelection && (
                <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm dark:border-blue-900 dark:from-blue-950 dark:to-gray-800">
                  {/* Header */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 dark:bg-blue-500">
                        <Search className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                          Filter Data
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Search and filter your map results
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowMapFilters(false)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                      title="Close filters"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Active Filters */}
                  {mapFilters.length > 0 ? (
                    <div className="mb-4 space-y-3">
                      {mapFilters.map((filter, index) => (
                        <div key={index} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                              Filter #{index + 1}
                            </span>
                            <button
                              onClick={() => {
                                setMapFilters(mapFilters.filter((_, i) => i !== index));
                              }}
                              className="rounded-md p-1 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              title="Remove filter"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-12 gap-2">
                            {/* Column Select */}
                            <div className="col-span-4">
                              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                                Column
                              </label>
                              <select
                                value={filter.column}
                                onChange={(e) => {
                                  const newFilters = [...mapFilters];
                                  newFilters[index].column = e.target.value;
                                  setMapFilters(newFilters);
                                }}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              >
                                {mapTableSelection.columns
                                  .filter(c => !c.type.toLowerCase().includes('geo'))
                                  .map(col => (
                                    <option key={col.name} value={col.name}>{col.name}</option>
                                  ))}
                              </select>
                            </div>

                            {/* Operator Select */}
                            <div className="col-span-4">
                              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                                Condition
                              </label>
                              <select
                                value={filter.operator}
                                onChange={(e) => {
                                  const newFilters = [...mapFilters];
                                  newFilters[index].operator = e.target.value;
                                  setMapFilters(newFilters);
                                }}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              >
                                <option value="equals">= Equals</option>
                                <option value="contains">⊃ Contains</option>
                                <option value="starts_with">⊲ Starts with</option>
                                <option value="greater_than">&gt; Greater than</option>
                                <option value="less_than">&lt; Less than</option>
                              </select>
                            </div>

                            {/* Value Input */}
                            <div className="col-span-4">
                              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                                Value
                              </label>
                              <input
                                type="text"
                                value={filter.value}
                                onChange={(e) => {
                                  const newFilters = [...mapFilters];
                                  newFilters[index].value = e.target.value;
                                  setMapFilters(newFilters);
                                }}
                                placeholder="Enter value..."
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-800/50">
                      <Search className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        No filters added yet
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Click "Add Filter" to start filtering your data
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {/* Add Filter Button */}
                    <button
                      onClick={() => {
                        const firstNonGeoColumn = mapTableSelection.columns.find(c => !c.type.toLowerCase().includes('geo'));
                        if (firstNonGeoColumn) {
                          setMapFilters([...mapFilters, { column: firstNonGeoColumn.name, operator: 'equals', value: '' }]);
                        }
                      }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                    >
                      <span className="text-lg">+</span>
                      Add Filter
                    </button>

                    {/* Apply & Clear Buttons */}
                    {mapFilters.length > 0 && (
                      <>
                        <button
                          onClick={() => {
                            setMapFilters([]);
                            handleMapTableSelection(mapTableSelection);
                          }}
                          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                          Clear All
                        </button>
                        <button
                          onClick={() => handleMapTableSelection(mapTableSelection)}
                          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl"
                        >
                          <Play className="h-4 w-4" />
                          Apply Filters
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Map Viewer */}
              <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <DynamicMapViewer
                  geoPoints={geoPoints}
                  geoShapes={geoShapes}
                  onMapClick={handleMapClick}
                  onDrawComplete={handleDrawComplete}
                  center={[
                    geospatialConfig.map.defaultCenter.lng,
                    geospatialConfig.map.defaultCenter.lat
                  ]}
                  zoom={geospatialConfig.map.defaultZoom}
                  height="100%"
                />
              </div>
            </div>
          )}

          {activeTab === 'query' && (
            <div className="flex h-full gap-4">
              {/* Query Builder - Left Side - Dynamic Width */}
              <div className={`flex-shrink-0 transition-all duration-300 ${mapCollapsed ? 'flex-1' : 'w-[500px]'}`}>
                <SpatialQueryBuilder
                  onQueryExecute={handleQueryExecute}
                  queryHistory={queryHistory}
                  onLoadQuery={handleQueryExecute}
                />
              </div>

              {/* Map Results - Right Side - Collapsible */}
              {!mapCollapsed && (
              <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 relative">
                {geoPoints.length === 0 && !loading ? (
                  <div className="flex h-full items-center justify-center p-8">
                    <div className="max-w-lg text-center">
                      <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${hasExecutedQuery ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-gray-900'}`}>
                        <MapPin className={`h-8 w-8 ${hasExecutedQuery ? 'text-orange-500 dark:text-orange-400' : 'text-gray-400 dark:text-gray-600'}`} />
                      </div>
                      <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
                        {hasExecutedQuery ? '0 Results Found' : 'No Results Yet'}
                      </h3>
                      {hasExecutedQuery ? (
                        <div className="mt-3 space-y-3">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Your query executed successfully but returned no results.
                          </p>
                          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-900/20">
                            <p className="text-xs font-semibold text-orange-900 dark:text-orange-300 mb-2">
                              💡 Try these solutions:
                            </p>
                            <ul className="space-y-1.5 text-left text-xs text-orange-800 dark:text-orange-200">
                              <li className="flex items-start gap-2">
                                <span className="mt-0.5">•</span>
                                <span><strong>Increase the radius</strong> - Try 50km or 100km instead of 1km</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="mt-0.5">•</span>
                                <span><strong>Change location</strong> - Click a different preset city</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="mt-0.5">•</span>
                                <span><strong>Use larger polygon</strong> - For Within/Intersects queries</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="mt-0.5">•</span>
                                <span><strong>Check your data</strong> - Verify stores exist in your database</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          Build your query on the left and click "Execute Query" to see results on this map.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <DynamicMapViewer
                    geoPoints={geoPoints}
                    geoShapes={geoShapes}
                    onMapClick={handleMapClick}
                    onDrawComplete={handleDrawComplete}
                    center={[
                      geospatialConfig.map.defaultCenter.lng,
                      geospatialConfig.map.defaultCenter.lat
                    ]}
                    zoom={geospatialConfig.map.defaultZoom}
                    height="100%"
                  />
                )}

                {/* Collapse Map Button - Inside map panel */}
                <button
                  onClick={() => setMapCollapsed(true)}
                  className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-lg transition-all hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  title="Hide map preview"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Hide Map
                </button>
              </div>
              )}

              {/* Expand Map Button - Shows when map is collapsed */}
              {mapCollapsed && (
                <button
                  onClick={() => setMapCollapsed(false)}
                  className="flex flex-shrink-0 items-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-8 text-sm font-medium text-blue-700 transition-all hover:border-blue-400 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:border-blue-600 dark:hover:bg-blue-900/30"
                  title="Show map preview"
                >
                  <Eye className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Show Map</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">View Results</div>
                  </div>
                </button>
              )}
            </div>
          )}

          {activeTab === 'manage' && (
            <EnterpriseDataPanel onDataChange={() => {
              // Refresh data after changes - user can re-execute queries manually
              toast.success('Data Updated', 'Please re-execute your query to see updated results');
            }} />
          )}
        </div>
          </div>
        </div>
      </div>

      {/* Query Info Modal */}
      {showQueryInfo && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-800">
            {(() => {
              const query = demoQueries.find(q => q.id === showQueryInfo);
              if (!query) return null;

              return (
                <>
                  {/* Header */}
                  <div className="sticky top-0 border-b border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{query.icon}</span>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {query.title}
                          </h2>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {query.description}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowQueryInfo(null)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-6">
                    {/* Query Type */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Query Type
                        </h3>
                      </div>
                      <div className="rounded-lg bg-purple-50 px-3 py-2 dark:bg-purple-900/20">
                        <p className="text-sm font-medium text-purple-900 dark:text-purple-300">
                          {query.queryType}
                        </p>
                      </div>
                    </div>

                    {/* Use Case */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Use Case
                        </h3>
                      </div>
                      <div className="rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-900/20">
                        <p className="text-sm text-blue-900 dark:text-blue-300">
                          {query.useCase}
                        </p>
                      </div>
                    </div>

                    {/* Location Info */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Location
                        </h3>
                      </div>
                      <div className="space-y-2">
                        <div className="rounded-lg bg-green-50 px-3 py-2 dark:bg-green-900/20">
                          <p className="text-sm font-medium text-green-900 dark:text-green-300">
                            📍 {query.location}
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                          {query.coordinates}
                        </div>
                      </div>
                    </div>

                    {/* What It Does */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          What This Query Does
                        </h3>
                      </div>
                      <ul className="space-y-2">
                        {query.whatItDoes.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              {index + 1}
                            </span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Expected Results */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Expected Results
                        </h3>
                      </div>
                      <div className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/20">
                        <p className="text-sm text-amber-900 dark:text-amber-300">
                          {query.expectedResults}
                        </p>
                      </div>
                    </div>

                    {/* SQL Query */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Code className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          SQL Query
                        </h3>
                      </div>
                      <div className="rounded-lg bg-gray-900 p-4">
                        <pre className="overflow-x-auto text-xs text-gray-100">
                          <code>{query.query}</code>
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={() => setShowQueryInfo(null)}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        Close
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            handleCopyTemplate(query.query, query.id);
                          }}
                          className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                        >
                          <Copy className="h-4 w-4" />
                          Copy Query
                        </button>
                        <button
                          onClick={() => {
                            handleQueryExecute(query.query);
                            setShowQueryInfo(null);
                            setActiveTab('map');
                          }}
                          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                        >
                          <Play className="h-4 w-4" />
                          Execute Query
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Usage Info Modal */}
      {showUsageInfo && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-800">
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      How to Use Geospatial Data Tools
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Complete guide to visualizing and querying geospatial data
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUsageInfo(false)}
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Creating Geospatial Tables */}
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-green-900 dark:text-green-300">
                    <Settings className="h-4 w-4" />
                    📝 How to Create Geospatial Tables
                  </h3>
                  <div className="space-y-3 text-sm text-green-800 dark:text-green-200">
                    <p className="font-semibold">Required Columns for Map Visualization:</p>
                    <div className="space-y-2 rounded-lg bg-white/50 p-3 dark:bg-green-900/30">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs">✅</span>
                        <div>
                          <strong>id</strong> (INTEGER or TEXT) - Unique identifier for each record
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs">✅</span>
                        <div>
                          <strong>name/label column</strong> (TEXT) - Display name (e.g., store_name, customer_name, location_name)
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs">✅</span>
                        <div>
                          <strong>geo_column</strong> (GEO_POINT or GEO_SHAPE) - Location coordinates
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs">💡</span>
                        <div>
                          <strong>Additional columns</strong> (any type) - Extra data shown in map popups (city, address, category, revenue, etc.)
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 rounded-lg bg-white/50 p-3 dark:bg-green-900/30">
                      <strong>💡 Tip:</strong> Go to <strong>Data Management → Create Table</strong> tab to create your geospatial table with a visual wizard!
                    </p>
                  </div>
                </div>

                {/* Table Selection */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-300">
                    <Database className="h-4 w-4" />
                    Dynamic Table Selection
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Choose any table with geospatial columns (GEO_POINT or GEO_SHAPE) from your database. The system automatically detects all columns and adapts to your table's schema!
                  </p>
                </div>

                {/* Main Features */}
                <div>
                  <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
                    Main Features
                  </h3>
                  <div className="space-y-3">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <Map className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">Map View</h4>
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            Visualize all geospatial data on an interactive map. Click markers to see record details and properties from your selected table.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                          <Database className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">Query Builder</h4>
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            Execute custom geospatial queries with proximity search, filtering, and spatial analysis. Select dynamic tables and columns for optimized queries.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                          <Code className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">Demo Queries</h4>
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            Ready-to-use query examples. Click the <span className="rounded bg-blue-100 px-1 font-semibold dark:bg-blue-900">Info</span> button to learn about each query before running it!
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                          <Settings className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">Data Management</h4>
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            Add data, import/export in multiple formats (CSV, JSON, GeoJSON), and create new geospatial tables with visual wizard.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Geospatial Functions */}
                <div>
                  <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
                    Available Geospatial Functions
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-900/50">
                      <code className="text-xs font-mono text-blue-600 dark:text-blue-400">distance()</code>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Calculate distance between two points</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-900/50">
                      <code className="text-xs font-mono text-blue-600 dark:text-blue-400">within()</code>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Check if point is within polygon</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-900/50">
                      <code className="text-xs font-mono text-blue-600 dark:text-blue-400">latitude()</code>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Extract latitude from geo point</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-900/50">
                      <code className="text-xs font-mono text-blue-600 dark:text-blue-400">longitude()</code>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Extract longitude from geo point</p>
                    </div>
                  </div>
                </div>

                {/* Supported Types */}
                <div>
                  <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
                    Supported Data Types
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-900/50">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-100 dark:bg-blue-900/30">
                        <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-mono text-xs font-semibold text-gray-900 dark:text-white">GEO_POINT</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Point coordinates (latitude, longitude)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-900/50">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-green-100 dark:bg-green-900/30">
                        <Map className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-mono text-xs font-semibold text-gray-900 dark:text-white">GEO_SHAPE</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Polygons, lines, and complex shapes</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Import/Export Formats */}
                <div>
                  <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
                    Import/Export Formats
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      WKT
                    </span>
                    <span className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      GeoJSON
                    </span>
                    <span className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      CSV
                    </span>
                    <span className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      JSON
                    </span>
                    <span className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      KML
                    </span>
                    <span className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      Shapefile
                    </span>
                  </div>
                </div>

                {/* Column Naming Best Practices */}
                <div>
                  <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
                    📋 Column Naming Best Practices
                  </h3>
                  <div className="space-y-3">
                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-900/20">
                      <h4 className="mb-2 text-sm font-semibold text-purple-900 dark:text-purple-300">
                        Recommended Column Names
                      </h4>
                      <div className="space-y-2 text-xs text-purple-800 dark:text-purple-200">
                        <div className="flex gap-2">
                          <strong className="min-w-[100px]">ID Column:</strong>
                          <span className="font-mono">id, _id, store_id, customer_id, location_id</span>
                        </div>
                        <div className="flex gap-2">
                          <strong className="min-w-[100px]">Name Column:</strong>
                          <span className="font-mono">name, store_name, customer_name, location_name, title</span>
                        </div>
                        <div className="flex gap-2">
                          <strong className="min-w-[100px]">Geo Column:</strong>
                          <span className="font-mono">location, coordinates, position, geo_point, geo_location</span>
                        </div>
                        <div className="flex gap-2">
                          <strong className="min-w-[100px]">Address:</strong>
                          <span className="font-mono">address, street_address, full_address</span>
                        </div>
                        <div className="flex gap-2">
                          <strong className="min-w-[100px]">City/State:</strong>
                          <span className="font-mono">city, state, region, district, zone</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                      <h4 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-300">
                        Example Table Structures
                      </h4>
                      <div className="space-y-3 text-xs">
                        <div>
                          <div className="mb-1 font-semibold text-blue-800 dark:text-blue-200">Retail Stores:</div>
                          <code className="block rounded bg-white p-2 dark:bg-blue-900/30">
                            id, store_name, location (GEO_POINT), address, city, state, category, revenue, employees
                          </code>
                        </div>
                        <div>
                          <div className="mb-1 font-semibold text-blue-800 dark:text-blue-200">Customer Locations:</div>
                          <code className="block rounded bg-white p-2 dark:bg-blue-900/30">
                            customer_id, customer_name, coordinates (GEO_POINT), address, city, state, zip_code, phone
                          </code>
                        </div>
                        <div>
                          <div className="mb-1 font-semibold text-blue-800 dark:text-blue-200">Delivery Zones:</div>
                          <code className="block rounded bg-white p-2 dark:bg-blue-900/30">
                            zone_id, zone_name, boundary (GEO_SHAPE), coverage_area, delivery_fee, active_status
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pro Tip */}
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-green-900 dark:text-green-300">
                    <CheckCircle className="h-4 w-4" />
                    💡 Quick Start Guide
                  </h3>
                  <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
                    <p>
                      <strong>1.</strong> Go to <strong>Data Management → Create Table</strong> to set up your geospatial table
                    </p>
                    <p>
                      <strong>2.</strong> Add required columns: id, name, and a GEO_POINT column
                    </p>
                    <p>
                      <strong>3.</strong> Use <strong>Map View</strong> to select your table and visualize all data
                    </p>
                    <p>
                      <strong>4.</strong> Try <strong>Demo Queries</strong> to learn geospatial SQL patterns
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
              <button
                onClick={() => setShowUsageInfo(false)}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Queries Modal */}
      {showDemoQueries && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-800">
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Code className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Demo Queries - Ready to Use
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {demoQueries.length} example queries to get you started
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDemoQueries(false)}
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {demoQueries.map((query) => (
                  <div key={query.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{query.icon}</span>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {query.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setShowQueryInfo(query.id);
                            setShowDemoQueries(false);
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                          title="View query details"
                        >
                          <Info className="h-3.5 w-3.5" />
                          Info
                        </button>
                        <button
                          onClick={() => handleCopyTemplate(query.query, query.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                          title="Copy query to clipboard"
                        >
                          {copiedTemplate === query.id ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              Copy
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            handleQueryExecute(query.query);
                            setShowDemoQueries(false);
                            setActiveTab('map');
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                          title="Execute query"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Run
                        </button>
                      </div>
                    </div>
                    <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
                      {query.description}
                    </p>
                    <div className="rounded-lg bg-gray-900 p-3">
                      <pre className="overflow-x-auto text-xs text-gray-100">
                        <code>{query.query}</code>
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
              <button
                onClick={() => setShowDemoQueries(false)}
                className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
