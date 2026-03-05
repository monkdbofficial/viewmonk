'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import SpatialQueryBuilder from '../components/geo/SpatialQueryBuilder';
import EnterpriseDataPanel from '../components/geo/EnterpriseDataPanel';
import TableColumnSelector, { TableColumnSelection } from '../components/geo/TableColumnSelector';
import {
  Map, Database, Settings, Code, AlertTriangle, CheckCircle,
  Copy, Check, AlertCircle, RefreshCw, Info, Play, X, MapPin,
  Eye, EyeOff, Search,
} from 'lucide-react';
import { useActiveConnection } from '../lib/monkdb-context';
import { useToast } from '../components/ToastContext';
import { geospatialConfig } from '../config/geospatial.config';
import { useGeoData } from '../hooks/useGeoData';
import { DEMO_QUERIES } from '../lib/geospatial/demo-queries';

// Dynamically import LeafletMapViewer to avoid SSR issues
const DynamicMapViewer = dynamic(() => import('../components/geo/LeafletMapViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading Map...</p>
      </div>
    </div>
  ),
});

type ActiveTab = 'map' | 'query' | 'manage';

type Filter = { column: string; operator: string; value: string };

export default function GeospatialPage() {
  const activeConnection = useActiveConnection();
  const toast = useToast();

  // Data state (query results, points, shapes, loading)
  const {
    geoPoints, setGeoPoints,
    geoShapes, setGeoShapes,
    loading, error, setError,
    hasExecutedQuery, queryHistory,
    handleQueryExecute,
  } = useGeoData();

  // UI-only state
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [mapTableSelection, setMapTableSelection] = useState<TableColumnSelection | null>(null);
  const [mapFilters, setMapFilters] = useState<Filter[]>([]);
  const [showMapFilters, setShowMapFilters] = useState(false);
  const [noGeoColumnError, setNoGeoColumnError] = useState<{ tableName: string; show: boolean } | null>(null);
  const [isRestoringFromStorage, setIsRestoringFromStorage] = useState(false);
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [showDemoQueries, setShowDemoQueries] = useState(false);
  const [showUsageInfo, setShowUsageInfo] = useState(false);
  const [showQueryInfo, setShowQueryInfo] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  // ── localStorage restore ─────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const savedTable = localStorage.getItem('geospatial_map_table');
      if (savedTable) {
        const sel: TableColumnSelection = JSON.parse(savedTable);
        if (sel.schema && sel.table && Array.isArray(sel.columns) && sel.columns.length > 0) {
          setMapTableSelection(sel);
          setIsRestoringFromStorage(true);
          const savedFilters = localStorage.getItem('geospatial_map_filters');
          if (savedFilters) setMapFilters(JSON.parse(savedFilters));
        } else {
          localStorage.removeItem('geospatial_map_table');
          localStorage.removeItem('geospatial_map_filters');
        }
      }
    } catch {
      localStorage.removeItem('geospatial_map_table');
      localStorage.removeItem('geospatial_map_filters');
    }
  }, []);

  useEffect(() => {
    if (mapTableSelection?.columns?.length) {
      localStorage.setItem('geospatial_map_table', JSON.stringify(mapTableSelection));
    }
  }, [mapTableSelection]);

  useEffect(() => {
    if (mapFilters.length > 0) {
      localStorage.setItem('geospatial_map_filters', JSON.stringify(mapFilters));
    } else {
      localStorage.removeItem('geospatial_map_filters');
    }
  }, [mapFilters]);

  // ── Map table selection ───────────────────────────────────────────────────────
  const handleMapTableSelection = useCallback(async (selection: TableColumnSelection | null) => {
    setMapTableSelection(selection);
    if (!selection || !activeConnection) return;

    if (!selection.columns || !Array.isArray(selection.columns) || selection.columns.length === 0) {
      toast.error('Invalid Selection', 'Table columns data is missing. Please select the table again.');
      return;
    }

    const geoCol = selection.columns.find(c => c.type.toLowerCase().includes('geo'));
    if (!geoCol) {
      const tableName = `${selection.schema}.${selection.table}`;
      setNoGeoColumnError({ tableName, show: true });
      toast.error('No Geo Column', 'Selected table does not have a geospatial column.');
      return;
    }
    setNoGeoColumnError(null);

    const geoColumnName = geoCol.name;
    const isGeoPoint = geoCol.type.toLowerCase().includes('geo_point');

    const nameCol = selection.columns.find(c =>
      c.name.toLowerCase().includes('name') ||
      c.name.toLowerCase().includes('title') ||
      c.name.toLowerCase().includes('label')
    );
    const nameColumnName = nameCol ? nameCol.name : 'id';
    const idCol = selection.columns.find(c =>
      c.name.toLowerCase() === 'id' || c.name.toLowerCase() === '_id'
    );
    const idColumnName = idCol ? idCol.name : 'id';

    let selectColumns: string[] = [];
    if (idCol) {
      selectColumns.push(idColumnName);
    } else {
      selectColumns.push('ROW_NUMBER() OVER() as id');
    }
    if (nameCol) selectColumns.push(`${nameColumnName} as name`);
    if (isGeoPoint) {
      selectColumns.push(`latitude(${geoColumnName}) as latitude`);
      selectColumns.push(`longitude(${geoColumnName}) as longitude`);
    }

    const otherCols = selection.columns
      .filter(c =>
        c.name !== idColumnName &&
        c.name !== nameColumnName &&
        c.name !== geoColumnName &&
        !c.type.toLowerCase().includes('geo')
      )
      .slice(0, 10)
      .map(c => {
        if (c.type.toLowerCase().includes('double') || c.type.toLowerCase().includes('float')) {
          return `ROUND(${c.name}, 2) as ${c.name}`;
        }
        return c.name;
      });

    selectColumns = selectColumns.concat(otherCols);

    // Parameterized WHERE clause
    let whereClause = '';
    const filterParams: unknown[] = [];
    if (mapFilters.length > 0) {
      const conditions = mapFilters.map(filter => {
        const safeCol = `"${filter.column.replace(/"/g, '""')}"`;
        switch (filter.operator) {
          case 'contains':   filterParams.push(`%${filter.value}%`); return `${safeCol} LIKE ?`;
          case 'starts_with': filterParams.push(`${filter.value}%`); return `${safeCol} LIKE ?`;
          case 'greater_than': filterParams.push(filter.value); return `${safeCol} > ?`;
          case 'less_than':  filterParams.push(filter.value); return `${safeCol} < ?`;
          default:           filterParams.push(filter.value); return `${safeCol} = ?`;
        }
      });
      whereClause = `\nWHERE ${conditions.join(' AND ')}`;
    }

    const safeSchema = selection.schema.replace(/"/g, '""');
    const safeTable = selection.table.replace(/"/g, '""');
    const query = `SELECT\n  ${selectColumns.join(',\n  ')}\nFROM "${safeSchema}"."${safeTable}"${whereClause}\nLIMIT 1000;`;

    await handleQueryExecute(query, filterParams.length > 0 ? filterParams : undefined);
    toast.success('Table Loaded', `Loaded data from ${selection.schema}.${selection.table}`);
  }, [mapFilters, activeConnection, handleQueryExecute, toast]);

  // Auto-reload when restoring from localStorage
  useEffect(() => {
    if (isRestoringFromStorage && mapTableSelection && activeConnection) {
      handleMapTableSelection(mapTableSelection);
      setIsRestoringFromStorage(false);
    }
  }, [isRestoringFromStorage, mapTableSelection, activeConnection, handleMapTableSelection]);

  const handleDataImport = (data: any[]) => {
    const newPoints = data
      .filter(item => item.type === 'Point')
      .map(item => ({ id: item.id, coordinates: item.coordinates, properties: item.properties }));
    const newShapes = data
      .filter(item => item.type !== 'Point')
      .map(item => ({ id: item.id, type: item.type, coordinates: item.coordinates, properties: item.properties }));
    setGeoPoints(prev => [...prev, ...newPoints]);
    setGeoShapes(prev => [...prev, ...newShapes]);
    setActiveTab('map');
  };

  const handleMapClick = (lat: number, lng: number) => setSelectedCoords([lat, lng]);

  const handleCopyTemplate = (template: string, templateName: string) => {
    navigator.clipboard.writeText(template);
    setCopiedTemplate(templateName);
    toast.success('Template Copied', 'SQL template copied to clipboard');
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const tabs = [
    { id: 'map',    label: 'Map View',         icon: Map },
    { id: 'query',  label: 'Query Builder',     icon: Database },
    { id: 'manage', label: 'Data Management',   icon: Settings },
  ];

  // ── No connection state ───────────────────────────────────────────────────────
  if (!activeConnection) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Map className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">No Active Connection</h3>
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

  // ── Main layout ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Map className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Geospatial Data Tools</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Visualize, query, and manage geospatial data with MonkDB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDemoQueries(true)}
              className="flex items-center gap-2 rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 transition-colors hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-900/20 dark:hover:bg-purple-900/30"
            >
              <Code className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Demo Queries</span>
            </button>
            <button
              onClick={() => setShowUsageInfo(true)}
              className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 transition-colors hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
            >
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Usage Guide</span>
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 dark:border-green-900/50 dark:bg-green-900/20">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Connected</span>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{geoPoints.length} Points</span>
                <div className="mx-2 h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{geoShapes.length} Shapes</span>
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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-red-900 dark:text-red-300">Query Execution Failed</h3>
                  <pre className="mt-2 overflow-x-auto rounded bg-red-100 p-3 font-mono text-xs text-red-800 dark:bg-red-900/30 dark:text-red-200">{error}</pre>
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

          {/* Content area */}
          <div className="flex gap-4 overflow-hidden" style={{ height: 'calc(100vh - 24rem)' }}>
            <div className="relative flex-1 overflow-hidden">
              {/* Loading Overlay */}
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
                  <div className="text-center">
                    <RefreshCw className="mx-auto h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
                    <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">Executing query...</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Please wait while we fetch geospatial data</p>
                  </div>
                </div>
              )}

              {/* Map Tab — empty state */}
              {activeTab === 'map' && geoPoints.length === 0 && geoShapes.length === 0 && !loading && (
                <div className="flex h-full flex-col gap-4 overflow-auto p-6">
                  <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-6 dark:border-blue-900 dark:from-blue-950 dark:via-gray-800 dark:to-blue-950">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                        <Map className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h2 className="mb-1.5 text-xl font-bold text-gray-900 dark:text-white">Geospatial Data Visualization</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Visualize location data on interactive maps with filtering, clustering, and heatmap analysis
                        </p>
                      </div>
                      <div className="hidden items-center gap-2 lg:flex">
                        <span className="rounded-md bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">🗺️ Maps</span>
                        <span className="rounded-md bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">🔍 Filters</span>
                        <span className="rounded-md bg-orange-100 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">🔥 Heatmap</span>
                      </div>
                    </div>
                  </div>

                  {/* Data Source selector */}
                  <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 dark:bg-blue-500">
                        <Database className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Select Data Source</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Choose a table with GEO_POINT or GEO_SHAPE columns</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                      <TableColumnSelector onSelectionChange={handleMapTableSelection} showGeoColumnsOnly={true} compact={true} initialTable={mapTableSelection?.fullTableName} />
                    </div>

                    {noGeoColumnError?.show && (
                      <div className="mt-4 rounded-lg border-2 border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-red-900 dark:text-red-200">No Geospatial Columns Found</h4>
                            <p className="mt-1 text-sm text-red-800 dark:text-red-300">
                              The table <strong>{noGeoColumnError.tableName}</strong> does not have any geospatial columns (GEO_POINT or GEO_SHAPE).
                            </p>
                          </div>
                          <button onClick={() => setNoGeoColumnError(null)} className="flex-shrink-0 rounded-lg p-1 text-red-600 transition-colors hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/40">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {mapTableSelection && (
                      <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                        <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
                          <CheckCircle className="h-4 w-4" />
                          <span>Loading all data from <strong>{mapTableSelection.schema}.{mapTableSelection.table}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>

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
                        <div className="text-xs text-gray-600 dark:text-gray-400">Write SQL for proximity searches & spatial analysis</div>
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
                        <div className="text-xs text-gray-600 dark:text-gray-400">Import from CSV, GeoJSON, Shapefiles & more</div>
                      </div>
                      <span className="flex-shrink-0 text-orange-600 transition-transform group-hover:translate-x-1 dark:text-orange-400">→</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Map Tab — with data */}
              {activeTab === 'map' && (geoPoints.length > 0 || geoShapes.length > 0) && (
                <div className="flex h-full flex-col gap-2">
                  {noGeoColumnError?.show && (
                    <div className="rounded-lg border-2 border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                        <p className="flex-1 text-sm text-red-800 dark:text-red-300">
                          <strong>{noGeoColumnError.tableName}</strong> does not have geospatial columns.
                        </p>
                        <button onClick={() => setNoGeoColumnError(null)} className="flex-shrink-0 rounded-lg p-1 text-red-600 transition-colors hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/40">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Control Bar */}
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-2 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800">
                    {mapTableSelection ? (
                      <div className="flex items-center gap-2 rounded-md bg-blue-100 px-3 py-1.5 dark:bg-blue-900/30">
                        <Database className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-blue-900 dark:text-blue-300">
                          {mapTableSelection.schema}.{mapTableSelection.table}
                        </span>
                        <span className="text-xs text-blue-700 dark:text-blue-400">({geoPoints.length + geoShapes.length})</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 dark:bg-gray-700">
                        <MapPin className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Query Results ({geoPoints.length + geoShapes.length})
                        </span>
                      </div>
                    )}
                    <div className="flex-1" />
                    <div className="flex items-center gap-2">
                      <TableColumnSelector onSelectionChange={handleMapTableSelection} showGeoColumnsOnly={true} compact={true} initialTable={mapTableSelection?.fullTableName} />
                      {mapTableSelection && (
                        <button
                          onClick={() => setShowMapFilters(!showMapFilters)}
                          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                            showMapFilters || mapFilters.length > 0
                              ? 'border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          🔍 Filters {mapFilters.length > 0 && `(${mapFilters.length})`}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setMapTableSelection(null);
                          setGeoPoints([]);
                          setGeoShapes([]);
                          setMapFilters([]);
                        }}
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Filter Panel */}
                  {showMapFilters && mapTableSelection && (
                    <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm dark:border-blue-900 dark:from-blue-950 dark:to-gray-800">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 dark:bg-blue-500">
                            <Search className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Filter Data</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Search and filter your map results</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowMapFilters(false)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {mapFilters.length > 0 ? (
                        <div className="mb-4 space-y-3">
                          {mapFilters.map((filter, index) => (
                            <div key={index} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Filter #{index + 1}</span>
                                <button
                                  onClick={() => setMapFilters(mapFilters.filter((_, i) => i !== index))}
                                  className="rounded-md p-1 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-4">
                                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Column</label>
                                  <select
                                    value={filter.column}
                                    onChange={(e) => {
                                      const newFilters = [...mapFilters];
                                      newFilters[index].column = e.target.value;
                                      setMapFilters(newFilters);
                                    }}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                  >
                                    {mapTableSelection.columns
                                      .filter(c => !c.type.toLowerCase().includes('geo'))
                                      .map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                                  </select>
                                </div>
                                <div className="col-span-4">
                                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Condition</label>
                                  <select
                                    value={filter.operator}
                                    onChange={(e) => {
                                      const newFilters = [...mapFilters];
                                      newFilters[index].operator = e.target.value;
                                      setMapFilters(newFilters);
                                    }}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                  >
                                    <option value="equals">= Equals</option>
                                    <option value="contains">⊃ Contains</option>
                                    <option value="starts_with">⊲ Starts with</option>
                                    <option value="greater_than">&gt; Greater than</option>
                                    <option value="less_than">&lt; Less than</option>
                                  </select>
                                </div>
                                <div className="col-span-4">
                                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Value</label>
                                  <input
                                    type="text"
                                    value={filter.value}
                                    onChange={(e) => {
                                      const newFilters = [...mapFilters];
                                      newFilters[index].value = e.target.value;
                                      setMapFilters(newFilters);
                                    }}
                                    placeholder="Enter value..."
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mb-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-800/50">
                          <Search className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No filters added yet</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">Click "Add Filter" to start filtering your data</p>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            const firstNonGeoColumn = mapTableSelection.columns.find(c => !c.type.toLowerCase().includes('geo'));
                            if (firstNonGeoColumn) {
                              setMapFilters([...mapFilters, { column: firstNonGeoColumn.name, operator: 'equals', value: '' }]);
                            }
                          }}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                        >
                          <span className="text-lg">+</span> Add Filter
                        </button>
                        {mapFilters.length > 0 && (
                          <>
                            <button
                              onClick={() => { setMapFilters([]); handleMapTableSelection(mapTableSelection); }}
                              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            >
                              Clear All
                            </button>
                            <button
                              onClick={() => handleMapTableSelection(mapTableSelection)}
                              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-blue-800"
                            >
                              <Play className="h-4 w-4" /> Apply Filters
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Map */}
                  <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <DynamicMapViewer
                      geoPoints={geoPoints}
                      geoShapes={geoShapes}
                      onMapClick={handleMapClick}
                      center={[geospatialConfig.map.defaultCenter.lng, geospatialConfig.map.defaultCenter.lat]}
                      zoom={geospatialConfig.map.defaultZoom}
                      height="100%"
                    />
                  </div>
                </div>
              )}

              {/* Query Builder Tab */}
              {activeTab === 'query' && (
                <div className="flex h-full gap-4">
                  <div className={`flex-shrink-0 transition-all duration-300 ${mapCollapsed ? 'flex-1' : 'w-[500px]'}`}>
                    <SpatialQueryBuilder
                      onQueryExecute={handleQueryExecute}
                      queryHistory={queryHistory}
                      onLoadQuery={handleQueryExecute}
                    />
                  </div>

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
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                              {hasExecutedQuery
                                ? 'Your query executed successfully but returned no results.'
                                : 'Build your query on the left and click "Execute Query" to see results on this map.'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <DynamicMapViewer
                          geoPoints={geoPoints}
                          geoShapes={geoShapes}
                          onMapClick={handleMapClick}
                          center={[geospatialConfig.map.defaultCenter.lng, geospatialConfig.map.defaultCenter.lat]}
                          zoom={geospatialConfig.map.defaultZoom}
                          height="100%"
                        />
                      )}
                      <button
                        onClick={() => setMapCollapsed(true)}
                        className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-lg transition-all hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <EyeOff className="h-3.5 w-3.5" /> Hide Map
                      </button>
                    </div>
                  )}

                  {mapCollapsed && (
                    <button
                      onClick={() => setMapCollapsed(false)}
                      className="flex flex-shrink-0 items-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-8 text-sm font-medium text-blue-700 transition-all hover:border-blue-400 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
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

              {/* Data Management Tab */}
              {activeTab === 'manage' && (
                <EnterpriseDataPanel onDataChange={() => {
                  toast.success('Data Updated', 'Please re-execute your query to see updated results');
                }} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Query Info Modal */}
      {showQueryInfo && (() => {
        const q = DEMO_QUERIES.find(dq => dq.id === showQueryInfo);
        if (!q) return null;
        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-800">
              <div className="sticky top-0 border-b border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{q.icon}</span>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{q.title}</h2>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{q.description}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowQueryInfo(null)} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="space-y-6 p-6">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Query Type</h3>
                  </div>
                  <div className="rounded-lg bg-purple-50 px-3 py-2 dark:bg-purple-900/20">
                    <p className="text-sm font-medium text-purple-900 dark:text-purple-300">{q.queryType}</p>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Use Case</h3>
                  </div>
                  <div className="rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-900/20">
                    <p className="text-sm text-blue-900 dark:text-blue-300">{q.useCase}</p>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">What This Query Does</h3>
                  </div>
                  <ul className="space-y-2">
                    {q.whatItDoes.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{i + 1}</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Expected Results</h3>
                  </div>
                  <div className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/20">
                    <p className="text-sm text-amber-900 dark:text-amber-300">{q.expectedResults}</p>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Code className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">SQL Query</h3>
                  </div>
                  <div className="rounded-lg bg-gray-900 p-4">
                    <pre className="overflow-x-auto text-xs text-gray-100"><code>{q.query}</code></pre>
                  </div>
                </div>
              </div>
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
                      onClick={() => handleCopyTemplate(q.query, q.id)}
                      className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      <Copy className="h-4 w-4" /> Copy Query
                    </button>
                    <button
                      onClick={() => { handleQueryExecute(q.query); setShowQueryInfo(null); setActiveTab('map'); }}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                    >
                      <Play className="h-4 w-4" /> Execute Query
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">How to Use Geospatial Data Tools</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Complete guide to visualizing and querying geospatial data</p>
                  </div>
                </div>
                <button onClick={() => setShowUsageInfo(false)} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="space-y-6 p-6">
              <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-green-900 dark:text-green-300">
                  <Settings className="h-4 w-4" /> 📝 How to Create Geospatial Tables
                </h3>
                <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
                  <p className="font-semibold">Required Columns for Map Visualization:</p>
                  <div className="space-y-1 rounded-lg bg-white/50 p-3 dark:bg-green-900/30 text-xs">
                    <div><strong>id</strong> — Unique identifier (INTEGER or TEXT)</div>
                    <div><strong>name/label column</strong> — Display name (TEXT)</div>
                    <div><strong>geo_column</strong> — GEO_POINT or GEO_SHAPE</div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">Main Features</h3>
                <div className="space-y-2">
                  {[
                    { icon: Map, color: 'blue', title: 'Map View', desc: 'Visualize all geospatial data on an interactive map.' },
                    { icon: Database, color: 'green', title: 'Query Builder', desc: 'Execute custom geospatial queries with proximity search and spatial analysis.' },
                    { icon: Code, color: 'purple', title: 'Demo Queries', desc: 'Ready-to-use query examples with detailed explanations.' },
                    { icon: Settings, color: 'orange', title: 'Data Management', desc: 'Add data, import/export CSV/GeoJSON, and create new tables.' },
                  ].map(({ icon: Icon, color, title, desc }) => (
                    <div key={title} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
                        <Icon className={`h-4 w-4 text-${color}-600 dark:text-${color}-400`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">Available Geospatial Functions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['distance()', 'within()', 'latitude()', 'longitude()'].map(fn => (
                    <div key={fn} className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-900/50">
                      <code className="text-xs font-mono text-blue-600 dark:text-blue-400">{fn}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Demo Queries — Ready to Use</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{DEMO_QUERIES.length} example queries to get you started</p>
                  </div>
                </div>
                <button onClick={() => setShowDemoQueries(false)} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {DEMO_QUERIES.map((q) => (
                  <div key={q.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{q.icon}</span>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{q.title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setShowQueryInfo(q.id); setShowDemoQueries(false); }}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          <Info className="h-3.5 w-3.5" /> Info
                        </button>
                        <button
                          onClick={() => handleCopyTemplate(q.query, q.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          {copiedTemplate === q.id ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                        </button>
                        <button
                          onClick={() => { handleQueryExecute(q.query); setShowDemoQueries(false); setActiveTab('map'); }}
                          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                        >
                          <Play className="h-3.5 w-3.5" /> Run
                        </button>
                      </div>
                    </div>
                    <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">{q.description}</p>
                    <div className="rounded-lg bg-gray-900 p-3">
                      <pre className="overflow-x-auto text-xs text-gray-100"><code>{q.query}</code></pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
