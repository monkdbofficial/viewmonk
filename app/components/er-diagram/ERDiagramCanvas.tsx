'use client';

import { useState, useEffect, useRef } from 'react';

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
  width: number;
  height: number;
}

interface ERDiagramCanvasProps {
  tables: TableMetadata[];
  zoom: number;
  onTableClick: (tableName: string) => void;
}

export default function ERDiagramCanvas({ tables, zoom, onTableClick }: ERDiagramCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tablePositions, setTablePositions] = useState<Map<string, TablePosition>>(new Map());
  const [dragging, setDragging] = useState<{
    table: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [pan, setPan] = useState({ x: 100, y: 100 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Constants for layout
  const TABLE_WIDTH = 280;
  const TABLE_HEADER_HEIGHT = 40;
  const ROW_HEIGHT = 28;
  const COLUMN_MARGIN = 200;
  const ROW_MARGIN = 100;

  // Calculate table positions on mount or when tables change
  useEffect(() => {
    const positions = new Map<string, TablePosition>();
    const tablesPerRow = Math.max(2, Math.floor(Math.sqrt(tables.length)));

    tables.forEach((table, index) => {
      const row = Math.floor(index / tablesPerRow);
      const col = index % tablesPerRow;

      const x = col * (TABLE_WIDTH + COLUMN_MARGIN) + 50;
      const y = row * 300 + ROW_MARGIN + 50;
      const height = TABLE_HEADER_HEIGHT + table.columns.length * ROW_HEIGHT;

      positions.set(table.name, {
        x,
        y,
        width: TABLE_WIDTH,
        height
      });
    });

    setTablePositions(positions);
  }, [tables]);

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent, tableName: string) => {
    const pos = tablePositions.get(tableName);
    if (!pos) return;

    setDragging({
      table: tableName,
      offsetX: e.clientX - pos.x * zoom - pan.x,
      offsetY: e.clientY - pos.y * zoom - pan.y
    });
    e.stopPropagation();
  };

  // Handle mouse down for panning (on canvas background)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !dragging) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      const newX = (e.clientX - dragging.offsetX - pan.x) / zoom;
      const newY = (e.clientY - dragging.offsetY - pan.y) / zoom;

      setTablePositions(prev => {
        const newPositions = new Map(prev);
        const current = newPositions.get(dragging.table);
        if (current) {
          newPositions.set(dragging.table, {
            ...current,
            x: newX,
            y: newY
          });
        }
        return newPositions;
      });
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    setDragging(null);
    setIsPanning(false);
  };

  // Render relationship lines
  const renderRelationships = () => {
    const lines: React.ReactElement[] = [];

    tables.forEach(table => {
      const sourcePos = tablePositions.get(table.name);
      if (!sourcePos) return;

      table.columns.forEach(column => {
        if (column.isForeignKey && column.references) {
          const targetPos = tablePositions.get(column.references.table);
          if (!targetPos) return;

          // Calculate connection points
          const sourceX = sourcePos.x + sourcePos.width / 2;
          const sourceY = sourcePos.y + sourcePos.height / 2;
          const targetX = targetPos.x + targetPos.width / 2;
          const targetY = targetPos.y + targetPos.height / 2;

          // Calculate arrow endpoint
          const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
          const arrowX = targetX - Math.cos(angle) * 10;
          const arrowY = targetY - Math.sin(angle) * 10;

          lines.push(
            <g key={`${table.name}-${column.name}`}>
              {/* Line */}
              <line
                x1={sourceX}
                y1={sourceY}
                x2={targetX}
                y2={targetY}
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
                markerEnd="url(#arrowhead)"
              />
              {/* Label */}
              <text
                x={(sourceX + targetX) / 2}
                y={(sourceY + targetY) / 2 - 5}
                fill="#6b7280"
                fontSize="12"
                textAnchor="middle"
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
    <div
      ref={canvasRef}
      className="h-full w-full cursor-move overflow-hidden bg-white dark:bg-gray-900"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 2000 2000"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Define arrowhead marker */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
          </marker>
        </defs>

        {/* Wrapper group with transform for pan and zoom */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Render relationships first (so they appear behind tables) */}
          {renderRelationships()}

          {/* Render tables */}
          {tables.map(table => {
          const pos = tablePositions.get(table.name);
          if (!pos) return null;

          return (
            <g
              key={table.name}
              transform={`translate(${pos.x}, ${pos.y})`}
              onMouseDown={(e) => handleMouseDown(e as any, table.name)}
              onClick={() => onTableClick(table.name)}
              style={{ cursor: 'move' }}
            >
              {/* Table background */}
              <rect
                width={pos.width}
                height={pos.height}
                fill="white"
                stroke="#d1d5db"
                strokeWidth="2"
                rx="8"
              />

              {/* Table header */}
              <rect
                width={pos.width}
                height={TABLE_HEADER_HEIGHT}
                fill="#3b82f6"
                rx="8"
              />
              <rect
                width={pos.width}
                height={TABLE_HEADER_HEIGHT / 2}
                fill="#3b82f6"
                y={TABLE_HEADER_HEIGHT / 2}
              />

              {/* Table name */}
              <text
                x={pos.width / 2}
                y={TABLE_HEADER_HEIGHT / 2 + 6}
                fill="white"
                fontSize="16"
                fontWeight="bold"
                textAnchor="middle"
              >
                {table.name}
              </text>

              {/* Columns */}
              {table.columns.map((column, index) => {
                const y = TABLE_HEADER_HEIGHT + index * ROW_HEIGHT;

                return (
                  <g key={column.name}>
                    {/* Row background (alternate colors) */}
                    <rect
                      x="0"
                      y={y}
                      width={pos.width}
                      height={ROW_HEIGHT}
                      fill={index % 2 === 0 ? '#f9fafb' : 'white'}
                    />

                    {/* Column icon */}
                    <text
                      x="12"
                      y={y + ROW_HEIGHT / 2 + 5}
                      fontSize="14"
                    >
                      {column.isPrimaryKey ? '🔑' : column.isForeignKey ? '🔗' : '•'}
                    </text>

                    {/* Column name */}
                    <text
                      x="35"
                      y={y + ROW_HEIGHT / 2 + 5}
                      fontSize="14"
                      fontWeight={column.isPrimaryKey ? 'bold' : 'normal'}
                      fill="#111827"
                    >
                      {column.name}
                    </text>

                    {/* Column type */}
                    <text
                      x={pos.width - 12}
                      y={y + ROW_HEIGHT / 2 + 5}
                      fontSize="12"
                      fill="#6b7280"
                      textAnchor="end"
                    >
                      {column.type}
                      {!column.nullable ? ' *' : ''}
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
  );
}
