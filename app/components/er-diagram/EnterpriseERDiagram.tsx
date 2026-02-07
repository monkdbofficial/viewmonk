'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Eye,
  EyeOff,
  Grid3x3,
  Share2,
  List,
  Maximize,
  X,
  Settings,
  ChevronLeft,
  ChevronRight
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

interface EnterpriseERDiagramProps {
  tables: TableMetadata[];
  onTableClick: (tableName: string) => void;
}

export default function EnterpriseERDiagram({
  tables,
  onTableClick
}: EnterpriseERDiagramProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [tablePositions, setTablePositions] = useState<Map<string, TablePosition>>(new Map());
  const [dragging, setDragging] = useState<{ table: string; offsetX: number; offsetY: number } | null>(null);
  const [pan, setPan] = useState({ x: 300, y: 200 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showRelationships, setShowRelationships] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'circular' | 'hierarchical'>('grid');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [zoom, setZoom] = useState(1);

  const TABLE_WIDTH = 350;
  const TABLE_HEADER_HEIGHT = 56;
  const ROW_HEIGHT = 40;

  // Calculate positions
  useEffect(() => {
    const positions = new Map<string, TablePosition>();
    const tablesPerRow = Math.max(3, Math.ceil(Math.sqrt(tables.length)));

    tables.forEach((table, index) => {
      const row = Math.floor(index / tablesPerRow);
      const col = index % tablesPerRow;
      const x = col * (TABLE_WIDTH + 320) + 200;
      const y = row * 480 + 200;
      const height = TABLE_HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + 20;
      positions.set(table.name, { x, y, width: TABLE_WIDTH, height });
    });

    setTablePositions(positions);
  }, [tables, layoutMode]);

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    const scaleX = canvasWidth / (contentWidth + 400);
    const scaleY = canvasHeight / (contentHeight + 400);
    const newZoom = Math.min(scaleX, scaleY, 1);
    setZoom(newZoom);
    setPan({
      x: (canvasWidth - contentWidth * newZoom) / 2 - bounds.minX * newZoom,
      y: (canvasHeight - contentHeight * newZoom) / 2 - bounds.minY * newZoom
    });
  };

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

          const midX = (sourceX + targetX) / 2;
          const midY = (sourceY + targetY) / 2;

          lines.push(
            <g key={`${table.name}-${column.name}`}>
              <path
                d={`M ${sourceX} ${sourceY} Q ${midX} ${midY} ${targetX} ${targetY}`}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2.5"
                strokeDasharray="8,6"
                markerEnd="url(#arrowhead)"
                opacity="0.7"
              />
            </g>
          );
        }
      });
    });

    return lines;
  };

  return (
    <div className={`relative flex h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-950' : ''}`}>
      {/* Professional Sidebar */}
      <div
        className={`relative z-30 flex flex-col border-r border-gray-800 bg-gray-900 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-80'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-800 px-4">
          {!sidebarCollapsed && (
            <h3 className="text-sm font-semibold text-gray-200">Controls</h3>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto p-4">
            {/* Search */}
            <div className="mb-6">
              <label className="mb-2 block text-xs font-medium text-gray-400">Search Tables</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Type to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="mb-6">
              <label className="mb-2 block text-xs font-medium text-gray-400">Zoom</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={Math.round(zoom * 100)}
                  onChange={(e) => setZoom(Number(e.target.value) / 100)}
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-center text-sm font-semibold text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min="10"
                  max="200"
                />
                <span className="text-sm font-medium text-gray-400">%</span>
                <button
                  onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
              <label className="mb-2 block text-xs font-medium text-gray-400">Quick Actions</label>
              <div className="space-y-2">
                <button
                  onClick={handleFitToScreen}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
                >
                  <Maximize2 className="h-4 w-4" />
                  Fit to Screen
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
                >
                  <Maximize className="h-4 w-4" />
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </button>
              </div>
            </div>

            {/* Toggles */}
            <div className="mb-6">
              <label className="mb-2 block text-xs font-medium text-gray-400">Display Options</label>
              <div className="space-y-2">
                <button
                  onClick={() => setShowRelationships(!showRelationships)}
                  className={`flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium ${
                    showRelationships
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {showRelationships ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    Relationships
                  </span>
                  <div className={`h-2 w-2 rounded-full ${showRelationships ? 'bg-white' : 'bg-gray-600'}`} />
                </button>
                <button
                  onClick={() => setShowMinimap(!showMinimap)}
                  className={`flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium ${
                    showMinimap
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Grid3x3 className="h-4 w-4" />
                    Minimap
                  </span>
                  <div className={`h-2 w-2 rounded-full ${showMinimap ? 'bg-white' : 'bg-gray-600'}`} />
                </button>
              </div>
            </div>

            {/* Export */}
            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-3 text-sm font-semibold text-white hover:from-orange-500 hover:to-orange-400"
            >
              <Download className="h-4 w-4" />
              Export Diagram
            </button>
          </div>
        )}
      </div>

      {/* Main Canvas */}
      <div className="relative flex-1">
        <div
          ref={canvasRef}
          className="h-full w-full cursor-move overflow-hidden bg-gray-950"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox="0 0 4000 4000"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#60a5fa" />
              </marker>
              <filter id="shadow">
                <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.5" />
              </filter>
              <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {renderRelationships()}

              {filteredTables.map(table => {
                const pos = tablePositions.get(table.name);
                if (!pos) return null;

                const isSelected = selectedTable === table.name;

                return (
                  <g
                    key={table.name}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onMouseDown={(e) => handleMouseDown(e as any, table.name)}
                    onClick={() => onTableClick(table.name)}
                    style={{ cursor: 'move' }}
                  >
                    {/* Card Container */}
                    <rect
                      width={pos.width}
                      height={pos.height}
                      fill="#1e293b"
                      stroke={isSelected ? '#3b82f6' : '#334155'}
                      strokeWidth={isSelected ? '3' : '1.5'}
                      rx="12"
                      filter="url(#shadow)"
                    />

                    {/* Header */}
                    <rect
                      width={pos.width}
                      height={TABLE_HEADER_HEIGHT}
                      fill="url(#headerGradient)"
                      rx="12"
                    />
                    <rect
                      y={TABLE_HEADER_HEIGHT / 2}
                      width={pos.width}
                      height={TABLE_HEADER_HEIGHT / 2}
                      fill="url(#headerGradient)"
                    />

                    {/* Table Name */}
                    <text
                      x={pos.width / 2}
                      y={TABLE_HEADER_HEIGHT / 2 + 8}
                      fill="white"
                      fontSize="20"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {table.name}
                    </text>

                    {/* Columns */}
                    {table.columns.map((column, index) => {
                      const y = TABLE_HEADER_HEIGHT + index * ROW_HEIGHT;
                      return (
                        <g key={column.name}>
                          <rect
                            y={y}
                            width={pos.width}
                            height={ROW_HEIGHT}
                            fill={index % 2 === 0 ? '#0f172a' : '#1e293b'}
                          />

                          {/* Icon */}
                          <text x="20" y={y + ROW_HEIGHT / 2 + 8} fontSize="20">
                            {column.isPrimaryKey ? '🔑' : column.isForeignKey ? '🔗' : '•'}
                          </text>

                          {/* Column Name */}
                          <text
                            x="60"
                            y={y + ROW_HEIGHT / 2 + 6}
                            fontSize="16"
                            fontWeight={column.isPrimaryKey ? '700' : '500'}
                            fill="white"
                          >
                            {column.name}
                          </text>

                          {/* Type */}
                          <text
                            x={pos.width - 20}
                            y={y + ROW_HEIGHT / 2 + 6}
                            fontSize="14"
                            fill="#94a3b8"
                            textAnchor="end"
                          >
                            {column.type}
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
        {showMinimap && (
          <div className="absolute bottom-6 right-6 rounded-xl border-2 border-gray-700 bg-gray-900 p-3 shadow-2xl">
            <svg width="200" height="200" className="rounded-lg border border-gray-800">
              <rect width="200" height="200" fill="#0a0a0a" />
              {tables.map(table => {
                const pos = tablePositions.get(table.name);
                if (!pos) return null;
                return (
                  <rect
                    key={table.name}
                    x={pos.x * 0.08}
                    y={pos.y * 0.08}
                    width={pos.width * 0.08}
                    height={pos.height * 0.08}
                    fill={selectedTable === table.name ? '#3b82f6' : '#334155'}
                    stroke="#475569"
                    strokeWidth="0.5"
                    rx="1"
                  />
                );
              })}
            </svg>
            <p className="mt-2 text-center text-xs font-medium text-gray-400">Overview</p>
          </div>
        )}

        {/* Stats */}
        <div className="absolute bottom-6 left-6 flex items-center gap-4 rounded-xl border border-gray-700 bg-gray-900 px-6 py-3 shadow-2xl">
          <div className="text-center">
            <p className="text-xs text-gray-400">Tables</p>
            <p className="text-xl font-bold text-white">{filteredTables.length}</p>
          </div>
          <div className="h-8 w-px bg-gray-700" />
          <div className="text-center">
            <p className="text-xs text-gray-400">Zoom</p>
            <p className="text-xl font-bold text-white">{Math.round(zoom * 100)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
