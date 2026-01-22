'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SpatialQueryBuilder from '../components/geo/SpatialQueryBuilder';
import GeoDataImporter from '../components/geo/GeoDataImporter';
import EnterpriseDataPanel from '../components/geo/EnterpriseDataPanel';
import { Map, Database, Upload, Code, AlertTriangle, CheckCircle, Copy, Check, AlertCircle, RefreshCw, Settings, Info, Play, X, MapPin } from 'lucide-react';
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

type ActiveTab = 'map' | 'query' | 'import' | 'manage';

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
  const [showQueryInfo, setShowQueryInfo] = useState<string | null>(null);
  const [showUsageInfo, setShowUsageInfo] = useState(false);
  const [showDemoQueries, setShowDemoQueries] = useState(false);

  // Auto-load all stores on page mount
  useEffect(() => {
    if (activeConnection) {
      loadAllStores();
    }
  }, [activeConnection]);

  const loadAllStores = async () => {
    const query = `SELECT
  id,
  store_name as name,
  latitude(location) as latitude,
  longitude(location) as longitude,
  city,
  state,
  category,
  ROUND(revenue, 2) as revenue
FROM monkdb.stores
ORDER BY state, city;`;

    await handleQueryExecute(query);
    // Switch to map view after loading stores
    setActiveTab('map');
  };

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

      // Transform database results - CrateDB returns rows as arrays
      // Expected column order: id, name, latitude, longitude, ...
      const results = result.rows.map((row, index) => {
        const obj: any = {
          id: row[0] !== null && row[0] !== undefined ? row[0] : index,
          name: row[1] || `Result ${index + 1}`,
          latitude: row[2],
          longitude: row[3],
        };

        // Add any additional columns
        if (row.length > 4) {
          obj.city = row[4];
          obj.state = row[5];
          obj.category = row[6];
          obj.revenue = row[7];
          obj.distance_km = typeof row[2] === 'number' && row.length > 5 ? row[row.length - 1] : undefined;
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

  // Demo queries with metadata
  const demoQueries = [
    {
      id: 'radius',
      title: 'Stores near Times Square (50km)',
      description: 'Find all stores within 50 kilometers of Times Square, New York City',
      queryType: 'Proximity Search (Distance)',
      useCase: 'Finding nearby locations within a specific radius',
      whatItDoes: [
        'Calculates distance from Times Square (40.7589°N, 73.9851°W)',
        'Filters stores within 50km radius',
        'Returns store details with calculated distance',
        'Orders results by distance (nearest first)',
      ],
      expectedResults: '3-5 stores in the NYC area',
      location: 'Times Square, New York City',
      coordinates: 'POINT(-73.9851 40.7589)',
      query: `SELECT
  id,
  store_name as name,
  latitude(location) as latitude,
  longitude(location) as longitude,
  city,
  ROUND(distance(location, 'POINT(-73.9851 40.7589)') / 1000, 2) as distance_km
FROM monkdb.stores
WHERE distance(location, 'POINT(-73.9851 40.7589)') < 50000
ORDER BY distance(location, 'POINT(-73.9851 40.7589)');`,
      icon: '📍',
    },
    {
      id: 'polygon',
      title: 'All California stores',
      description: 'Find all stores located in California state, ordered by revenue',
      queryType: 'Attribute Filter',
      useCase: 'Regional analysis and revenue comparison',
      whatItDoes: [
        'Filters stores by state attribute (state = "CA")',
        'Returns store details including revenue',
        'Orders results by revenue (highest first)',
        'Shows business performance by location',
      ],
      expectedResults: '2-4 California stores',
      location: 'California, USA',
      coordinates: 'State-based filter (no coordinates)',
      query: `SELECT
  id,
  store_name as name,
  latitude(location) as latitude,
  longitude(location) as longitude,
  city,
  category,
  ROUND(revenue, 2) as revenue
FROM monkdb.stores
WHERE state = 'CA'
ORDER BY revenue DESC;`,
      icon: '🏪',
    },
    {
      id: 'intersects',
      title: '5 nearest to Downtown LA',
      description: 'Find the 5 closest stores to Downtown Los Angeles',
      queryType: 'Nearest Neighbor Search',
      useCase: 'Finding closest locations for delivery or service routing',
      whatItDoes: [
        'Calculates distance from Downtown LA (34.0522°N, 118.2437°W)',
        'Sorts all stores by proximity',
        'Returns only the top 5 nearest stores',
        'Includes distance calculation in kilometers',
      ],
      expectedResults: '5 stores closest to Los Angeles',
      location: 'Downtown Los Angeles, California',
      coordinates: 'POINT(-118.2437 34.0522)',
      query: `SELECT
  store_name as name,
  city,
  latitude(location) as latitude,
  longitude(location) as longitude,
  category,
  ROUND(distance(location, 'POINT(-118.2437 34.0522)') / 1000, 2) as distance_km
FROM monkdb.stores
ORDER BY distance(location, 'POINT(-118.2437 34.0522)')
LIMIT 5;`,
      icon: '🎯',
    },
  ];

  const tabs = [
    { id: 'map', label: 'Map View', icon: Map },
    { id: 'query', label: 'Query Builder', icon: Database },
    { id: 'import', label: 'Import/Export', icon: Upload },
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
              center={[
                geospatialConfig.map.defaultCenter.lng,
                geospatialConfig.map.defaultCenter.lat
              ]}
              zoom={geospatialConfig.map.defaultZoom}
              height="100%"
            />
          )}

          {activeTab === 'query' && (
            <SpatialQueryBuilder
              onQueryExecute={handleQueryExecute}
              initialCollection="monkdb.stores"
            />
          )}

          {activeTab === 'import' && (
            <GeoDataImporter onImport={handleDataImport} />
          )}

          {activeTab === 'manage' && (
            <EnterpriseDataPanel onDataChange={loadAllStores} />
          )}
        </div>

        {/* Side Panel - Only show when there's content */}
        {((selectedCoords && activeTab === 'map') || (queryResults.length > 0 && activeTab === 'query')) && (
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

          </div>
        )}
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
                {/* Auto-loaded Data */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-300">
                    <CheckCircle className="h-4 w-4" />
                    Auto-loaded Data
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    All 15 stores from <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs dark:bg-blue-900">monkdb.stores</code> are automatically loaded on the map when you open this page!
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
                            See all store locations on an interactive map. Click markers to see store details including name, city, category, and revenue.
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

                {/* Pro Tip */}
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-green-900 dark:text-green-300">
                    <AlertTriangle className="h-4 w-4" />
                    💡 Pro Tip
                  </h3>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Click the <strong>Info</strong> button on any demo query to see detailed explanations, expected results, and execute it directly from the modal!
                  </p>
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
