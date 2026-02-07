'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  Eye,
  EyeOff,
  Grid,
  Share2,
  List,
  Settings,
  Info,
  Palette,
  Maximize,
  Copy,
  Image as ImageIcon,
  FileText,
  BarChart3,
  Sparkles
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

interface PremiumERDiagramProps {
  tables: TableMetadata[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onTableClick: (tableName: string) => void;
}

export default function PremiumERDiagram({
  tables,
  zoom,
  onZoomChange,
  onTableClick
}: PremiumERDiagramProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [tablePositions, setTablePositions] = useState<Map<string, TablePosition>>(new Map());
  const [dragging, setDragging] = useState<{ table: string; offsetX: number; offsetY: number } | null>(null);
  const [pan, setPan] = useState({ x: 200, y: 150 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedTable, setHighlightedTable] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showRelationships, setShowRelationships] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'circular' | 'hierarchical'>('grid');
  const [colorTheme, setColorTheme] = useState<'blue' | 'purple' | 'green' | 'orange'>('blue');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTableDetails, setSelectedTableDetails] = useState<TableMetadata | null>(null);

  // Theme colors
  const themes = {
    blue: {
      gradient: ['#3b82f6', '#2563eb'],
      accent: '#3b82f6',
      light: '#dbeafe',
      dark: '#1e40af'
    },
    purple: {
      gradient: ['#a855f7', '#9333ea'],
      accent: '#a855f7',
      light: '#f3e8ff',
      dark: '#7e22ce'
    },
    green: {
      gradient: ['#10b981', '#059669'],
      accent: '#10b981',
      light: '#d1fae5',
      dark: '#047857'
    },
    orange: {
      gradient: ['#f59e0b', '#d97706'],
      accent: '#f59e0b',
      light: '#fef3c7',
      dark: '#b45309'
    }
  };

  const currentTheme = themes[colorTheme];

  // Constants
  const TABLE_WIDTH = 340;
  const TABLE_HEADER_HEIGHT = 50;
  const ROW_HEIGHT = 36;
  const COLUMN_MARGIN = 280;
  const ROW_MARGIN = 180;

  // Calculate positions
  useEffect(() => {
    const positions = new Map<string, TablePosition>();

    if (layoutMode === 'grid') {
      const tablesPerRow = Math.max(3, Math.ceil(Math.sqrt(tables.length)));
      tables.forEach((table, index) => {
        const row = Math.floor(index / tablesPerRow);
        const col = index % tablesPerRow;
        const x = col * (TABLE_WIDTH + COLUMN_MARGIN) + 150;
        const y = row * 450 + 150;
        const height = TABLE_HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + 15;
        positions.set(table.name, { x, y, width: TABLE_WIDTH, height });
      });
    } else if (layoutMode === 'circular') {
      const centerX = 1000;
      const centerY = 800;
      const radius = 600;
      const angleStep = (2 * Math.PI) / tables.length;
      tables.forEach((table, index) => {
        const angle = index * angleStep - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle) - TABLE_WIDTH / 2;
        const y = centerY + radius * Math.sin(angle);
        const height = TABLE_HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + 15;
        positions.set(table.name, { x, y, width: TABLE_WIDTH, height });
      });
    } else {
      const roots = tables.filter(t => !t.columns.some(c => c.isForeignKey));
      const children = tables.filter(t => t.columns.some(c => c.isForeignKey));
      let yOffset = 150;

      roots.forEach((table, index) => {
        const x = index * (TABLE_WIDTH + COLUMN_MARGIN) + 150;
        const height = TABLE_HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + 15;
        positions.set(table.name, { x, y: yOffset, width: TABLE_WIDTH, height });
      });

      yOffset += 550;
      children.forEach((table, index) => {
        const x = index * (TABLE_WIDTH + COLUMN_MARGIN) + 150;
        const height = TABLE_HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + 15;
        positions.set(table.name, { x, y: yOffset, width: TABLE_WIDTH, height });
      });
    }

    setTablePositions(positions);
  }, [tables, layoutMode]);

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.columns.some(col => col.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent, tableName: string) => {
    const pos = tablePositions.get(tableName);
    if (!pos) return;
    setDragging({
      table: tableName,
      offsetX: e.clientX - pos.x * zoom - pan.x,
      offsetY: e.clientY - pos.y * zoom - pan.y
    });
    const tableData = tables.find(t => t.name === tableName);
    setSelectedTable(tableName);
    setSelectedTableDetails(tableData || null);
    e.stopPropagation();
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !dragging) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedTable(null);
      setSelectedTableDetails(null);
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
    const scaleX = canvasWidth / (contentWidth + 300);
    const scaleY = canvasHeight / (contentHeight + 300);
    const newZoom = Math.min(scaleX, scaleY, 1);
    onZoomChange(newZoom);
    setPan({
      x: (canvasWidth - contentWidth * newZoom) / 2 - bounds.minX * newZoom,
      y: (canvasHeight - contentHeight * newZoom) / 2 - bounds.minY * newZoom
    });
  };

  const exportAsSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'er-diagram.svg';
    link.click();
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

          // Curved path
          const midX = (sourceX + targetX) / 2;
          const midY = (sourceY + targetY) / 2;
          const dx = targetX - sourceX;
          const dy = targetY - sourceY;
          const offset = 50;
          const controlX = midX - dy / Math.sqrt(dx * dx + dy * dy) * offset;
          const controlY = midY + dx / Math.sqrt(dx * dx + dy * dy) * offset;

          lines.push(
            <g key={`${table.name}-${column.name}`} opacity={isHighlighted ? 1 : 0.5}>
              <path
                d={`M ${sourceX} ${sourceY} Q ${controlX} ${controlY} ${targetX} ${targetY}`}
                fill="none"
                stroke={isHighlighted ? currentTheme.accent : '#94a3b8'}
                strokeWidth={isHighlighted ? '3' : '2'}
                strokeDasharray="10,5"
                markerEnd="url(#arrowhead)"
                className="transition-all duration-300"
              />
              <circle
                cx={controlX} cy={controlY} r="4"
                fill={currentTheme.accent}
                opacity={isHighlighted ? 0.8 : 0}
                className="transition-opacity duration-300"
              />
              <text
                x={controlX} y={controlY - 10}
                fill="#64748b" fontSize="12" textAnchor="middle"
                fontWeight="600"
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

  return (
    <div className={`relative h-full w-full ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Ultra Premium Toolbar */}
      <div className="absolute left-6 top-6 z-20 flex flex-col gap-3">
        {/* Search with glass effect */}
        <div className="group rounded-2xl border border-white/20 bg-white/80 p-3 shadow-2xl backdrop-blur-xl transition-all hover:bg-white/90 dark:border-gray-700/50 dark:bg-gray-900/80 dark:hover:bg-gray-900/90">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-hover:text-blue-500" />
            <input
              type="text"
              placeholder="Search tables or columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-72 rounded-xl border-0 bg-transparent py-3 pl-12 pr-4 text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white"
            />
            {searchTerm && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
                {filteredTables.length}
              </div>
            )}
          </div>
        </div>

        {/* Premium Controls */}
        <div className="flex gap-3">
          {/* Zoom */}
          <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/80 px-4 py-2 shadow-2xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/80">
            <button
              onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))}
              className="rounded-lg p-2 transition-all hover:bg-blue-500 hover:text-white"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={Math.round(zoom * 100)}
                onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
                className="w-14 rounded-lg border-0 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-center text-sm font-bold text-transparent focus:outline-none"
                min="10" max="200"
              />
              <span className="text-xs font-semibold text-gray-500">%</span>
            </div>
            <button
              onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
              className="rounded-lg p-2 transition-all hover:bg-blue-500 hover:text-white"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Actions */}
          <button
            onClick={handleFitToScreen}
            className="group rounded-2xl border border-white/20 bg-white/80 p-3 shadow-2xl backdrop-blur-xl transition-all hover:scale-105 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 dark:border-gray-700/50 dark:bg-gray-900/80"
            title="Fit to screen"
          >
            <Maximize2 className="h-5 w-5 transition-colors group-hover:text-white" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="group rounded-2xl border border-white/20 bg-white/80 p-3 shadow-2xl backdrop-blur-xl transition-all hover:scale-105 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 dark:border-gray-700/50 dark:bg-gray-900/80"
            title="Toggle fullscreen"
          >
            <Maximize className="h-5 w-5 transition-colors group-hover:text-white" />
          </button>
        </div>

        {/* Layout Modes - Premium Style */}
        <div className="flex gap-2 rounded-2xl border border-white/20 bg-white/80 p-2 shadow-2xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/80">
          {[
            { mode: 'grid', icon: Grid, label: 'Grid' },
            { mode: 'circular', icon: Share2, label: 'Circular' },
            { mode: 'hierarchical', icon: List, label: 'Hierarchy' }
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setLayoutMode(mode as any)}
              className={`group relative rounded-xl px-4 py-2.5 font-semibold transition-all ${
                layoutMode === mode
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={label}
            >
              <Icon className="h-5 w-5" />
              {layoutMode === mode && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-white"></span>
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Color Themes */}
        <div className="flex gap-2 rounded-2xl border border-white/20 bg-white/80 p-2 shadow-2xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/80">
          {(['blue', 'purple', 'green', 'orange'] as const).map(theme => (
            <button
              key={theme}
              onClick={() => setColorTheme(theme)}
              className={`group relative h-10 w-10 rounded-xl transition-all hover:scale-110 ${
                colorTheme === theme ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : ''
              }`}
              style={{
                background: `linear-gradient(135deg, ${themes[theme].gradient[0]}, ${themes[theme].gradient[1]})`,
                boxShadow: colorTheme === theme ? `0 4px 20px ${themes[theme].accent}40` : 'none'
              }}
              title={`${theme.charAt(0).toUpperCase() + theme.slice(1)} theme`}
            >
              {colorTheme === theme && (
                <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-white" />
              )}
            </button>
          ))}
        </div>

        {/* Toggle Features */}
        <div className="space-y-2 rounded-2xl border border-white/20 bg-white/80 p-2 shadow-2xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/80">
          {[
            { label: 'Relationships', state: showRelationships, setState: setShowRelationships, icon: Eye },
            { label: 'Minimap', state: showMinimap, setState: setShowMinimap, icon: BarChart3 },
            { label: 'Grid', state: showGrid, setState: setShowGrid, icon: Grid }
          ].map(({ label, state, setState, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setState(!state)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                state
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Export */}
        <button
          onClick={exportAsSVG}
          className="group flex items-center gap-3 rounded-2xl border border-white/20 bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 font-semibold text-white shadow-2xl backdrop-blur-xl transition-all hover:scale-105 hover:shadow-orange-500/50"
        >
          <Download className="h-5 w-5" />
          Export SVG
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="h-full w-full cursor-move overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950"
        style={{
          backgroundImage: showGrid
            ? 'radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px), radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)'
            : undefined,
          backgroundSize: showGrid ? '30px 30px, 30px 30px' : undefined,
          backgroundPosition: showGrid ? '0 0, 15px 15px' : undefined
        }}
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
          className="transition-transform duration-200"
        >
          <defs>
            <marker id="arrowhead" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
              <polygon points="0 0, 12 4, 0 8" fill={currentTheme.accent} />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="shadow">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.2" />
            </filter>
            <linearGradient id={`tableGradient-${colorTheme}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={currentTheme.gradient[0]} />
              <stop offset="100%" stopColor={currentTheme.gradient[1]} />
            </linearGradient>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {renderRelationships()}

            {filteredTables.map(table => {
              const pos = tablePositions.get(table.name);
              if (!pos) return null;

              const isHighlighted = highlightedTable === table.name;
              const isSelected = selectedTable === table.name;
              const hasFK = table.columns.some(c => c.isForeignKey);
              const hasPK = table.columns.some(c => c.isPrimaryKey);

              return (
                <g
                  key={table.name}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseDown={(e) => handleMouseDown(e as any, table.name)}
                  onMouseEnter={() => setHighlightedTable(table.name)}
                  onMouseLeave={() => setHighlightedTable(null)}
                  onClick={() => onTableClick(table.name)}
                  style={{ cursor: 'move' }}
                  className="transition-all duration-300"
                >
                  {/* Glow effect on select */}
                  {isSelected && (
                    <rect
                      x="-5" y="-5"
                      width={pos.width + 10}
                      height={pos.height + 10}
                      fill={currentTheme.accent}
                      opacity="0.2"
                      rx="16"
                      filter="url(#glow)"
                    />
                  )}

                  {/* Main container */}
                  <rect
                    width={pos.width}
                    height={pos.height}
                    fill="#1e293b"
                    stroke={isSelected ? currentTheme.accent : isHighlighted ? currentTheme.light : '#475569'}
                    strokeWidth={isSelected ? '4' : '2'}
                    rx="14"
                    filter="url(#shadow)"
                    className="transition-all duration-300"
                  />

                  {/* Premium gradient header */}
                  <rect
                    width={pos.width}
                    height={TABLE_HEADER_HEIGHT}
                    fill={`url(#tableGradient-${colorTheme})`}
                    rx="14"
                    filter={isHighlighted ? 'url(#glow)' : undefined}
                  />
                  <rect
                    width={pos.width}
                    height={TABLE_HEADER_HEIGHT / 2}
                    y={TABLE_HEADER_HEIGHT / 2}
                    fill={`url(#tableGradient-${colorTheme})`}
                  />

                  {/* Table type badges */}
                  <g transform="translate(12, 12)">
                    {!hasFK && hasPK && (
                      <g>
                        <rect width="50" height="20" fill="rgba(255,255,255,0.3)" rx="10" />
                        <text x="25" y="14" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">
                          ROOT
                        </text>
                      </g>
                    )}
                    {hasFK && (
                      <g transform={`translate(${!hasFK && hasPK ? 55 : 0}, 0)`}>
                        <rect width="45" height="20" fill="rgba(255,255,255,0.3)" rx="10" />
                        <text x="22" y="14" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">
                          REL
                        </text>
                      </g>
                    )}
                  </g>

                  {/* Table name */}
                  <text
                    x={pos.width / 2}
                    y={TABLE_HEADER_HEIGHT / 2 + 8}
                    fill="white"
                    fontSize="18"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="font-sans"
                  >
                    {table.name}
                  </text>

                  {/* Row count badge */}
                  {table.rowCount !== undefined && (
                    <g transform={`translate(${pos.width - 75}, ${TABLE_HEADER_HEIGHT - 28})`}>
                      <rect width="65" height="22" fill="rgba(255,255,255,0.25)" rx="11" />
                      <text x="32" y="15" fill="white" fontSize="11" textAnchor="middle" fontWeight="700">
                        {table.rowCount.toLocaleString()} rows
                      </text>
                    </g>
                  )}

                  {/* Columns with enhanced styling */}
                  {table.columns.map((column, index) => {
                    const y = TABLE_HEADER_HEIGHT + index * ROW_HEIGHT;
                    return (
                      <g key={column.name}>
                        <rect
                          x="0" y={y}
                          width={pos.width}
                          height={ROW_HEIGHT}
                          fill={index % 2 === 0 ? '#334155' : '#1e293b'}
                          className="transition-colors hover:fill-blue-50"
                        />

                        {/* Icon */}
                        <text x="18" y={y + ROW_HEIGHT / 2 + 6} fontSize="18">
                          {column.isPrimaryKey ? '🔑' : column.isForeignKey ? '🔗' : '•'}
                        </text>

                        {/* Column name */}
                        <text
                          x="50" y={y + ROW_HEIGHT / 2 + 6}
                          fontSize="14"
                          fontWeight={column.isPrimaryKey ? '700' : '500'}
                          fill="#f1f5f9"
                          className="font-mono"
                        >
                          {column.name}
                        </text>

                        {/* Type badge */}
                        <g transform={`translate(${pos.width - 110}, ${y + 8})`}>
                          <rect
                            width="95"
                            height="20"
                            fill={column.isPrimaryKey ? '#475569' : '#0f172a'}
                            rx="10"
                          />
                          <text
                            x="47" y="14"
                            fontSize="11"
                            fontWeight="600"
                            fill={column.isPrimaryKey ? '#f1f5f9' : '#94a3b8'}
                            textAnchor="middle"
                            className="font-mono"
                          >
                            {column.type}{!column.nullable ? ' *' : ''}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Premium Minimap */}
      {showMinimap && (
        <div className="absolute bottom-6 right-6 overflow-hidden rounded-2xl border-2 border-white/30 bg-white/90 p-3 shadow-2xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/90">
          <svg width="220" height="220" className="rounded-xl border border-gray-200 dark:border-gray-700">
            <rect width="220" height="220" fill="#0f172a" className="dark:fill-[#0f172a]" />
            {tables.map(table => {
              const pos = tablePositions.get(table.name);
              if (!pos) return null;
              const scale = 0.1;
              return (
                <rect
                  key={table.name}
                  x={pos.x * scale}
                  y={pos.y * scale}
                  width={pos.width * scale}
                  height={pos.height * scale}
                  fill={selectedTable === table.name ? currentTheme.accent : '#e5e7eb'}
                  stroke={currentTheme.accent}
                  strokeWidth="1"
                  rx="2"
                  className="transition-all"
                />
              );
            })}
          </svg>
          <p className="mt-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">
            📍 Navigation
          </p>
        </div>
      )}

      {/* Premium Stats Panel */}
      <div className="absolute bottom-6 left-6 flex items-center gap-4 rounded-2xl border border-white/20 bg-white/90 px-6 py-4 shadow-2xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/90">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Tables</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{filteredTables.length}</p>
          </div>
        </div>
        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Zoom</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(zoom * 100)}%</p>
          </div>
        </div>
      </div>

      {/* Table Details Panel */}
      {selectedTableDetails && (
        <div className="absolute right-6 top-6 w-80 rounded-2xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/95">
          <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">📊 Table Details</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="font-mono text-lg font-bold text-gray-900 dark:text-white">{selectedTableDetails.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Columns</p>
              <p className="text-2xl font-bold text-blue-600">{selectedTableDetails.columns.length}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Primary Keys</p>
              <p className="text-2xl font-bold text-green-600">
                {selectedTableDetails.columns.filter(c => c.isPrimaryKey).length}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Foreign Keys</p>
              <p className="text-2xl font-bold text-purple-600">
                {selectedTableDetails.columns.filter(c => c.isForeignKey).length}
              </p>
            </div>
            {selectedTableDetails.rowCount !== undefined && (
              <div>
                <p className="text-sm font-medium text-gray-500">Rows</p>
                <p className="text-2xl font-bold text-orange-600">
                  {selectedTableDetails.rowCount.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
