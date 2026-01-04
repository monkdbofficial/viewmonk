'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import MapViewer from '../components/geo/MapViewer';
import SpatialQueryBuilder from '../components/geo/SpatialQueryBuilder';
import GeoDataImporter from '../components/geo/GeoDataImporter';
import { Map, Database, Upload, Code, AlertTriangle, CheckCircle, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from '../components/ToastContext';

// Dynamically import MapViewer to avoid SSR issues with Leaflet
const DynamicMapViewer = dynamic(() => import('../components/geo/MapViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading map...</p>
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

type ActiveTab = 'map' | 'query' | 'import';

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
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  // NOTE: Sample data removed for production
  // This feature now requires REAL geospatial data from your database
  // Use the Import/Export tab to load data or execute queries in Query Builder

  const handleQueryExecute = async (query: string) => {
    if (!activeConnection) {
      toast.error('No Database Connection', 'Please connect to a MonkDB database first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Executing geospatial query:', query);
      const result = await activeConnection.client.query(query);

      // Transform database results to query results format
      const results = result.rows.map((row, index) => ({
        id: row[0] || index,
        name: row[1] || `Result ${index + 1}`,
        distance: typeof row[2] === 'number' ? row[2] : undefined,
        ...row,
      }));

      setQueryResults(results);

      // If results contain geospatial data, update map
      // This is a simplified example - you may need to adjust based on your data structure
      const newPoints: GeoPoint[] = results
        .filter((r: any) => r.latitude && r.longitude)
        .map((r: any) => ({
          id: String(r.id),
          coordinates: [r.longitude, r.latitude],
          properties: r,
        }));

      if (newPoints.length > 0) {
        setGeoPoints(newPoints);
        setActiveTab('map'); // Switch to map view to show results
        toast.success('Query Executed', `Found ${results.length} results, ${newPoints.length} mapped points`);
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

  const tabs = [
    { id: 'map', label: 'Map View', icon: Map },
    { id: 'query', label: 'Query Builder', icon: Database },
    { id: 'import', label: 'Import/Export', icon: Upload },
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
          {/* Setup Instructions */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-300">
              <AlertTriangle className="h-4 w-4" />
              Configuration Required - How to Use This Feature
            </h3>
            <div className="space-y-2 text-xs text-blue-800 dark:text-blue-200">
              <p><strong>This feature requires geospatial data in your MonkDB database.</strong></p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Create a table with GEO_POINT or GEO_SHAPE columns in your database</li>
                <li>Use the <strong>Query Builder</strong> tab to execute geospatial queries</li>
                <li>Use the <strong>Import/Export</strong> tab to load GeoJSON, WKT, or CSV data</li>
                <li>Results will appear on the <strong>Map View</strong> automatically</li>
                <li>Click on the map to see coordinates and generate spatial queries</li>
              </ol>
              <p className="mt-2 border-t border-blue-300 pt-2 dark:border-blue-700">
                <strong>Example:</strong> Create a table with <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">CREATE TABLE locations (id INTEGER, name TEXT, location GEO_POINT)</code>
              </p>
            </div>
          </div>

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

          {/* Empty State for Map */}
          {activeTab === 'map' && geoPoints.length === 0 && geoShapes.length === 0 && !loading && (
            <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="max-w-md p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Map className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
                  No Geospatial Data
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Execute a geospatial query from the Query Builder tab or import data to visualize locations on the map.
                </p>
                <button
                  onClick={() => setActiveTab('query')}
                  className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Go to Query Builder
                </button>
              </div>
            </div>
          )}

          {activeTab === 'map' && (geoPoints.length > 0 || geoShapes.length > 0) && (
            <DynamicMapViewer
              geoPoints={geoPoints}
              geoShapes={geoShapes}
              onMapClick={handleMapClick}
              onDrawComplete={handleDrawComplete}
              center={[39.8283, -98.5795]} // Center of USA
              zoom={4}
              height="100%"
            />
          )}

          {activeTab === 'query' && (
            <SpatialQueryBuilder
              onQueryExecute={handleQueryExecute}
              initialCollection="your_schema.your_table"
            />
          )}

          {activeTab === 'import' && (
            <GeoDataImporter onImport={handleDataImport} />
          )}
        </div>

        {/* Side Panel */}
        <div className="w-96 space-y-4 overflow-y-auto">
          {/* Selected Coordinates */}
          {selectedCoords && activeTab === 'map' && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                Selected Location
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Latitude:</span>
                  <span className="font-mono text-gray-900 dark:text-white">
                    {selectedCoords[0].toFixed(6)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Longitude:</span>
                  <span className="font-mono text-gray-900 dark:text-white">
                    {selectedCoords[1].toFixed(6)}
                  </span>
                </div>
                <div className="mt-3 rounded-lg bg-gray-50 p-2 dark:bg-gray-900">
                  <code className="text-xs text-gray-700 dark:text-gray-300">
                    POINT({selectedCoords[1].toFixed(6)} {selectedCoords[0].toFixed(6)})
                  </code>
                </div>
              </div>
            </div>
          )}

          {/* Query Templates */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-2">
              <Code className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                SQL Templates (Replace placeholders)
              </h3>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Points within radius
                  </p>
                  <button
                    onClick={() => handleCopyTemplate(
                      `-- Replace 'your_schema.your_table' and 'geo_column'\nSELECT * FROM your_schema.your_table\nWHERE distance(geo_column,\n  'POINT(lon lat)') < 1000\nORDER BY distance(geo_column,\n  'POINT(lon lat)');`,
                      'radius'
                    )}
                    className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {copiedTemplate === 'radius' ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto text-xs text-gray-600 dark:text-gray-400">
                  <code>{`-- Replace 'your_schema.your_table' and 'geo_column'
SELECT * FROM your_schema.your_table
WHERE distance(geo_column,
  'POINT(lon lat)') < 1000
ORDER BY distance(geo_column,
  'POINT(lon lat)');`}</code>
                </pre>
              </div>

              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Points in polygon
                  </p>
                  <button
                    onClick={() => handleCopyTemplate(
                      `-- Replace with actual coordinates\nSELECT * FROM your_schema.your_table\nWHERE within(geo_column,\n  'POLYGON((\n    lon1 lat1,\n    lon2 lat2,\n    lon3 lat3,\n    lon1 lat1\n  ))');`,
                      'polygon'
                    )}
                    className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {copiedTemplate === 'polygon' ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto text-xs text-gray-600 dark:text-gray-400">
                  <code>{`-- Replace with actual coordinates
SELECT * FROM your_schema.your_table
WHERE within(geo_column,
  'POLYGON((
    lon1 lat1,
    lon2 lat2,
    lon3 lat3,
    lon1 lat1
  ))');`}</code>
                </pre>
              </div>

              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Intersecting shapes
                  </p>
                  <button
                    onClick={() => handleCopyTemplate(
                      `-- For shape-based queries\nSELECT * FROM your_schema.your_table\nWHERE intersects(geo_column,\n  'POLYGON((\n    lon1 lat1,\n    lon2 lat2,\n    lon3 lat3,\n    lon1 lat1\n  ))');`,
                      'intersects'
                    )}
                    className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {copiedTemplate === 'intersects' ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto text-xs text-gray-600 dark:text-gray-400">
                  <code>{`-- For shape-based queries
SELECT * FROM your_schema.your_table
WHERE intersects(geo_column,
  'POLYGON((
    lon1 lat1,
    lon2 lat2,
    lon3 lat3,
    lon1 lat1
  ))');`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Query Results */}
          {queryResults.length > 0 && activeTab === 'query' && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                Query Results ({queryResults.length})
              </h3>
              <div className="space-y-2">
                {queryResults.map((result, index) => (
                  <div
                    key={index}
                    className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {result.name}
                      </span>
                      {result.distance && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {result.distance.toFixed(2)}m
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Types Info */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/30">
            <h3 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-300">
              Supported Types
            </h3>
            <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-400">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                GEO_POINT - Point coordinates
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                GEO_SHAPE - Polygons, lines, etc.
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                Formats: WKT, GeoJSON, CSV
              </li>
            </ul>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
