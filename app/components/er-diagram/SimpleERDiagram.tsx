'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, ZoomIn, ZoomOut, Maximize2, Download, Eye, EyeOff, Grid3x3, Maximize } from 'lucide-react';
import html2canvas from 'html2canvas';
import ELK from 'elkjs/lib/elk.bundled.js';

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
}

interface TablePosition {
  x: number;
  y: number;
}

interface SimpleERDiagramProps {
  tables: TableMetadata[];
  onTableClick: (tableName: string) => void;
}

export default function SimpleERDiagram({ tables, onTableClick }: SimpleERDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Map<string, TablePosition>>(new Map());
  const [dragging, setDragging] = useState<{ table: string; offsetX: number; offsetY: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showRelationships, setShowRelationships] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [edgeRoutes, setEdgeRoutes] = useState<Map<string, { points: { x: number; y: number }[] }>>(new Map());
  const [hoveredRelationship, setHoveredRelationship] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filter tables - MUST be defined before useEffect that uses it
  // Use useMemo to prevent unnecessary re-renders
  const filteredTables = useMemo(
    () => tables.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [tables, searchTerm]
  );

  // Initialize table positions in a compact grid (will be overridden by ELK layout)
  useEffect(() => {
    const newPositions = new Map<string, TablePosition>();
    const cols = Math.ceil(Math.sqrt(tables.length));

    tables.forEach((table, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      newPositions.set(table.name, {
        x: col * 350 + 50,
        y: row * 280 + 50
      });
    });

    setPositions(newPositions);
  }, [tables]);

  // Calculate optimal layout and edge routes using ELK (runs only when tables change)
  useEffect(() => {
    const calculateLayout = async () => {
      if (filteredTables.length === 0) {
        return;
      }

      const elk = new ELK();

      // Build ELK graph - start with current positions or defaults
      const elkNodes = filteredTables.map(table => {
        const pos = positions.get(table.name) || { x: 0, y: 0 };
        const tableHeight = 48 + table.columns.length * 32 + 30;
        return {
          id: table.name,
          width: 280,
          height: tableHeight
        };
      });

      const elkEdges: any[] = [];
      filteredTables.forEach(table => {
        table.columns.forEach((col, colIdx) => {
          if (!col.isForeignKey || !col.references) return;

          const targetTable = filteredTables.find(t => t.name === col.references!.table);
          if (!targetTable) return;

          let pkIdx = targetTable.columns.findIndex(c => c.isPrimaryKey);

          // Fallback: if no PK detected, assume 'id' column is PK
          if (pkIdx < 0) {
            pkIdx = targetTable.columns.findIndex(c => c.name.toLowerCase() === 'id');
          }

          if (pkIdx < 0) return;

          elkEdges.push({
            id: `${table.name}-${col.name}`,
            sources: [table.name],
            targets: [col.references.table]
          });
        });
      });

      const graph = {
        id: 'root',
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'RIGHT',
          'elk.edgeRouting': 'ORTHOGONAL',
          'elk.layered.nodePlacement.strategy': 'SIMPLE',
          'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'elk.layered.crossingMinimization.greedySwitch': 'TWO_SIDED',
          'elk.spacing.nodeNode': '150',
          'elk.spacing.edgeNode': '80',
          'elk.spacing.edgeEdge': '50',
          'elk.layered.spacing.edgeNodeBetweenLayers': '100',
          'elk.layered.spacing.nodeNodeBetweenLayers': '150',
          'elk.layered.thoroughness': '100',
          'elk.separateConnectedComponents': 'false',
          'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
          'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        },
        children: elkNodes,
        edges: elkEdges
      };

      try {
        const layouted = await elk.layout(graph);

        // Extract node positions
        const newPositions = new Map<string, TablePosition>();
        layouted.children?.forEach(node => {
          if (node.x !== undefined && node.y !== undefined) {
            newPositions.set(node.id, { x: node.x + 50, y: node.y + 50 }); // Add padding
          }
        });

        // Only update positions if we got valid layout
        if (newPositions.size > 0) {
          setPositions(newPositions);
        }

        // Extract edge routes
        const routes = new Map<string, { points: { x: number; y: number }[] }>();

        layouted.edges?.forEach(edge => {
          if (edge.sections && edge.sections.length > 0) {
            const section = edge.sections[0];
            const points = [];

            // Start point
            points.push({ x: section.startPoint.x + 50, y: section.startPoint.y + 50 });

            // Bend points
            if (section.bendPoints) {
              section.bendPoints.forEach((bp: any) => {
                points.push({ x: bp.x + 50, y: bp.y + 50 });
              });
            }

            // End point
            points.push({ x: section.endPoint.x + 50, y: section.endPoint.y + 50 });

            routes.set(edge.id, { points });
          }
        });

        setEdgeRoutes(routes);
        console.log('✅ ELK layout complete:', {
          nodes: newPositions.size,
          edges: routes.size
        });
      } catch (error) {
        console.error('❌ ELK layout failed:', error);
      }
    };

    calculateLayout();
  }, [filteredTables]);

  // Zoom handlers
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const handleResetView = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  // Export diagram as SVG with proper styling
  const handleExport = () => {
    try {
      // Calculate diagram bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      filteredTables.forEach(table => {
        const pos = positions.get(table.name);
        if (!pos) return;
        const tableHeight = 48 + table.columns.length * 32 + 30;
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + 280);
        maxY = Math.max(maxY, pos.y + tableHeight);
      });

      const padding = 50;
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;

      // Create SVG content with gradients
      let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX - padding} ${minY - padding} ${width} ${height}">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
      <polygon points="0 0, 10 5, 0 10" fill="#3b82f6" />
    </marker>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect x="${minX - padding}" y="${minY - padding}" width="${width}" height="${height}" fill="#0a0a0a"/>

  <!-- Tables -->
  <g id="tables">`;
      filteredTables.forEach(table => {
        const pos = positions.get(table.name);
        if (!pos) return;

        const tableHeight = 48 + table.columns.length * 32 + 30;

        svgContent += `  <g transform="translate(${pos.x}, ${pos.y})">
    <!-- Table container -->
    <rect width="280" height="${tableHeight}" rx="12" fill="#1e293b" stroke="#374151" stroke-width="2"/>

    <!-- Header -->
    <rect width="280" height="48" rx="12" fill="url(#headerGrad)"/>
    <text x="140" y="30" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${table.name}</text>

    <!-- Columns -->
`;

        table.columns.forEach((col, idx) => {
          const y = 48 + idx * 32;
          const isEven = idx % 2 === 0;

          // Row background
          svgContent += `    <rect y="${y}" width="280" height="32" fill="${isEven ? '#1f2937' : '#111827'}" opacity="0.8"/>\n`;

          // Column name with icon
          const icon = col.isPrimaryKey ? '🔑' : col.isForeignKey ? '🔗' : '●';
          const color = col.isPrimaryKey ? '#facc15' : col.isForeignKey ? '#22d3ee' : '#f3f4f6';

          svgContent += `    <text x="10" y="${y + 20}" fill="${color}" font-size="11" font-weight="600">${icon} ${col.name}</text>\n`;

          // Type badge
          svgContent += `    <text x="270" y="${y + 20}" text-anchor="end" fill="#9ca3af" font-size="10" font-family="monospace">${col.type.toLowerCase()}</text>\n`;

          // FK indicator dot
          if (col.isForeignKey) {
            svgContent += `    <circle cx="275" cy="${y + 16}" r="3" fill="#3b82f6" stroke="white" stroke-width="2"/>\n`;
          }

          // PK/FK badges
          if (col.isPrimaryKey) {
            svgContent += `    <rect x="60" y="${y + 12}" width="18" height="12" rx="2" fill="#facc15" opacity="0.2"/>\n`;
            svgContent += `    <text x="69" y="${y + 20}" text-anchor="middle" fill="#facc15" font-size="8" font-weight="bold">PK</text>\n`;
          }
          if (col.isForeignKey) {
            svgContent += `    <rect x="82" y="${y + 12}" width="16" height="12" rx="2" fill="#3b82f6" opacity="0.2"/>\n`;
            svgContent += `    <text x="90" y="${y + 20}" text-anchor="middle" fill="#3b82f6" font-size="8" font-weight="bold">FK</text>\n`;
          }
        });

        // Stats footer
        const pkCount = table.columns.filter(c => c.isPrimaryKey).length;
        const fkCount = table.columns.filter(c => c.isForeignKey).length;
        const reqCount = table.columns.filter(c => !c.nullable).length;
        const footerY = 48 + table.columns.length * 32;

        svgContent += `    <rect y="${footerY}" width="280" height="30" fill="#111827" opacity="0.6"/>
    <text x="10" y="${footerY + 18}" fill="#facc15" font-size="10">🔑 ${pkCount} PK</text>
    <text x="70" y="${footerY + 18}" fill="#3b82f6" font-size="10">🔗 ${fkCount} FK</text>
    <text x="130" y="${footerY + 18}" fill="#ef4444" font-size="10">★ ${reqCount} Req</text>
    <text x="270" y="${footerY + 18}" text-anchor="end" fill="#6b7280" font-size="10">${table.columns.length} cols</text>
`;

        svgContent += `  </g>\n`;
      });

      svgContent += `  </g>\n\n  <!-- Connection Lines (on top) -->\n  <g id="connections">\n`;

      // Add connection lines with WORKING calculations
      filteredTables.forEach(table => {
        const sourcePos = positions.get(table.name);
        if (!sourcePos) return;

        table.columns.forEach((col, colIdx) => {
          if (!col.isForeignKey || !col.references) return;

          const targetTable = filteredTables.find(t => t.name === col.references!.table);
          if (!targetTable) return;

          const targetPos = positions.get(col.references!.table);
          if (!targetPos) return;

          // Find PK row index in target table
          const pkIdx = targetTable.columns.findIndex(c => c.isPrimaryKey);

          // Row measurements
          const headerH = 48;
          const rowH = 32;
          const borderW = 2;

          // Calculate positions
          const x1 = sourcePos.x + 280;
          const x2 = targetPos.x;

          // Use row-based Y if valid, otherwise center
          let y1, y2;
          if (colIdx >= 0 && colIdx < table.columns.length) {
            y1 = sourcePos.y + borderW + headerH + (colIdx * rowH) + (rowH / 2);
          } else {
            y1 = sourcePos.y + 100; // Fallback to center
          }

          if (pkIdx >= 0 && pkIdx < targetTable.columns.length) {
            y2 = targetPos.y + borderW + headerH + (pkIdx * rowH) + (rowH / 2);
          } else {
            y2 = targetPos.y + 100; // Fallback to center
          }

          // Smart routing: check if path would intersect other tables
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;

          let needsRouting = false;
          for (const otherTable of filteredTables) {
            if (otherTable.name === table.name || otherTable.name === col.references.table) continue;

            const otherPos = positions.get(otherTable.name);
            if (!otherPos) continue;

            const tableHeight = 48 + otherTable.columns.length * 32 + 30;

            // Check if path midpoint would intersect this table
            if (midX >= otherPos.x - 20 && midX <= otherPos.x + 300 &&
                midY >= otherPos.y - 20 && midY <= otherPos.y + tableHeight + 20) {
              needsRouting = true;
              break;
            }
          }

          svgContent += `    <!-- ${table.name}.${col.name} -> ${col.references.table} -->\n`;

          if (needsRouting) {
            // Route around obstacles
            const offset = 100;
            const routeY = Math.min(y1, y2) - offset;

            svgContent += `    <path d="M ${x1} ${y1} C ${x1 + 60} ${y1}, ${x1 + 60} ${routeY}, ${x1 + 120} ${routeY} L ${x2 - 120} ${routeY} C ${x2 - 60} ${routeY}, ${x2 - 60} ${y2}, ${x2} ${y2}" stroke="#3b82f6" stroke-width="2.5" fill="none" opacity="0.8"/>\n`;
          } else {
            // Direct smooth curve
            const dx = x2 - x1;
            const cx1 = x1 + dx * 0.5;
            const cy1 = y1;
            const cx2 = x2 - dx * 0.5;
            const cy2 = y2;

            svgContent += `    <path d="M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}" stroke="#3b82f6" stroke-width="2.5" fill="none" opacity="0.8"/>\n`;
          }

          svgContent += `    <polygon points="${x2},${y2} ${x2+8},${y2-4} ${x2+8},${y2+4}" fill="#3b82f6" opacity="0.8"/>\n`;
        });
      });

      svgContent += `  </g>\n</svg>`;

      // Download SVG
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `er-diagram-${new Date().getTime()}.svg`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Export diagram as PNG
  const handleExportPNG = () => {
    try {
      // Calculate diagram bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      filteredTables.forEach(table => {
        const pos = positions.get(table.name);
        if (!pos) return;
        const tableHeight = 48 + table.columns.length * 32 + 30;
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + 280);
        maxY = Math.max(maxY, pos.y + tableHeight);
      });

      const padding = 50;
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;

      // Create SVG content with standard colors
      let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX - padding} ${minY - padding} ${width} ${height}">
  <defs>
    <linearGradient id="headerGrad-png" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect x="${minX - padding}" y="${minY - padding}" width="${width}" height="${height}" fill="#0a0a0a"/>
  <g id="tables">`;

      filteredTables.forEach(table => {
        const pos = positions.get(table.name);
        if (!pos) return;

        const tableHeight = 48 + table.columns.length * 32 + 30;

        svgContent += `  <g transform="translate(${pos.x}, ${pos.y})">
    <rect width="280" height="${tableHeight}" rx="12" fill="#1e293b" stroke="#374151" stroke-width="2"/>
    <rect width="280" height="48" rx="12" fill="url(#headerGrad-png)"/>
    <text x="140" y="30" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${table.name}</text>
`;

        table.columns.forEach((col, idx) => {
          const y = 48 + idx * 32;
          const isEven = idx % 2 === 0;
          svgContent += `    <rect y="${y}" width="280" height="32" fill="${isEven ? '#1f2937' : '#111827'}" opacity="0.8"/>\n`;
          const icon = col.isPrimaryKey ? '🔑' : col.isForeignKey ? '🔗' : '●';
          const color = col.isPrimaryKey ? '#facc15' : col.isForeignKey ? '#22d3ee' : '#f3f4f6';
          svgContent += `    <text x="10" y="${y + 20}" fill="${color}" font-size="11" font-weight="600">${icon} ${col.name}</text>\n`;
          svgContent += `    <text x="270" y="${y + 20}" text-anchor="end" fill="#9ca3af" font-size="10" font-family="monospace">${col.type.toLowerCase()}</text>\n`;
          if (col.isForeignKey) {
            svgContent += `    <circle cx="275" cy="${y + 16}" r="3" fill="#3b82f6" stroke="white" stroke-width="2"/>\n`;
          }
          if (col.isPrimaryKey) {
            svgContent += `    <rect x="60" y="${y + 12}" width="18" height="12" rx="2" fill="#facc15" opacity="0.2"/>\n`;
            svgContent += `    <text x="69" y="${y + 20}" text-anchor="middle" fill="#facc15" font-size="8" font-weight="bold">PK</text>\n`;
          }
          if (col.isForeignKey) {
            svgContent += `    <rect x="82" y="${y + 12}" width="16" height="12" rx="2" fill="#3b82f6" opacity="0.2"/>\n`;
            svgContent += `    <text x="90" y="${y + 20}" text-anchor="middle" fill="#3b82f6" font-size="8" font-weight="bold">FK</text>\n`;
          }
        });

        const pkCount = table.columns.filter(c => c.isPrimaryKey).length;
        const fkCount = table.columns.filter(c => c.isForeignKey).length;
        const reqCount = table.columns.filter(c => !c.nullable).length;
        const footerY = 48 + table.columns.length * 32;

        svgContent += `    <rect y="${footerY}" width="280" height="30" fill="#111827" opacity="0.6"/>
    <text x="10" y="${footerY + 18}" fill="#facc15" font-size="10">🔑 ${pkCount} PK</text>
    <text x="70" y="${footerY + 18}" fill="#3b82f6" font-size="10">🔗 ${fkCount} FK</text>
    <text x="130" y="${footerY + 18}" fill="#ef4444" font-size="10">★ ${reqCount} Req</text>
    <text x="270" y="${footerY + 18}" text-anchor="end" fill="#6b7280" font-size="10">${table.columns.length} cols</text>
  </g>\n`;
      });

      svgContent += `  </g>\n  <g id="connections">\n`;

      filteredTables.forEach(table => {
        const sourcePos = positions.get(table.name);
        if (!sourcePos) return;

        table.columns.forEach((col, colIdx) => {
          if (!col.isForeignKey || !col.references) return;

          const targetTable = filteredTables.find(t => t.name === col.references!.table);
          if (!targetTable) return;

          const targetPos = positions.get(col.references!.table);
          if (!targetPos) return;

          const pkIdx = targetTable.columns.findIndex(c => c.isPrimaryKey);
          const headerH = 48;
          const rowH = 32;
          const borderW = 2;

          const x1 = sourcePos.x + 280;
          const x2 = targetPos.x;
          const y1 = sourcePos.y + borderW + headerH + (colIdx * rowH) + (rowH / 2);
          const y2 = pkIdx >= 0 ? targetPos.y + borderW + headerH + (pkIdx * rowH) + (rowH / 2) : targetPos.y + 100;

          const dx = x2 - x1;
          const cx1 = x1 + dx * 0.5;
          const cy1 = y1;
          const cx2 = x2 - dx * 0.5;
          const cy2 = y2;

          svgContent += `    <path d="M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}" stroke="#3b82f6" stroke-width="2.5" fill="none" opacity="0.8"/>\n`;
          svgContent += `    <polygon points="${x2},${y2} ${x2+8},${y2-4} ${x2+8},${y2+4}" fill="#3b82f6" opacity="0.8"/>\n`;
        });
      });

      svgContent += `  </g>\n</svg>`;

      // Convert SVG to PNG using canvas
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (!blob) {
            alert('Failed to generate PNG');
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `er-diagram-${new Date().getTime()}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }, 'image/png');
      };

      img.onerror = () => {
        alert('Failed to load SVG image');
      };

      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      img.src = svgUrl;

    } catch (error) {
      console.error('PNG export failed:', error);
      alert(`PNG export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Toggle fullscreen mode
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Table drag handlers
  const handleTableMouseDown = (e: React.MouseEvent, tableName: string) => {
    e.stopPropagation();
    const pos = positions.get(tableName);
    if (!pos) return;

    setDragging({
      table: tableName,
      offsetX: e.clientX / scale - pos.x,
      offsetY: e.clientY / scale - pos.y
    });
    setSelectedTable(tableName);
  };

  // Canvas pan handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !dragging) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      const newX = e.clientX / scale - dragging.offsetX;
      const newY = e.clientY / scale - dragging.offsetY;
      setPositions(prev => new Map(prev).set(dragging.table, { x: newX, y: newY }));
    } else if (isPanning) {
      setTranslate({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setIsPanning(false);
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-950">
      {/* Enhanced Toolbar with Premium Styling */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-6 py-3.5 shadow-xl">
        <div className="flex items-center gap-3">
          {/* Premium Search Bar */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-400" />
            <input
              type="text"
              placeholder="Search tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 backdrop-blur-sm transition-all focus:border-blue-500 focus:bg-gray-50 dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Enhanced Zoom Controls */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 backdrop-blur-sm">
            <button onClick={handleZoomOut} className="p-2.5 text-gray-500 dark:text-gray-400 transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white active:scale-95">
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[65px] text-center text-sm font-bold text-gray-900 dark:text-white">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={handleZoomIn} className="p-2.5 text-gray-500 dark:text-gray-400 transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white active:scale-95">
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Enhanced Reset Button */}
          <button
            onClick={handleResetView}
            className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white backdrop-blur-sm transition-all hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/70 active:scale-95"
          >
            <Maximize2 className="h-4 w-4" />
            Reset View
          </button>

          {/* Enhanced Toggle Buttons */}
          <button
            onClick={() => setShowRelationships(!showRelationships)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
              showRelationships
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                : 'border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 backdrop-blur-sm hover:border-gray-400 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {showRelationships ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            Links
          </button>

          <button
            onClick={() => setShowMinimap(!showMinimap)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
              showMinimap
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                : 'border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 backdrop-blur-sm hover:border-gray-400 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Grid3x3 className="h-4 w-4" />
            Map
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Enhanced Table Count Badge */}
          <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gradient-to-br from-gray-100 to-gray-100/50 dark:from-gray-800 dark:to-gray-800/50 px-5 py-2.5 shadow-lg backdrop-blur-sm">
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {filteredTables.length} <span className="font-normal text-gray-600 dark:text-gray-400">Tables</span>
            </span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={handleToggleFullscreen}
            className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white backdrop-blur-sm transition-all hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/70 active:scale-95"
          >
            <Maximize className="h-4 w-4" />
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>

          {/* Export Buttons */}
          <button
            onClick={handleExportPNG}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-green-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-500/30 transition-all hover:from-green-500 hover:to-green-400 active:scale-95"
          >
            <Download className="h-4 w-4" />
            PNG
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:from-orange-500 hover:to-orange-400 active:scale-95"
          >
            <Download className="h-4 w-4" />
            SVG
          </button>
        </div>
      </div>

      {/* Enhanced Canvas with Grid Background */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden bg-gray-50 dark:bg-gray-950"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isPanning ? 'grabbing' : dragging ? 'default' : 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          backgroundPosition: `${translate.x}px ${translate.y}px`
        }}
      >
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: '5000px',
            height: '5000px',
            position: 'relative',
            transition: dragging || isPanning ? 'none' : 'transform 0.3s ease-out'
          }}
        >
          {/* PROPERLY CONNECTED Relationship Lines - DEBUG MODE */}
          {showRelationships && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '5000px',
                height: '5000px',
                pointerEvents: 'none',
                overflow: 'visible',
                zIndex: 100
              }}
            >
              <defs>
                {/* Crow's foot notation markers - professional ER diagram style */}

                {/* One side (PK side) - single line */}
                <marker
                  id="one"
                  markerWidth="12"
                  markerHeight="12"
                  refX="0"
                  refY="6"
                  orient="auto"
                >
                  <line x1="0" y1="0" x2="0" y2="12" stroke="#3b82f6" strokeWidth="2" />
                </marker>

                {/* Many side (FK side) - crow's foot */}
                <marker
                  id="many"
                  markerWidth="16"
                  markerHeight="16"
                  refX="16"
                  refY="8"
                  orient="auto"
                >
                  <path
                    d="M 16 8 L 0 0 M 16 8 L 0 8 M 16 8 L 0 16"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    fill="none"
                  />
                </marker>

                {/* Hover states */}
                <marker
                  id="one-hover"
                  markerWidth="12"
                  markerHeight="12"
                  refX="0"
                  refY="6"
                  orient="auto"
                >
                  <line x1="0" y1="0" x2="0" y2="12" stroke="#60a5fa" strokeWidth="3" />
                </marker>

                <marker
                  id="many-hover"
                  markerWidth="18"
                  markerHeight="18"
                  refX="18"
                  refY="9"
                  orient="auto"
                >
                  <path
                    d="M 18 9 L 0 0 M 18 9 L 0 9 M 18 9 L 0 18"
                    stroke="#60a5fa"
                    strokeWidth="3"
                    fill="none"
                  />
                </marker>
              </defs>

              {/* Row-to-row with working Y as fallback */}
              {filteredTables.flatMap(table => {
                const sourcePos = positions.get(table.name);
                if (!sourcePos) return [];

                // Get all FK columns in this table to calculate offsets
                const fkColumns = table.columns.filter(col => col.isForeignKey && col.references);

                if (fkColumns.length > 1) {
                  console.log(`📊 Table '${table.name}' has ${fkColumns.length} FKs:`, fkColumns.map(c => `${c.name} -> ${c.references?.table}`));
                }

                return fkColumns.map((fkCol, fkIndex) => {
                    const targetPos = positions.get(fkCol.references!.table);
                    if (!targetPos) return null;

                    // Find FK column row index
                    const fkRowIndex = table.columns.findIndex(c => c.name === fkCol.name);

                    // Find target table and PK row index
                    const targetTable = filteredTables.find(t => t.name === fkCol.references!.table);
                    if (!targetTable) return null;
                    const pkRowIndex = targetTable.columns.findIndex(c => c.isPrimaryKey);

                    // Component measurements
                    const headerH = 48;
                    const rowH = 32;
                    const borderW = 2;

                    // No offset - line starts exactly from the FK column row
                    // User-friendly: RIGHT edge to LEFT edge
                    const x1 = sourcePos.x + 280; // RIGHT edge - line starts here
                    const y1 = fkRowIndex >= 0
                      ? sourcePos.y + borderW + headerH + (fkRowIndex * rowH) + (rowH / 2)
                      : sourcePos.y + 100; // Fallback to center

                    const x2 = targetPos.x; // LEFT edge - line ends here
                    const y2 = pkRowIndex >= 0
                      ? targetPos.y + borderW + headerH + (pkRowIndex * rowH) + (rowH / 2)
                      : targetPos.y + 100; // Fallback to center

                    const relationshipKey = `${table.name}.${fkCol.name}->${fkCol.references!.table}`;
                    const isHighlighted = selectedTable === table.name || selectedTable === fkCol.references!.table;
                    const isHovered = hoveredRelationship === relationshipKey;

                    // Use ELK-calculated route for clean orthogonal routing
                    const edgeId = `${table.name}-${fkCol.name}`;
                    const elkRoute = edgeRoutes.get(edgeId);

                    let pathD;
                    if (elkRoute && elkRoute.points.length >= 2) {
                      // Clean professional routing - straight lines with sharp corners
                      pathD = `M ${x1} ${y1}`;

                      // Draw through all ELK points with straight lines
                      const firstPoint = elkRoute.points[0];
                      pathD += ` L ${firstPoint.x} ${y1}`;
                      if (Math.abs(firstPoint.y - y1) > 1) {
                        pathD += ` L ${firstPoint.x} ${firstPoint.y}`;
                      }

                      // Straight lines through bend points
                      for (let i = 1; i < elkRoute.points.length; i++) {
                        const point = elkRoute.points[i];
                        pathD += ` L ${point.x} ${point.y}`;
                      }

                      // Final segments
                      const lastPoint = elkRoute.points[elkRoute.points.length - 1];
                      if (Math.abs(lastPoint.y - y2) > 1) {
                        pathD += ` L ${lastPoint.x} ${y2}`;
                      }
                      pathD += ` L ${x2} ${y2}`;
                    } else {
                      // Simple clean path
                      const midX = (x1 + x2) / 2;
                      pathD = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
                    }

                    return (
                      <g key={`${table.name}-${fkCol.name}`}>
                        {/* Invisible thicker path for easier hovering */}
                        <path
                          d={pathD}
                          stroke="transparent"
                          strokeWidth="20"
                          fill="none"
                          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                          onMouseEnter={() => setHoveredRelationship(relationshipKey)}
                          onMouseLeave={() => setHoveredRelationship(null)}
                        />
                        {/* Clean path - dot shows FK side, marker shows PK side */}
                        <path
                          d={pathD}
                          stroke={isHovered ? "#60a5fa" : "#3b82f6"}
                          strokeWidth={isHovered ? "2" : "1.5"}
                          markerEnd={isHovered ? "url(#one-hover)" : "url(#one)"}
                          opacity={hoveredRelationship && !isHovered ? "0.2" : isHovered ? "1" : "0.75"}
                          fill="none"
                          strokeLinecap="square"
                          strokeLinejoin="miter"
                          style={{
                            pointerEvents: 'none',
                            transition: 'all 0.15s ease'
                          }}
                        />
                        {/* Compact label on hover - professional style */}
                        {isHovered && (
                          <g>
                            <rect
                              x={(x1 + x2) / 2 - 85}
                              y={(y1 + y2) / 2 - 15}
                              width="170"
                              height="30"
                              rx="4"
                              fill="#1e293b"
                              stroke="#60a5fa"
                              strokeWidth="2"
                              opacity="0.98"
                              style={{ pointerEvents: 'none' }}
                            />
                            <text
                              x={(x1 + x2) / 2}
                              y={(y1 + y2) / 2 + 5}
                              textAnchor="middle"
                              fill="#60a5fa"
                              fontSize="12"
                              fontWeight="600"
                              style={{ pointerEvents: 'none' }}
                            >
                              {table.name}.{fkCol.name} → {fkCol.references!.table}.{fkCol.references!.column}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })
                  .filter(Boolean);
              })}
            </svg>
          )}

          {/* Render tables */}
          {filteredTables.map(table => {
            const pos = positions.get(table.name);
            if (!pos) return null;

            return (
              <div
                key={table.name}
                className={`absolute rounded-xl border-2 shadow-2xl transition-all duration-300 bg-white dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 ${
                  selectedTable === table.name
                    ? 'border-blue-400 shadow-blue-500/50 scale-105 z-50'
                    : 'border-gray-300 dark:border-gray-700 hover:border-blue-500/50 hover:shadow-blue-500/20 hover:scale-[1.02]'
                } ${
                  dragging?.table === table.name
                    ? 'cursor-grabbing shadow-blue-600/60 ring-2 ring-blue-400/50'
                    : 'cursor-grab'
                }`}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: 280,
                  willChange: dragging?.table === table.name ? 'transform' : 'auto',
                  userSelect: 'none',
                  WebkitUserSelect: 'none'
                }}
                onMouseDown={(e) => handleTableMouseDown(e, table.name)}
                onClick={() => onTableClick(table.name)}
              >
                {/* Compact Header - EXACTLY 48px */}
                <div className="relative overflow-hidden rounded-t-lg bg-gradient-to-br from-blue-600 to-blue-500 px-3 py-2 shadow-lg flex items-center" style={{ height: '48px', minHeight: '48px', maxHeight: '48px' }}>
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 flex-shrink-0">
                      <span className="text-xs">📊</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">
                        {table.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-blue-100">
                        <span>{table.columns.length} cols</span>
                        <span>•</span>
                        <span>{table.columns.filter(c => c.isPrimaryKey).length} PK</span>
                        <span>•</span>
                        <span>{table.columns.filter(c => c.isForeignKey).length} FK</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compact Columns */}
                <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-gray-200 dark:scrollbar-track-gray-900 scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-700">
                  {table.columns.map((col, idx) => {
                    const isLast = idx === table.columns.length - 1;
                    const relationshipKey = col.isForeignKey && col.references
                      ? `${table.name}.${col.name}->${col.references.table}`
                      : null;
                    const isRelationshipHovered = relationshipKey === hoveredRelationship;

                    return (
                      <div
                        key={col.name}
                        className={`group relative flex items-center justify-between border-b border-gray-200 dark:border-gray-800/50 px-2.5 transition-all ${
                          isRelationshipHovered ? 'bg-blue-500/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700/30'
                        } ${
                          idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/40' : 'bg-white dark:bg-gray-900/40'
                        } ${isLast ? 'border-b-0' : ''}`}
                        style={{ height: '32px' }}
                      >
                        {/* Left indicator */}
                        <div className={`absolute left-0 top-0 h-full w-0.5 ${
                          col.isPrimaryKey ? 'bg-yellow-400' : col.isForeignKey ? 'bg-blue-400' : 'bg-transparent'
                        }`} />

                        {/* Connection indicator on RIGHT for FK - where line starts */}
                        {col.isForeignKey && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
                            <div className={`h-3 w-3 rounded-full border-2 border-white shadow-lg transition-all ${
                              isRelationshipHovered ? 'bg-blue-300 scale-150 shadow-blue-400/50' : 'bg-blue-400'
                            }`}></div>
                          </div>
                        )}

                        {/* Column Info */}
                        <div className="flex items-center gap-2 pl-1 min-w-0 flex-1">
                          {/* Icon */}
                          <div className={`flex h-5 w-5 items-center justify-center rounded ${
                            col.isPrimaryKey
                              ? 'bg-yellow-500/20 text-yellow-500 dark:text-yellow-400'
                              : col.isForeignKey
                              ? 'bg-blue-500/20 text-blue-500 dark:text-blue-400'
                              : 'bg-gray-400/20 dark:bg-gray-600/20 text-gray-600 dark:text-gray-400'
                          }`}>
                            <span className="text-[10px]">
                              {col.isPrimaryKey ? '🔑' : col.isForeignKey ? '🔗' : '●'}
                            </span>
                          </div>

                          {/* Column Name */}
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className={`text-xs font-semibold truncate ${
                                col.isPrimaryKey ? 'text-yellow-600 dark:text-yellow-400' : col.isForeignKey ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-700 dark:text-gray-100'
                              }`}>
                                {col.name}
                              </span>
                              {col.isPrimaryKey && (
                                <span className="rounded bg-yellow-500/20 px-1 py-0.5 text-[8px] font-bold text-yellow-600 dark:text-yellow-400">PK</span>
                              )}
                              {col.isForeignKey && (
                                <span className="rounded bg-blue-500/20 px-1 py-0.5 text-[8px] font-bold text-blue-600 dark:text-blue-400">FK</span>
                              )}
                              {!col.nullable && (
                                <span className="text-red-500 dark:text-red-400 text-[10px]">*</span>
                              )}
                            </div>
                            {/* FK reference */}
                            {col.isForeignKey && col.references && (
                              <span className="text-[9px] text-cyan-600 dark:text-cyan-400/70 truncate">
                                → {col.references.table}.{col.references.column}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Type */}
                        <span className="rounded bg-gray-200 dark:bg-gray-700/50 px-2 py-0.5 text-[10px] font-mono font-semibold text-gray-700 dark:text-gray-300 ml-1">
                          {col.type.toLowerCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Compact Stats Bar */}
                <div className="flex items-center justify-between rounded-b-lg border-t border-gray-200 dark:border-gray-700/50 bg-gray-100 dark:bg-gray-900/60 px-2.5 py-1.5">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-yellow-600 dark:text-yellow-400">🔑 {table.columns.filter(c => c.isPrimaryKey).length} PK</span>
                    <span className="text-gray-400 dark:text-gray-600">•</span>
                    <span className="text-blue-600 dark:text-blue-400">🔗 {table.columns.filter(c => c.isForeignKey).length} FK</span>
                    <span className="text-gray-400 dark:text-gray-600">•</span>
                    <span className="text-red-600 dark:text-red-400">★ {table.columns.filter(c => !c.nullable).length} Req</span>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-500">
                    {table.columns.length} cols
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enhanced Minimap */}
        {showMinimap && (
          <div className="absolute bottom-6 right-6 rounded-xl border border-gray-300 dark:border-gray-700/50 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800/95 dark:to-gray-900/95 p-3 shadow-2xl backdrop-blur-xl">
            <div className="relative h-36 w-36 rounded-lg bg-gray-100 dark:bg-gray-950/80 p-1 ring-1 ring-gray-300 dark:ring-gray-700/50">
              {tables.map(table => {
                const pos = positions.get(table.name);
                if (!pos) return null;
                return (
                  <div
                    key={table.name}
                    className="absolute rounded transition-all duration-200"
                    style={{
                      left: pos.x * 0.05,
                      top: pos.y * 0.05,
                      width: 20,
                      height: 15,
                      backgroundColor: selectedTable === table.name ? '#3b82f6' : '#9ca3af',
                      boxShadow: selectedTable === table.name ? '0 0 8px rgba(59, 130, 246, 0.5)' : 'none'
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
              <p className="text-center text-xs font-bold tracking-wider text-gray-700 dark:text-gray-300">OVERVIEW</p>
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
