'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Download, Check, AlertCircle, Map } from 'lucide-react';

interface GeoDataImporterProps {
  onImport?: (data: any[]) => void;
  onExport?: () => void;
}

type ImportFormat = 'wkt' | 'geojson' | 'csv';

export default function GeoDataImporter({ onImport, onExport }: GeoDataImporterProps) {
  const [format, setFormat] = useState<ImportFormat>('geojson');
  const [importData, setImportData] = useState('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [csvLatColumn, setCsvLatColumn] = useState('latitude');
  const [csvLngColumn, setCsvLngColumn] = useState('longitude');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportData(content);
      handlePreview(content, format);
    };
    reader.readAsText(file);
  };

  const handlePreview = (data: string, fmt: ImportFormat) => {
    setError(null);
    setPreviewData([]);

    try {
      let parsed: any[] = [];

      switch (fmt) {
        case 'geojson':
          const geojson = JSON.parse(data);
          if (geojson.type === 'FeatureCollection') {
            parsed = geojson.features.map((feature: any, index: number) => ({
              id: feature.id || `feature_${index}`,
              type: feature.geometry.type,
              coordinates: feature.geometry.coordinates,
              properties: feature.properties || {},
            }));
          } else if (geojson.type === 'Feature') {
            parsed = [{
              id: geojson.id || 'feature_0',
              type: geojson.geometry.type,
              coordinates: geojson.geometry.coordinates,
              properties: geojson.properties || {},
            }];
          } else {
            throw new Error('Invalid GeoJSON format');
          }
          break;

        case 'wkt':
          const wktLines = data.split('\n').filter(line => line.trim());
          parsed = wktLines.map((line, index) => {
            const match = line.match(/^(\w+)\s*\((.*)\)$/);
            if (!match) throw new Error(`Invalid WKT format at line ${index + 1}`);

            const [, type, coords] = match;
            return {
              id: `wkt_${index}`,
              type,
              wkt: line.trim(),
              properties: {},
            };
          });
          break;

        case 'csv':
          const lines = data.split('\n').filter(line => line.trim());
          if (lines.length < 2) throw new Error('CSV must have header and at least one data row');

          const headers = lines[0].split(',').map(h => h.trim());
          const latIndex = headers.findIndex(h => h.toLowerCase() === csvLatColumn.toLowerCase());
          const lngIndex = headers.findIndex(h => h.toLowerCase() === csvLngColumn.toLowerCase());

          if (latIndex === -1 || lngIndex === -1) {
            throw new Error(`Could not find columns '${csvLatColumn}' or '${csvLngColumn}'`);
          }

          parsed = lines.slice(1).map((line, index) => {
            const values = line.split(',').map(v => v.trim());
            const lat = parseFloat(values[latIndex]);
            const lng = parseFloat(values[lngIndex]);

            if (isNaN(lat) || isNaN(lng)) {
              throw new Error(`Invalid coordinates at row ${index + 2}`);
            }

            const properties: Record<string, any> = {};
            headers.forEach((header, i) => {
              if (i !== latIndex && i !== lngIndex) {
                properties[header] = values[i];
              }
            });

            return {
              id: `csv_${index}`,
              type: 'Point',
              coordinates: [lng, lat],
              properties,
            };
          });
          break;
      }

      setPreviewData(parsed);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to parse data');
      setPreviewData([]);
    }
  };

  const handleImport = () => {
    if (previewData.length === 0) {
      setError('No data to import');
      return;
    }

    if (onImport) {
      onImport(previewData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const handleExportGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: previewData.map((item) => ({
        type: 'Feature',
        id: item.id,
        geometry: {
          type: item.type,
          coordinates: item.coordinates,
        },
        properties: item.properties || {},
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.geojson';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (previewData.length === 0) return;

    const headers = ['id', 'latitude', 'longitude', ...Object.keys(previewData[0].properties || {})];
    const rows = previewData.map((item) => {
      const lat = Array.isArray(item.coordinates) ? item.coordinates[1] : 0;
      const lng = Array.isArray(item.coordinates) ? item.coordinates[0] : 0;
      const props = item.properties || {};
      return [item.id, lat, lng, ...Object.values(props)].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exampleData = {
    geojson: `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-74.0060, 40.7128]
      },
      "properties": {
        "name": "New York City",
        "population": 8336817
      }
    }
  ]
}`,
    wkt: `POINT(-74.0060 40.7128)
POLYGON((-74.0060 40.7128, -73.9352 40.7306, -73.9712 40.7831, -74.0060 40.7128))
LINESTRING(-74.0060 40.7128, -73.9352 40.7306, -73.9712 40.7831)`,
    csv: `name,latitude,longitude,population
New York City,40.7128,-74.0060,8336817
Los Angeles,34.0522,-118.2437,3979576
Chicago,41.8781,-87.6298,2693976`,
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Geospatial Data Import/Export
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Import and export geospatial data in various formats
        </p>
      </div>

      {/* Format Selection */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Import Format
        </label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => {
              setFormat('geojson');
              if (importData) handlePreview(importData, 'geojson');
            }}
            className={`flex items-center justify-center gap-2 rounded-lg border p-3 transition-all ${
              format === 'geojson'
                ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30'
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
            }`}
          >
            <Map className={`h-5 w-5 ${format === 'geojson' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
            <span className={`text-sm font-medium ${format === 'geojson' ? 'text-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
              GeoJSON
            </span>
          </button>
          <button
            onClick={() => {
              setFormat('wkt');
              if (importData) handlePreview(importData, 'wkt');
            }}
            className={`flex items-center justify-center gap-2 rounded-lg border p-3 transition-all ${
              format === 'wkt'
                ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30'
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
            }`}
          >
            <FileText className={`h-5 w-5 ${format === 'wkt' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
            <span className={`text-sm font-medium ${format === 'wkt' ? 'text-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
              WKT
            </span>
          </button>
          <button
            onClick={() => {
              setFormat('csv');
              if (importData) handlePreview(importData, 'csv');
            }}
            className={`flex items-center justify-center gap-2 rounded-lg border p-3 transition-all ${
              format === 'csv'
                ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30'
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
            }`}
          >
            <FileText className={`h-5 w-5 ${format === 'csv' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
            <span className={`text-sm font-medium ${format === 'csv' ? 'text-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
              CSV
            </span>
          </button>
        </div>
      </div>

      {/* CSV Column Mapping */}
      {format === 'csv' && (
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Column Mapping
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                Latitude Column
              </label>
              <input
                type="text"
                value={csvLatColumn}
                onChange={(e) => setCsvLatColumn(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="latitude"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                Longitude Column
              </label>
              <input
                type="text"
                value={csvLngColumn}
                onChange={(e) => setCsvLngColumn(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="longitude"
              />
            </div>
          </div>
        </div>
      )}

      {/* Import Section */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept={format === 'geojson' ? '.json,.geojson' : format === 'csv' ? '.csv' : '.txt'}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-blue-500 dark:hover:bg-blue-900/30"
            >
              <Upload className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Upload File
              </span>
            </button>
          </div>

          {/* Paste Data */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Or Paste Data
            </label>
            <textarea
              value={importData}
              onChange={(e) => {
                setImportData(e.target.value);
                handlePreview(e.target.value, format);
              }}
              rows={8}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder={`Paste ${format.toUpperCase()} data here...`}
            />
          </div>

          {/* Load Example */}
          <button
            onClick={() => {
              setImportData(exampleData[format]);
              handlePreview(exampleData[format], format);
            }}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Load Example Data
          </button>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/30">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 dark:bg-green-900/30">
              <Check className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-800 dark:text-green-300">
                Successfully imported {previewData.length} features
              </p>
            </div>
          )}

          {/* Preview */}
          {previewData.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Preview ({previewData.length} features)
              </h4>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                        ID
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                        Type
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                        Coordinates
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {previewData.slice(0, 5).map((item, index) => (
                      <tr key={index} className="bg-white dark:bg-gray-800">
                        <td className="px-3 py-2 text-gray-900 dark:text-white">{item.id}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-white">{item.type}</td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                          {item.wkt || JSON.stringify(item.coordinates).substring(0, 50)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handleImport}
            disabled={previewData.length === 0}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button
            onClick={handleExportGeoJSON}
            disabled={previewData.length === 0}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <Download className="h-4 w-4" />
            Export GeoJSON
          </button>
          <button
            onClick={handleExportCSV}
            disabled={previewData.length === 0}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
