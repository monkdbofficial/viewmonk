'use client';

import { useState, useEffect } from 'react';
import { MapPin, Circle, Square, Maximize2, Play, Copy, Check } from 'lucide-react';

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
}

export default function SpatialQueryBuilder({
  onQueryExecute,
  onQueryChange,
  initialCollection = 'geo_points'
}: SpatialQueryBuilderProps) {
  const [queryType, setQueryType] = useState<'distance' | 'within' | 'intersects'>('distance');
  const [collection, setCollection] = useState(initialCollection);
  const [fieldName, setFieldName] = useState('location');

  // Distance query parameters
  const [centerLat, setCenterLat] = useState('40.7128');
  const [centerLng, setCenterLng] = useState('-74.0060');
  const [radius, setRadius] = useState('1000');
  const [radiusUnit, setRadiusUnit] = useState<'meters' | 'kilometers' | 'miles'>('meters');

  // Within/Intersects parameters
  const [geometry, setGeometry] = useState('POLYGON((-74.0060 40.7128, -73.9352 40.7306, -73.9712 40.7831, -74.0060 40.7128))');

  // UI state
  const [generatedQuery, setGeneratedQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [orderBy, setOrderBy] = useState(true);
  const [limit, setLimit] = useState('100');

  const queryTemplates: QueryTemplate[] = [
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

  // Generate query based on parameters
  useEffect(() => {
    let query = '';

    switch (queryType) {
      case 'distance':
        const radiusInMeters = radiusUnit === 'kilometers'
          ? parseFloat(radius) * 1000
          : radiusUnit === 'miles'
          ? parseFloat(radius) * 1609.34
          : parseFloat(radius);

        query = `SELECT * FROM ${collection}
WHERE distance(${fieldName}, 'POINT(${centerLng} ${centerLat})') < ${radiusInMeters}`;

        if (orderBy) {
          query += `\nORDER BY distance(${fieldName}, 'POINT(${centerLng} ${centerLat})')`;
        }
        break;

      case 'within':
        query = `SELECT * FROM ${collection}
WHERE within(${fieldName}, '${geometry}')`;
        break;

      case 'intersects':
        query = `SELECT * FROM ${collection}
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
  }, [queryType, collection, fieldName, centerLat, centerLng, radius, radiusUnit, geometry, orderBy, limit]);

  const handleExecuteQuery = () => {
    if (onQueryExecute) {
      onQueryExecute(generatedQuery);
    }
  };

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
        setRadius('1000');
        setRadiusUnit('meters');
        break;
      case 'within':
        setGeometry('POLYGON((-74.0060 40.7128, -73.9352 40.7306, -73.9712 40.7831, -74.0060 40.7128))');
        break;
      case 'intersects':
        setGeometry('POLYGON((-74.0060 40.7128, -73.9352 40.7306, -73.9712 40.7831, -74.0060 40.7128))');
        break;
    }
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Spatial Query Builder
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Build and execute geospatial queries visually
        </p>
      </div>

      {/* Query Type Selection */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Query Type
        </label>
        <div className="grid grid-cols-3 gap-3">
          {queryTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.type}
                onClick={() => loadExample(template.type)}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-all ${
                  queryType === template.type
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30'
                    : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${
                    queryType === template.type
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
                <div className="text-center">
                  <div
                    className={`text-sm font-medium ${
                      queryType === template.type
                        ? 'text-blue-900 dark:text-blue-300'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {template.name}
                  </div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {template.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Query Parameters */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Collection and Field */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Collection
              </label>
              <input
                type="text"
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="collection_name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Field Name
              </label>
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="field_name"
              />
            </div>
          </div>

          {/* Distance Query Parameters */}
          {queryType === 'distance' && (
            <>
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
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Geometry (WKT Format)
              </label>
              <textarea
                value={geometry}
                onChange={(e) => setGeometry(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="POLYGON((...)), LINESTRING(...), etc."
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter geometry in Well-Known Text (WKT) format
              </p>
            </div>
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

      {/* Generated Query Preview */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Generated Query
          </label>
          <button
            onClick={handleCopyQuery}
            className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="mb-3 overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
          <code>{generatedQuery}</code>
        </pre>
        <button
          onClick={handleExecuteQuery}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Play className="h-4 w-4" />
          Execute Query
        </button>
      </div>
    </div>
  );
}
