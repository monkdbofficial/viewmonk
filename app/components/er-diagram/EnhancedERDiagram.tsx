'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  Filter,
  Eye,
  EyeOff,
  Grid,
  List,
  Share2,
  Settings,
  Info
} from 'lucide-react';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: { table: string; column: string };
}

interface TableMetadata {
  name: string;
  columns: Column[];
  rowCount?: number;
}

interface TablePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EnhancedERDiagramProps {
  tables: TableMetadata[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onTableClick: (tableName: string) => void;
}

export default function EnhancedERDiagram({
  tables,
  zoom,
  onZoomChange,
  onTableClick
}: EnhancedERDiagramProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [tablePositions, setTablePositions] = useState<Map<string, TablePosition>>(new Map());
  const [dragging, setDragging] = useState<{ table: string; offsetX: number; offsetY: number } | null>(null);
  const [pan, setPan] = useState({ x: 200, y: 150 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // New state for enhanced features
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedTable, setHighlightedTable] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showRelationships, setShowRelationships] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'circular' | 'hierarchical'>('grid');

  // Constants
  const TABLE_WIDTH = 320;
  const TABLE_HEADER_HEIGHT = 45;
  const ROW_HEIGHT = 32;
  const COLUMN_MARGIN = 250;
  const ROW_MARGIN = 150;

  // Calculate table positions based on layout mode
  useEffect(() => {
    const positions = new Map<string, TablePosition>();

    if (layoutMode === 'grid') {
      // Grid layout
      const tablesPerRow = Math.max(3, Math.ceil(Math.sqrt(tables.length)));
      tables.forEach((table, index) => {
        const row = Math.floor(index / tablesPerRow);
        const col = index % tablesPerRow;
        const x = col * (TABLE_WIDTH + COLUMN_MARGIN) + 100;
        const y = row * 400 + 100;
        const height = TABLE_HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + 10;
        positions.set(table.name, { x, y, width: TABLE_WIDTH, height });
      });
    } else if (layoutMode === 'circular') {
      // Circular layout
      const centerX = 800;
      const centerY = 600;
      const radius = 500;
      const angleStep = (2 * Math.PI) / tables.length;

      tables.forEach((table, index) => {
        const angle = index * angleStep;
        const x = centerX + radius * Math.cos(angle) - TABLE_WIDTH / 2;
        const y = centerY + radius * Math.sin(angle);
        const height = TABLE_HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + 10;
        positions.set(table.name, { x, y, width: TABLE_WIDTH, height });
      });
    } else {
      // Hierarchical layout (tables with no FKs at top)
      const roots = tables.filter(t => !t.columns.some(c => c.isForeignKey));
      const children = tables.filter(t => t.columns.some(c => c.isForeignKey));

      let yOffset = 100;
      roots.forEach((table, index) => {
        const x = index * (TABLE_WIDTH + COLUMN_MARGIN) + 100;
        const height = TABLE_HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + 10;
        positions.set(table.name, { x, y: yOffset, width: TABLE_WIDTH, height });
      });

      yOffset += 500;
      children.forEach((table, index) => {
        const x = index * (TABLE_WIDTH + COLUMN_MARGIN) + 100;
        const height = TABLE_HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + 10;
        positions.set(table.name, { x, y: yOffset, width: TABLE_WIDTH, height });
      });
    }

    setTablePositions(positions);
  }, [tables, layoutMode]);

  // Filter tables based on search
  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.columns.some(col => col.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent, tableName: string) => {
    const pos = tablePositions.get(tableName);
    if (!pos) return;
    setDragging({
      table: tableName,
      offsetX: e.clientX - pos.x * zoom - pan.x,
      offsetY: e.clientY - pos.y * zoom - pan.y
    });
    setSelectedTable(tableName);
    e.stopPropagation();
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !dragging) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedTable(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      const newX = (e.clientX - dragging.offsetX - pan.x) / zoom;
      const newY = (e.clientY - dragging.offsetY - pan.y) / zoom;
      setTablePositions(prev => {
        const newPositions = new Map(prev);
        const current = newPositions.get(dragging.table);
        if (current) {
          newPositions.set(dragging.table, { ...current, x: newX, y: newY });
        }
        return newPositions;
      });
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setIsPanning(false);
  };

  // Fit to screen
  const handleFitToScreen = () => {
    if (!canvasRef.current || tables.length === 0) return;

    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    tablePositions.forEach(pos => {
      bounds.minX = Math.min(bounds.minX, pos.x);
      bounds.minY = Math.min(bounds.minY, pos.y);
      bounds.maxX = Math.max(bounds.maxX, pos.x + pos.width);
      bounds.maxY = Math.max(bounds.maxY, pos.y + pos.height);
    });

    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    const canvasWidth = canvasRef.current.clientWidth;
    const canvasHeight = canvasRef.current.clientHeight;

    const scaleX = canvasWidth / (contentWidth + 200);
    const scaleY = canvasHeight / (contentHeight + 200);
    const newZoom = Math.min(scaleX, scaleY, 1);

    onZoomChange(newZoom);
    setPan({
      x: (canvasWidth - contentWidth * newZoom) / 2 - bounds.minX * newZoom,
      y: (canvasHeight - contentHeight * newZoom) / 2 - bounds.minY * newZoom
    });
  };

  // Render relationships
  const renderRelationships = () => {
    if (!showRelationships) return null;

    const lines: React.ReactElement[] = [];

    filteredTables.forEach(table => {
      const sourcePos = tablePositions.get(table.name);
      if (!sourcePos) return;

      table.columns.forEach(column => {
        if (column.isForeignKey && column.references) {
          const targetPos = tablePositions.get(column.references.table);
          if (!targetPos) return;

          const sourceX = sourcePos.x + sourcePos.width / 2;
          const sourceY = sourcePos.y + sourcePos.height / 2;
          const targetX = targetPos.x + targetPos.width / 2;
          const targetY = targetPos.y + targetPos.height / 2;

          const isHighlighted = selectedTable === table.name || selectedTable === column.references.table;

          lines.push(
            <g key={`${table.name}-${column.name}`} opacity={isHighlighted ? 1 : 0.6}>
              <line
                x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}
                stroke={isHighlighted ? '#3b82f6' : '#94a3b8'}
                strokeWidth={isHighlighted ? '3' : '2'}
                strokeDasharray="8,4"
                markerEnd="url(#arrowhead)"
              />
              <text
                x={(sourceX + targetX) / 2} y={(sourceY + targetY) / 2 - 8}
                fill="#64748b" fontSize="11" textAnchor="middle"
                className="font-mono"
              >
                {column.name}
              </text>
            </g>
          );
        }
      });
    });

    return lines;
  };

  // Render minimap
  const renderMinimap = () => {
    if (!showMinimap) return null;

    const minimapSize = 200;
    const scale = 0.1;

    return (
      <div className="absolute bottom-4 right-4 rounded-lg border-2 border-gray-300 bg-white/95 p-2 shadow-xl dark:border-gray-600 dark:bg-gray-800/95">
        <svg width={minimapSize} height={minimapSize} className="border border-gray-200 dark:border-gray-700">
          {tables.map(table => {
            const pos = tablePositions.get(table.name);
            if (!pos) return null;
            return (
              <rect
                key={table.name}
                x={pos.x * scale}
                y={pos.y * scale}
                width={pos.width * scale}
                height={pos.height * scale}
                fill={selectedTable === table.name ? '#3b82f6' : '#e2e8f0'}
                stroke="#94a3b8"
                strokeWidth="1"
              />
            );
          })}
        </svg>
        <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">Overview</p>
      </div>
    );
  };

  return (
    <div className="relative h-full w-full">
      {/* Enhanced Toolbar */}
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
        {/* Search */}
        <div className="rounded-lg border border-gray-300 bg-white/95 p-2 shadow-lg dark:border-gray-600 dark:bg-gray-800/95">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white/95 p-1 shadow-lg dark:border-gray-600 dark:bg-gray-800/95">
            <button
              onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))}
              className="rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={Math.round(zoom * 100)}
              onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
              className="w-16 rounded border-0 bg-transparent text-center text-sm font-medium focus:outline-none"
              min="10"
              max="200"
            />
            <span className="text-xs text-gray-500">%</span>
            <button
              onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
              className="rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleFitToScreen}
            className="rounded-lg border border-gray-300 bg-white/95 p-2 shadow-lg hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800/95 dark:hover:bg-gray-700"
            title="Fit to screen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* Layout Options */}
        <div className="flex gap-1 rounded-lg border border-gray-300 bg-white/95 p-1 shadow-lg dark:border-gray-600 dark:bg-gray-800/95">
          <button
            onClick={() => setLayoutMode('grid')}
            className={`rounded p-2 ${layoutMode === 'grid' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="Grid layout"
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setLayoutMode('circular')}
            className={`rounded p-2 ${layoutMode === 'circular' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="Circular layout"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setLayoutMode('hierarchical')}
            className={`rounded p-2 ${layoutMode === 'hierarchical' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="Hierarchical layout"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Toggle Options */}
        <div className="flex flex-col gap-1 rounded-lg border border-gray-300 bg-white/95 p-1 shadow-lg dark:border-gray-600 dark:bg-gray-800/95">
          <button
            onClick={() => setShowRelationships(!showRelationships)}
            className={`flex items-center gap-2 rounded px-3 py-2 text-xs ${showRelationships ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            {showRelationships ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            Relationships
          </button>
          <button
            onClick={() => setShowMinimap(!showMinimap)}
            className={`flex items-center gap-2 rounded px-3 py-2 text-xs ${showMinimap ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            {showMinimap ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            Minimap
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="h-full w-full cursor-move overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 3000 3000"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
            </marker>
            <filter id="shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
            <linearGradient id="tableGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {renderRelationships()}

            {filteredTables.map(table => {
              const pos = tablePositions.get(table.name);
              if (!pos) return null;

              const isHighlighted = highlightedTable === table.name || searchTerm && table.name.toLowerCase().includes(searchTerm.toLowerCase());
              const isSelected = selectedTable === table.name;

              return (
                <g
                  key={table.name}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseDown={(e) => handleMouseDown(e as any, table.name)}
                  onMouseEnter={() => setHighlightedTable(table.name)}
                  onMouseLeave={() => setHighlightedTable(null)}
                  onClick={() => onTableClick(table.name)}
                  style={{ cursor: 'move' }}
                  filter={isSelected ? 'url(#shadow)' : undefined}
                >
                  {/* Table container with shadow */}
                  <rect
                    width={pos.width}
                    height={pos.height}
                    fill="white"
                    stroke={isSelected ? '#3b82f6' : isHighlighted ? '#60a5fa' : '#d1d5db'}
                    strokeWidth={isSelected ? '3' : '2'}
                    rx="12"
                    filter="url(#shadow)"
                  />

                  {/* Header with gradient */}
                  <rect
                    width={pos.width}
                    height={TABLE_HEADER_HEIGHT}
                    fill="url(#tableGradient)"
                    rx="12"
                  />
                  <rect
                    width={pos.width}
                    height={TABLE_HEADER_HEIGHT / 2}
                    fill="url(#tableGradient)"
                    y={TABLE_HEADER_HEIGHT / 2}
                  />

                  {/* Table name */}
                  <text
                    x={pos.width / 2}
                    y={TABLE_HEADER_HEIGHT / 2 + 7}
                    fill="white"
                    fontSize="17"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="font-sans"
                  >
                    {table.name}
                  </text>

                  {/* Row count badge */}
                  {table.rowCount !== undefined && (
                    <g transform={`translate(${pos.width - 60}, 8)`}>
                      <rect width="50" height="20" fill="rgba(255,255,255,0.3)" rx="10" />
                      <text x="25" y="14" fill="white" fontSize="11" textAnchor="middle" fontWeight="600">
                        {table.rowCount} rows
                      </text>
                    </g>
                  )}

                  {/* Columns */}
                  {table.columns.map((column, index) => {
                    const y = TABLE_HEADER_HEIGHT + index * ROW_HEIGHT;
                    return (
                      <g key={column.name}>
                        <rect
                          x="0" y={y}
                          width={pos.width}
                          height={ROW_HEIGHT}
                          fill={index % 2 === 0 ? '#f9fafb' : 'white'}
                        />
                        <text x="15" y={y + ROW_HEIGHT / 2 + 6} fontSize="16">
                          {column.isPrimaryKey ? '🔑' : column.isForeignKey ? '🔗' : '•'}
                        </text>
                        <text
                          x="45" y={y + ROW_HEIGHT / 2 + 6}
                          fontSize="14"
                          fontWeight={column.isPrimaryKey ? 'bold' : 'normal'}
                          fill="#111827"
                          className="font-mono"
                        >
                          {column.name}
                        </text>
                        <text
                          x={pos.width - 15}
                          y={y + ROW_HEIGHT / 2 + 6}
                          fontSize="12"
                          fill="#6b7280"
                          textAnchor="end"
                          className="font-mono"
                        >
                          {column.type}{!column.nullable ? ' *' : ''}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Minimap */}
      {renderMinimap()}

      {/* Stats Panel */}
      <div className="absolute bottom-4 left-4 rounded-lg border border-gray-300 bg-white/95 p-3 shadow-xl dark:border-gray-600 dark:bg-gray-800/95">
        <div className="flex items-center gap-2 text-sm">
          <Info className="h-4 w-4 text-blue-600" />
          <span className="font-semibold">{filteredTables.length}</span>
          <span className="text-gray-600 dark:text-gray-400">tables</span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="font-semibold">{zoom.toFixed(0)}%</span>
          <span className="text-gray-600 dark:text-gray-400">zoom</span>
        </div>
      </div>
    </div>
  );
}
