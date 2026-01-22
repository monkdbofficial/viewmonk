/**
 * Geospatial Configuration
 * Enterprise-grade configuration for geospatial data tools
 * All hard-coded values moved here for easy customization
 */

export const geospatialConfig = {
  // Map Configuration
  map: {
    defaultCenter: {
      lat: parseFloat(process.env.NEXT_PUBLIC_MAP_DEFAULT_LAT || '39.8283'),
      lng: parseFloat(process.env.NEXT_PUBLIC_MAP_DEFAULT_LNG || '-98.5795'),
    },
    defaultZoom: parseInt(process.env.NEXT_PUBLIC_MAP_DEFAULT_ZOOM || '4', 10),
    maxZoom: 18,
    minZoom: 2,
    clusteringThreshold: 100, // Show clusters when > 100 points
    heatmapEnabled: true,

    // Mapbox Configuration
    mapbox: {
      defaultStyle: process.env.NEXT_PUBLIC_MAPBOX_STYLE || 'streets-v12',
      markerColor: process.env.NEXT_PUBLIC_MAPBOX_MARKER_COLOR || '#3B82F6',
      shapeColor: process.env.NEXT_PUBLIC_MAPBOX_SHAPE_COLOR || '#3B82F6',
      shapeOpacity: 0.3,
      showStyleSwitcher: true,
      showFullscreenControl: true,
      showNavigationControl: true,
      showScaleControl: true,
    },
  },

  // Query Configuration
  query: {
    defaultLimit: 100,
    maxLimit: 10000,
    defaultRadius: 1000,
    defaultRadiusUnit: 'meters' as 'meters' | 'kilometers' | 'miles',
    timeoutMs: 30000,
    enablePagination: true,
    pageSize: 1000,

    // Default coordinates for different regions
    presets: {
      usa: { lat: 39.8283, lng: -98.5795, zoom: 4, name: 'United States' },
      europe: { lat: 50.8503, lng: 4.3517, zoom: 4, name: 'Europe' },
      asia: { lat: 34.0479, lng: 100.6197, zoom: 3, name: 'Asia' },
      world: { lat: 0, lng: 0, zoom: 2, name: 'World' },
    },
  },

  // Import/Export Configuration
  importExport: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    batchSize: 1000,
    supportedImportFormats: ['geojson', 'wkt', 'csv', 'kml', 'shp'],
    supportedExportFormats: ['geojson', 'csv', 'kml', 'wkt', 'json', 'excel'],
    defaultCsvColumns: {
      latitude: 'latitude',
      longitude: 'longitude',
      id: 'id',
      name: 'name',
    },
    validateBeforeImport: true,
    showPreview: true,
    previewRowCount: 10,
  },

  // Data Entry
  dataEntry: {
    enableBatchInsert: true,
    maxBatchSize: 1000,
    validateCoordinates: true,
    coordinateBounds: {
      latitude: { min: -90, max: 90 },
      longitude: { min: -180, max: 180 },
    },
  },

  // Table Creation
  tableCreation: {
    enableCustomSchema: true,
    defaultIndexes: ['geo_point', 'geo_shape'],
    supportedColumnTypes: [
      'TEXT',
      'INTEGER',
      'BIGINT',
      'DOUBLE',
      'BOOLEAN',
      'TIMESTAMP',
      'OBJECT',
      'ARRAY(TEXT)',
      'GEO_POINT',
      'GEO_SHAPE',
    ],
  },

  // Cache Configuration
  cache: {
    enabled: true,
    ttlMs: 300000, // 5 minutes
    maxEntries: 1000,
    cacheQueryResults: true,
    cacheSchemaMetadata: true,
  },

  // Features Flags
  features: {
    enableCollaboration: false,
    enableRealTimeSync: false,
    enableAdvancedAnalytics: true,
    enableGeofencing: false,
    enableHeatmaps: true,
    enableClustering: true,
    enableTimeSeriesAnalysis: false,
    enableSavedQueries: true,
    enableQueryHistory: true,
  },

  // UI Configuration
  ui: {
    theme: 'system' as 'light' | 'dark' | 'system',
    showCoordinates: true,
    showDistance: true,
    showArea: true,
    enableDrawing: true,
    enableMeasurement: true,
  },

  // Performance
  performance: {
    enableVirtualization: true,
    lazyLoadThreshold: 500,
    debounceMs: 300,
    throttleMs: 100,
  },
};

export type GeospatialConfig = typeof geospatialConfig;

// Helper function to get config value
export function getGeoConfig<K extends keyof GeospatialConfig>(key: K): GeospatialConfig[K] {
  return geospatialConfig[key];
}

// Helper to check if feature is enabled
export function isFeatureEnabled(feature: keyof GeospatialConfig['features']): boolean {
  return geospatialConfig.features[feature];
}
