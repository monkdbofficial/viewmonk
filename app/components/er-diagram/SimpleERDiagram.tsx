'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search, ZoomIn, ZoomOut, Download, Eye, EyeOff,
  Grid3x3, Maximize, X, ChevronDown, ChevronRight,
  Crosshair, Filter, RotateCcw, Key, Link, ArrowRight,
  PanelLeft, Layout, Command,
} from 'lucide-react';
import ELK from 'elkjs/lib/elk.bundled.js';
import { useTheme } from '../ThemeProvider';

// ─── Design tokens (app dark navy palette) ────────────────────────────────────
// Primary accent:  #3b82f6  (blue)
// Node bg:         #0f1f30  (bgApp)
// Card header:     #1a3048  (bgInput)
// Panel bg:        #0e1e2e  (bgHeader)
// Node border:     rgba(255,255,255,0.15)
// Edge (normal):   rgba(255,255,255,0.2)   → turns #3b82f6 on highlight
// Glow:            rgba(59,130,246,0.35)

// ─── Constants ────────────────────────────────────────────────────────────────
const TABLE_W    = 280;
const HEADER_H   = 44;
const ROW_H      = 32;
const PARTICLE_N = 6;
const PARTICLE_S = 5; // seconds per cycle

// ─── Types ────────────────────────────────────────────────────────────────────
interface Column {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: { table: string; column: string };
}
interface TableMetadata { name: string; columns: Column[]; }
interface TablePos      { x: number; y: number; }

type ShowMode = 'all' | 'keys' | 'name';

interface CmdItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'table' | 'action';
}

interface SimpleERDiagramProps {
  tables: TableMetadata[];
  onTableClick: (tableName: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shortType(t: string) {
  return t.toLowerCase()
    .replace(/character varying(\(\d+\))?/g, 'varchar')
    .replace('timestamp without time zone', 'timestamp')
    .replace('timestamp with time zone', 'timestamptz')
    .replace('double precision', 'double')
    .replace('boolean', 'bool')
    .replace(/\(\d+\)$/, '');
}

/** Return a per-category accent color for a MonkDB column type */
function typeColor(t: string): string {
  const s = shortType(t);
  if (/^(integer|bigint|smallint|short|byte|int)$/.test(s)) return '#f59e0b';  // amber  — integers
  if (/^(float|double|real)$/.test(s))                       return '#a78bfa';  // violet — floats
  if (/^(text|varchar|char|string)$/.test(s))                return '#34d399';  // emerald — text
  if (/^bool$/.test(s))                                       return '#f472b6';  // pink   — boolean
  if (/^(timestamp|timestamptz|date|time)$/.test(s))         return '#22d3ee';  // cyan   — temporal
  if (/^(object|array)/.test(s))                             return '#2dd4bf';  // teal   — nested
  if (/^geo_/.test(s))                                        return '#38bdf8';  // sky    — geo
  if (/^float_vector/.test(s))                               return '#c084fc';  // purple — vectors
  return '#93c5fd';                                                              // default blue
}

/** Build a smooth Bezier SVG path between two table columns */
function bezierPath(
  sp: TablePos, tp: TablePos,
  fkIdx: number, pkIdx: number,
  srcCollapsed: boolean, tgtCollapsed: boolean,
): { pathD: string; x1: number; y1: number; x2: number; y2: number } {
  const y1 = srcCollapsed
    ? sp.y + HEADER_H / 2
    : sp.y + HEADER_H + (fkIdx >= 0 ? fkIdx : 0) * ROW_H + ROW_H / 2;
  const y2 = tgtCollapsed
    ? tp.y + HEADER_H / 2
    : tp.y + HEADER_H + (pkIdx >= 0 ? pkIdx : 0) * ROW_H + ROW_H / 2;

  const goRight = sp.x + TABLE_W / 2 <= tp.x + TABLE_W / 2;
  const x1 = goRight ? sp.x + TABLE_W : sp.x;
  const x2 = goRight ? tp.x : tp.x + TABLE_W;

  const dist = Math.abs(x2 - x1);
  const curve = Math.min(Math.max(dist * 0.45, 60), 220);
  const d = goRight ? 1 : -1;
  const pathD = `M ${x1} ${y1} C ${x1 + d * curve} ${y1}, ${x2 - d * curve} ${y2}, ${x2} ${y2}`;
  return { pathD, x1, y1, x2, y2 };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SimpleERDiagram({ tables, onTableClick }: SimpleERDiagramProps) {
  const { theme } = useTheme();
  const D = theme === 'dark';

  // ─── Color tokens (light / dark) ───────────────────────────────────────────
  const C = {
    // Canvas
    canvasBg:       D ? '#060f1a'   : '#f1f5f9',
    canvasDot:      D ? 'rgba(148,163,184,0.12)' : 'rgba(71,85,105,0.1)',
    // Toolbar / panels / sidebars
    toolbarBg:      D ? '#0e1e2e'   : '#ffffff',
    toolbarBorder:  D ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
    panelBg:        D ? '#0e1e2e'   : '#ffffff',
    panelBorder:    D ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    panelRowBorder: D ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
    // Node
    nodeBg:         D ? '#0d2038'   : '#ffffff',
    nodeHeaderBg:   D ? '#162840'   : '#f8fafc',
    nodeHeaderSel:  D ? '#1a3a60'   : '#eff6ff',
    nodeHeaderHov:  D ? '#162e50'   : '#f0f9ff',
    nodeHeaderSep:  D ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)',
    nodeBorder:     D ? 'rgba(148,163,184,0.22)' : 'rgba(0,0,0,0.1)',
    nodeRowSep:     D ? 'rgba(148,163,184,0.13)' : 'rgba(0,0,0,0.06)',
    nodeRowHov:     D ? 'rgba(255,255,255,0.04)'  : 'rgba(0,0,0,0.03)',
    // Text
    textPrimary:    D ? 'rgba(255,255,255,0.92)' : '#1e293b',
    textSecondary:  D ? 'rgba(255,255,255,0.65)' : '#475569',
    textMuted:      D ? 'rgba(255,255,255,0.35)' : '#94a3b8',
    textDim:        D ? 'rgba(255,255,255,0.2)'  : '#cbd5e1',
    textSelected:   D ? '#93c5fd' : '#1d4ed8',
    textHovered:    D ? '#bfdbfe' : '#2563eb',
    // Accent
    accent:         '#3b82f6',
    accentBg:       D ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)',
    accentBorder:   D ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.35)',
    accentText:     D ? '#93c5fd' : '#1d4ed8',
    // Toolbar inputs
    inputBg:        D ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    inputBorder:    D ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.12)',
    inputText:      D ? 'rgba(255,255,255,0.85)' : '#1e293b',
    inputPlaceholder: D ? 'rgba(255,255,255,0.35)' : '#94a3b8',
    // Table icon
    tableIcon:      D ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
    // Column icons
    colIconNullable: D ? 'rgba(148,163,184,0.5)'  : 'rgba(100,116,139,0.6)',
    colIconRequired: D ? 'rgba(148,163,184,0.6)'  : 'rgba(71,85,105,0.7)',
    // FK ref hint
    fkHint:          D ? 'rgba(96,165,250,0.7)'  : 'rgba(37,99,235,0.6)',
    fkDot:           D ? 'rgba(96,165,250,0.45)' : 'rgba(59,130,246,0.5)',
    fkDotActive:     D ? '#93c5fd' : '#3b82f6',
    fkDotHov:        D ? '#93c5fd' : '#2563eb',
    // Edges
    edgeNormal:      D ? 'rgba(96,165,250,0.28)' : 'rgba(59,130,246,0.35)',
    edgeMarker:      D ? 'rgba(96,165,250,0.45)' : 'rgba(59,130,246,0.55)',
    // Command palette
    cmdBg:           D ? '#112233' : '#ffffff',
    cmdFooterBg:     D ? '#060f1a' : '#f8fafc',
    cmdItemHovBg:    D ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.07)',
    cmdSectionBg:    D ? '#112233' : '#f8fafc',
    // Scrollbar / section headers
    sectionBg:       D ? '#0e1e2e' : '#f8fafc',
    // Misc
    divider:         D ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    statBg:          D ? 'rgba(59,130,246,0.06)'  : 'rgba(59,130,246,0.06)',
    statBorder:      D ? 'rgba(59,130,246,0.2)'   : 'rgba(59,130,246,0.25)',
    minimapBg:       D ? 'rgba(10,20,36,0.97)'   : 'rgba(255,255,255,0.97)',
    minimapBorder:   D ? 'rgba(59,130,246,0.2)'  : 'rgba(59,130,246,0.2)',
    minimapCanvas:   D ? 'rgba(6,15,26,0.8)'     : 'rgba(241,245,249,0.9)',
    minimapCanvasBorder: D ? 'rgba(96,165,250,0.15)' : 'rgba(59,130,246,0.15)',
    minimapNode:     D ? 'rgba(255,255,255,0.2)'  : 'rgba(59,130,246,0.25)',
    kbdBg:           D ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
    kbdText:         D ? 'rgba(255,255,255,0.4)'  : '#64748b',
    overlayBg:       'rgba(0,0,0,0.6)',
  } as const;

  const containerRef  = useRef<HTMLDivElement>(null);
  const searchRef     = useRef<HTMLInputElement>(null);
  const cmdRef        = useRef<HTMLInputElement>(null);
  const cmdListRef    = useRef<HTMLDivElement>(null);

  // Canvas transform
  const [positions, setPositions]     = useState<Map<string, TablePos>>(new Map());
  const [scale, setScale]             = useState(1);
  const [translate, setTranslate]     = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning]     = useState(false);
  const [panStart, setPanStart]       = useState({ x: 0, y: 0 });
  const [dragging, setDragging]       = useState<{ table: string; ox: number; oy: number } | null>(null);

  // UI state
  const [searchTerm, setSearchTerm]           = useState('');
  const [selectedTable, setSelectedTable]     = useState<string | null>(null);
  const [hoveredTable, setHoveredTable]       = useState<string | null>(null);
  const [hoveredRel, setHoveredRel]           = useState<string | null>(null);
  const [showEdges, setShowEdges]             = useState(true);
  const [showMinimap, setShowMinimap]         = useState(true);
  const [showMode, setShowMode]               = useState<ShowMode>('all');
  const [isFullscreen, setIsFullscreen]       = useState(false);
  const [collapsed, setCollapsed]             = useState<Set<string>>(new Set());
  const [hiddenTables, setHiddenTables]       = useState<Set<string>>(new Set());
  const [relatedOnly, setRelatedOnly]         = useState(false);
  const [isComputing, setIsComputing]         = useState(false);
  const [showLeftPanel, setShowLeftPanel]     = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch]     = useState('');
  const [cmdIndex, setCmdIndex]               = useState(0);
  const [leftPanelSearch, setLeftPanelSearch] = useState('');

  // ── Derived ─────────────────────────────────────────────────────────────────

  const filteredTables = useMemo(
    () => tables.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [tables, searchTerm]
  );

  const selectedData = useMemo(
    () => tables.find(t => t.name === selectedTable) ?? null,
    [tables, selectedTable]
  );

  // Tables connected (directly) to selectedTable
  const connectedSet = useMemo(() => {
    if (!selectedTable) return new Set<string>();
    const s = new Set<string>();
    tables.find(t => t.name === selectedTable)?.columns.forEach(c => {
      if (c.isForeignKey && c.references) s.add(c.references.table);
    });
    tables.forEach(t => t.columns.forEach(c => {
      if (c.isForeignKey && c.references?.table === selectedTable) s.add(t.name);
    }));
    return s;
  }, [selectedTable, tables]);

  // Tables connected to hoveredTable (for hover highlight)
  const hoveredConnected = useMemo(() => {
    if (!hoveredTable) return new Set<string>();
    const s = new Set<string>();
    tables.find(t => t.name === hoveredTable)?.columns.forEach(c => {
      if (c.isForeignKey && c.references) s.add(c.references.table);
    });
    tables.forEach(t => t.columns.forEach(c => {
      if (c.isForeignKey && c.references?.table === hoveredTable) s.add(t.name);
    }));
    return s;
  }, [hoveredTable, tables]);

  // Tables actually rendered (search + hidden + relatedOnly filter)
  const displayedTables = useMemo(() => {
    let result = filteredTables.filter(t => !hiddenTables.has(t.name));
    if (relatedOnly && selectedTable) {
      result = result.filter(t => t.name === selectedTable || connectedSet.has(t.name));
    }
    return result;
  }, [filteredTables, hiddenTables, relatedOnly, selectedTable, connectedSet]);

  // Sidebar FK/incoming info
  const outgoingFKs = useMemo(() =>
    selectedData?.columns
      .filter(c => c.isForeignKey && c.references)
      .map(c => ({ col: c.name, toTable: c.references!.table, toCol: c.references!.column })) ?? [],
    [selectedData]
  );
  const incomingFKs = useMemo(() =>
    tables.flatMap(t => t.columns
      .filter(c => c.isForeignKey && c.references?.table === selectedTable)
      .map(c => ({ fromTable: t.name, fromCol: c.name }))),
    [tables, selectedTable]
  );

  // Visible columns per display mode
  const visibleCols = (t: TableMetadata) => {
    if (showMode === 'name') return [];
    if (showMode === 'keys') return t.columns.filter(c => c.isPrimaryKey || c.isForeignKey);
    return t.columns;
  };

  // Left panel table list (filtered by leftPanelSearch)
  const leftPanelTables = useMemo(() =>
    tables.filter(t => t.name.toLowerCase().includes(leftPanelSearch.toLowerCase())),
    [tables, leftPanelSearch]
  );

  // ── Initial grid positions ────────────────────────────────────────────────
  useEffect(() => {
    const m = new Map<string, TablePos>();
    const cols = Math.ceil(Math.sqrt(tables.length));
    tables.forEach((t, i) => m.set(t.name, { x: (i % cols) * 360 + 80, y: Math.floor(i / cols) * 320 + 80 }));
    setPositions(m);
  }, [tables]);

  // ── ELK auto-layout ──────────────────────────────────────────────────────
  const runLayout = useCallback(async (tbls: TableMetadata[]) => {
    if (tbls.length === 0) return;
    setIsComputing(true);
    try {
      const elk = new ELK();
      const nodes = tbls.map(t => ({
        id: t.name, width: TABLE_W,
        height: HEADER_H + t.columns.length * ROW_H + 8,
      }));
      const edges: any[] = [];
      tbls.forEach(t => t.columns.forEach(c => {
        if (!c.isForeignKey || !c.references) return;
        if (!tbls.find(x => x.name === c.references!.table)) return;
        edges.push({ id: `${t.name}-${c.name}`, sources: [t.name], targets: [c.references.table] });
      }));

      const result = await elk.layout({
        id: 'root',
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'RIGHT',
          'elk.edgeRouting': 'SPLINES',
          'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
          'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'elk.spacing.nodeNode': '120',
          'elk.layered.spacing.nodeNodeBetweenLayers': '160',
          'elk.separateConnectedComponents': 'true',
          'elk.spacing.componentComponent': '100',
        },
        children: nodes,
        edges,
      });

      const m = new Map<string, TablePos>();
      result.children?.forEach(n => {
        if (n.x !== undefined && n.y !== undefined)
          m.set(n.id, { x: n.x + 80, y: n.y + 80 });
      });
      if (m.size > 0) setPositions(m);
    } catch { /* ELK layout failed — positions remain unchanged */ }
    finally { setIsComputing(false); }
  }, []);

  useEffect(() => { runLayout(filteredTables); }, [filteredTables]); // eslint-disable-line

  // ── Wheel zoom ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const fn = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.93;
      setScale(p => Math.min(Math.max(p * factor, 0.15), 3));
    };
    el.addEventListener('wheel', fn, { passive: false });
    return () => el.removeEventListener('wheel', fn);
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      // Command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(v => !v);
        setCommandSearch('');
        setCmdIndex(0);
        return;
      }
      if (e.key === 'Escape') {
        if (showCommandPalette) { setShowCommandPalette(false); return; }
        setSelectedTable(null); setRelatedOnly(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); searchRef.current?.focus(); }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); setScale(1); setTranslate({ x: 0, y: 0 }); }
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [showCommandPalette]);

  // Focus command palette input when opened
  useEffect(() => {
    if (showCommandPalette) {
      setTimeout(() => cmdRef.current?.focus(), 50);
    }
  }, [showCommandPalette]);

  // ── View helpers ────────────────────────────────────────────────────────
  const zoomIn    = () => setScale(p => Math.min(p + 0.1, 3));
  const zoomOut   = () => setScale(p => Math.max(p - 0.1, 0.15));
  const resetView = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };

  const fitToScreen = useCallback(() => {
    if (!containerRef.current || displayedTables.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    displayedTables.forEach(t => {
      const p = positions.get(t.name); if (!p) return;
      const h = collapsed.has(t.name) ? HEADER_H : HEADER_H + t.columns.length * ROW_H + 8;
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + TABLE_W); maxY = Math.max(maxY, p.y + h);
    });
    const rect = containerRef.current.getBoundingClientRect();
    const pad = 80;
    const s = Math.min((rect.width - pad * 2) / (maxX - minX), (rect.height - pad * 2) / (maxY - minY), 1.2);
    setScale(s);
    setTranslate({ x: (rect.width - (maxX - minX) * s) / 2 - minX * s, y: (rect.height - (maxY - minY) * s) / 2 - minY * s });
  }, [displayedTables, positions, collapsed]);

  const focusTable = useCallback((name: string) => {
    const p = positions.get(name); if (!p || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTranslate({ x: rect.width / 2 - (p.x + TABLE_W / 2) * scale, y: rect.height / 2 - (p.y + HEADER_H) * scale });
  }, [positions, scale]);

  // ── Tidy Up ──────────────────────────────────────────────────────────────
  const tidyUp = useCallback(() => { runLayout(displayedTables); }, [runLayout, displayedTables]);

  // ── Fullscreen ───────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else { document.exitFullscreen(); setIsFullscreen(false); }
  };

  // ── Drag / Pan ───────────────────────────────────────────────────────────
  const handleTableMouseDown = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const p = positions.get(name); if (!p) return;
    setDragging({ table: name, ox: e.clientX / scale - p.x, oy: e.clientY / scale - p.y });
    setSelectedTable(name);
    onTableClick(name);
  };
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !dragging) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
      setSelectedTable(null); setRelatedOnly(false);
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      setPositions(prev => new Map(prev).set(dragging.table, {
        x: e.clientX / scale - dragging.ox, y: e.clientY / scale - dragging.oy
      }));
    } else if (isPanning) {
      setTranslate({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };
  const handleMouseUp = () => { setDragging(null); setIsPanning(false); };

  const toggleCollapse = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  };

  const toggleHidden = (name: string) => {
    setHiddenTables(prev => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  };

  // ── Export ──────────────────────────────────────────────────────────────
  const buildSVG = (): string => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    displayedTables.forEach(t => {
      const p = positions.get(t.name); if (!p) return;
      const h = HEADER_H + t.columns.length * ROW_H + 8;
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + TABLE_W); maxY = Math.max(maxY, p.y + h);
    });
    const pad = 60, W = maxX - minX + pad * 2, H = maxY - minY + pad * 2;
    const vx = minX - pad, vy = minY - pad;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${vx} ${vy} ${W} ${H}">
<defs>
  <marker id="ex-many" viewBox="0 0 20 20" refX="0" refY="10" markerWidth="14" markerHeight="14" orient="auto">
    <path d="M 0 2 L 12 10 M 0 10 L 12 10 M 0 18 L 12 10" stroke="#3b82f6" stroke-width="1.5" fill="none"/>
  </marker>
  <marker id="ex-one" viewBox="0 0 10 20" refX="10" refY="10" markerWidth="10" markerHeight="14" orient="auto">
    <line x1="9" y1="2" x2="9" y2="18" stroke="#3b82f6" stroke-width="2"/>
  </marker>
</defs>
<rect x="${vx}" y="${vy}" width="${W}" height="${H}" fill="#0a1929"/>
<g id="edges">`;

    displayedTables.forEach(t => {
      const sp = positions.get(t.name); if (!sp) return;
      t.columns.forEach((c, ci) => {
        if (!c.isForeignKey || !c.references) return;
        const tgt = displayedTables.find(x => x.name === c.references!.table);
        const tp  = tgt && positions.get(tgt.name);
        if (!tgt || !tp) return;
        const pkI = tgt.columns.findIndex(x => x.isPrimaryKey);
        const { pathD } = bezierPath(sp, tp, ci, pkI, false, false);
        svg += `\n  <path d="${pathD}" stroke="rgba(255,255,255,0.25)" stroke-width="1.2" fill="none" marker-start="url(#ex-many)" marker-end="url(#ex-one)"/>`;
      });
    });

    svg += `\n</g>\n<g id="tables">`;
    displayedTables.forEach(t => {
      const p = positions.get(t.name); if (!p) return;
      const h = HEADER_H + t.columns.length * ROW_H + 8;
      svg += `\n  <g transform="translate(${p.x},${p.y})">
    <rect width="${TABLE_W}" height="${h}" rx="8" fill="#0a1929" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
    <rect width="${TABLE_W}" height="${HEADER_H}" rx="8" fill="#0e1e2e"/>
    <rect y="${HEADER_H - 8}" width="${TABLE_W}" height="8" fill="#0e1e2e"/>
    <line x1="0" y1="${HEADER_H}" x2="${TABLE_W}" y2="${HEADER_H}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="12" y="27" fill="rgba(255,255,255,0.7)" font-size="12" font-weight="500" font-family="system-ui,sans-serif">${t.name}</text>`;
      t.columns.forEach((c, i) => {
        const y = HEADER_H + i * ROW_H;
        const nameColor = c.isPrimaryKey ? '#3b82f6' : c.isForeignKey ? '#3b82f6' : 'rgba(255,255,255,0.9)';
        if (i > 0) svg += `\n    <line x1="0" y1="${y}" x2="${TABLE_W}" y2="${y}" stroke="rgba(255,255,255,0.07)" stroke-width="0.5"/>`;
        svg += `\n    <text x="36" y="${y + 20}" fill="${nameColor}" font-size="11" font-family="system-ui,sans-serif">${c.name}</text>`;
        svg += `\n    <text x="${TABLE_W - 8}" y="${y + 20}" text-anchor="end" fill="rgba(255,255,255,0.4)" font-size="10" font-family="monospace">${shortType(c.type)}</text>`;
      });
      svg += `\n  </g>`;
    });
    svg += `\n</g>\n</svg>`;
    return svg;
  };

  const exportSVG = () => {
    const blob = new Blob([buildSVG()], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `er-${Date.now()}.svg` }).click();
    URL.revokeObjectURL(url);
  };

  const exportPNG = () => {
    const svgStr = buildSVG();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    displayedTables.forEach(t => {
      const p = positions.get(t.name); if (!p) return;
      const h = HEADER_H + t.columns.length * ROW_H + 8;
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + TABLE_W); maxY = Math.max(maxY, p.y + h);
    });
    const W = maxX - minX + 120, H = maxY - minY + 120;
    const canvas = document.createElement('canvas');
    canvas.width = W * 2; canvas.height = H * 2;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#0f1f30'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: `er-${Date.now()}.png` }).click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.src = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' }));
  };

  // ── Command palette items ────────────────────────────────────────────────
  const commandItems: CmdItem[] = useMemo(() => {
    const q = commandSearch.toLowerCase();
    const tableItems: CmdItem[] = tables
      .filter(t => !q || t.name.toLowerCase().includes(q))
      .map((t): CmdItem => ({
        id: `table:${t.name}`,
        label: t.name,
        description: `${t.columns.length} columns · ${t.columns.filter(c => c.isPrimaryKey).length} PK · ${t.columns.filter(c => c.isForeignKey).length} FK`,
        icon: (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
            <rect x="0.5" y="0.5" width="11" height="3.5" rx="0.8" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8"/>
            <rect x="0.5" y="5" width="5" height="6.5" rx="0.8" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8"/>
            <rect x="6.5" y="5" width="5" height="6.5" rx="0.8" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8"/>
          </svg>
        ),
        action: () => {
          setSelectedTable(t.name);
          onTableClick(t.name);
          setShowCommandPalette(false);
        },
        category: 'table' as const,
      }));

    const actions = ([
      {
        id: 'action:fit',
        label: 'Fit to screen',
        description: 'Fit all visible tables in view',
        icon: <RotateCcw className="h-3 w-3" />,
        action: () => { fitToScreen(); setShowCommandPalette(false); },
        category: 'action',
      },
      {
        id: 'action:tidy',
        label: 'Tidy up layout',
        description: 'Re-run auto layout algorithm',
        icon: <Layout className="h-3 w-3" />,
        action: () => { tidyUp(); setShowCommandPalette(false); },
        category: 'action',
      },
      {
        id: 'action:show-all',
        label: 'Show all tables',
        description: 'Remove all visibility filters',
        icon: <Eye className="h-3 w-3" />,
        action: () => { setHiddenTables(new Set()); setShowCommandPalette(false); },
        category: 'action',
      },
      {
        id: 'action:toggle-edges',
        label: showEdges ? 'Hide relationships' : 'Show relationships',
        description: 'Toggle edge visibility',
        icon: showEdges ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />,
        action: () => { setShowEdges(v => !v); setShowCommandPalette(false); },
        category: 'action',
      },
      {
        id: 'action:export-svg',
        label: 'Export SVG',
        description: 'Download diagram as SVG',
        icon: <Download className="h-3 w-3" />,
        action: () => { exportSVG(); setShowCommandPalette(false); },
        category: 'action',
      },
      {
        id: 'action:export-png',
        label: 'Export PNG',
        description: 'Download diagram as PNG',
        icon: <Download className="h-3 w-3" />,
        action: () => { exportPNG(); setShowCommandPalette(false); },
        category: 'action',
      },
    ] as CmdItem[]).filter(a => !q || a.label.toLowerCase().includes(q) || (a.description?.toLowerCase().includes(q)));

    return q
      ? [...tableItems, ...actions]
      : [...tableItems, ...actions];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, commandSearch, showEdges]);

  // Command palette keyboard navigation
  const handleCmdKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCmdIndex(i => Math.min(i + 1, commandItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCmdIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commandItems[cmdIndex]?.action();
    } else if (e.key === 'Escape') {
      setShowCommandPalette(false);
    }
  };

  // Keep selected item in view
  useEffect(() => {
    const list = cmdListRef.current;
    if (!list) return;
    const item = list.children[cmdIndex] as HTMLElement;
    item?.scrollIntoView({ block: 'nearest' });
  }, [cmdIndex]);

  // Reset index when search changes
  useEffect(() => { setCmdIndex(0); }, [commandSearch]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ════════════════════ TOOLBAR ════════════════════ */}
      <div
        className="flex items-center justify-between gap-3 px-3 py-1.5 flex-shrink-0 border-b"
        style={{ background: C.toolbarBg, borderColor: C.toolbarBorder, minHeight: 44 }}
      >
        {/* Left */}
        <div className="flex items-center gap-2">

          {/* Left panel toggle */}
          <ToolbarToggle
            active={showLeftPanel}
            onClick={() => setShowLeftPanel(v => !v)}
            icon={<PanelLeft className="h-3.5 w-3.5" />}
            label="Tables"
          C={C}
          />

          {/* Divider */}
          <div className="h-4 w-px" style={{ background: C.divider }} />

          {/* Command palette trigger */}
          <button
            onClick={() => { setShowCommandPalette(true); setCommandSearch(''); setCmdIndex(0); }}
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors"
            style={{ border: `1px solid ${C.inputBorder}`, color: C.textMuted, background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = C.inputBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Command className="h-3.5 w-3.5" />
            <span>Search…</span>
            <kbd className="rounded px-1 py-0.5 text-[9px] font-mono" style={{ background: C.kbdBg, color: C.kbdText }}>⌘K</kbd>
          </button>

          {/* Divider */}
          <div className="h-4 w-px" style={{ background: C.divider }} />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: C.textMuted }} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Filter tables… (⌘F)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-44 rounded-md py-1.5 pl-8 pr-6 text-xs focus:outline-none transition-colors"
              style={{
                background: C.inputBg, border: `1px solid ${C.inputBorder}`,
                color: C.inputText,
              }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-1.5 top-1/2 -translate-y-1/2" style={{ color: C.textMuted }}>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="h-4 w-px" style={{ background: C.divider }} />

          {/* Zoom */}
          <div className="flex items-center rounded-md overflow-hidden text-xs" style={{ border: `1px solid ${C.inputBorder}` }}>
            {[
              { icon: <ZoomOut className="h-3.5 w-3.5" />, fn: zoomOut, title: 'Zoom out' },
              { label: `${Math.round(scale * 100)}%`, fn: resetView, title: 'Reset zoom (⌘0)' },
              { icon: <ZoomIn className="h-3.5 w-3.5" />, fn: zoomIn, title: 'Zoom in' },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.fn}
                title={btn.title}
                className="px-2 py-1.5 transition-colors"
                style={{
                  color: C.textSecondary,
                  borderLeft: i > 0 ? `1px solid ${C.divider}` : undefined,
                  minWidth: btn.label ? 50 : undefined,
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  fontSize: 11,
                  background: 'transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = C.inputBg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {btn.label ?? btn.icon}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-4 w-px" style={{ background: C.divider }} />

          {/* All / Keys / Name toggle */}
          <div className="flex items-center rounded-md overflow-hidden text-xs" style={{ border: `1px solid ${C.inputBorder}` }}>
            {(['all', 'keys', 'name'] as const).map((m, i) => (
              <button
                key={m}
                onClick={() => setShowMode(m)}
                className="px-3 py-1.5 font-medium transition-colors"
                style={{
                  background: showMode === m ? '#3b82f6' : 'transparent',
                  color: showMode === m ? '#ffffff' : C.textSecondary,
                  borderLeft: i > 0 ? `1px solid ${C.divider}` : undefined,
                }}
              >
                {m === 'all' ? 'All' : m === 'keys' ? 'Keys' : 'Name'}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-4 w-px" style={{ background: C.divider }} />

          {/* Edges toggle */}
          <ToolbarToggle
            active={showEdges} onClick={() => setShowEdges(v => !v)}
            icon={showEdges ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            label="Links"
          C={C}
          />
          {/* Minimap toggle */}
          <ToolbarToggle
            active={showMinimap} onClick={() => setShowMinimap(v => !v)}
            icon={<Grid3x3 className="h-3.5 w-3.5" />}
            label="Map"
          C={C}
          />
          {/* Fit to screen */}
          <ToolbarBtn onClick={fitToScreen} icon={<RotateCcw className="h-3.5 w-3.5" />} label="Fit" title="Fit to screen" C={C} />
          {/* Tidy Up */}
          <ToolbarBtn
            onClick={tidyUp}
            icon={<Layout className={`h-3.5 w-3.5 ${isComputing ? 'animate-spin' : ''}`} />}
            label="Tidy"
            title="Tidy up layout"
            C={C}
          />

          {/* Related only — only when table selected */}
          {selectedTable && (
            <ToolbarToggle
              active={relatedOnly} onClick={() => setRelatedOnly(v => !v)}
              icon={<Filter className="h-3.5 w-3.5" />}
              label="Related"
          C={C}
          />
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Stats */}
          <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs" style={{ border: `1px solid ${C.statBorder}`, background: C.statBg, color: C.textSecondary }}>
            <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: '#3b82f6' }} />
            <span style={{ color: C.accentText, fontWeight: 600 }}>{displayedTables.length}</span>
            <span style={{ color: C.textMuted }}>/ {tables.length}</span>
            {isComputing && <span style={{ color: '#60a5fa' }} className="ml-1">· computing…</span>}
          </div>
          <div className="h-4 w-px" style={{ background: C.divider }} />
          <ToolbarBtn onClick={toggleFullscreen} icon={<Maximize className="h-3.5 w-3.5" />} label={isFullscreen ? 'Exit' : 'Full'} C={C} />
          <ToolbarBtn onClick={exportPNG} icon={<Download className="h-3.5 w-3.5" />} label="PNG" C={C} />
          {/* SVG = primary CTA */}
          <button
            onClick={exportSVG}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors"
            style={{ background: '#3b82f6', color: '#ffffff' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#60a5fa')}
            onMouseLeave={e => (e.currentTarget.style.background = '#3b82f6')}
          >
            <Download className="h-3.5 w-3.5" /> SVG
          </button>
        </div>
      </div>

      {/* ════════════════════ BODY ════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ════════════════════ LEFT PANEL ════════════════════ */}
        {showLeftPanel && (
          <div
            className="flex flex-col flex-shrink-0 overflow-hidden"
            style={{
              width: 220,
              borderRight: `1px solid ${C.panelBorder}`,
              background: C.panelBg,
            }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0" style={{ borderBottom: `1px solid ${C.panelBorder}` }}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.textSecondary }}>Tables</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setHiddenTables(new Set())}
                  title="Show all"
                  className="flex items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-semibold transition-colors"
                  style={{ color: C.textMuted, border: `1px solid ${C.inputBorder}`, background: 'transparent' }}
                  onMouseEnter={e => { (e.currentTarget.style.color = '#3b82f6'); (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'); }}
                  onMouseLeave={e => { (e.currentTarget.style.color = C.textMuted); (e.currentTarget.style.borderColor = C.inputBorder); }}
                >
                  All
                </button>
                <button
                  onClick={() => setHiddenTables(new Set(tables.map(t => t.name)))}
                  title="Hide all"
                  className="flex items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-semibold transition-colors"
                  style={{ color: C.textMuted, border: `1px solid ${C.inputBorder}`, background: 'transparent' }}
                  onMouseEnter={e => { (e.currentTarget.style.color = 'rgba(248,113,113,0.9)'); (e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)'); }}
                  onMouseLeave={e => { (e.currentTarget.style.color = C.textMuted); (e.currentTarget.style.borderColor = C.inputBorder); }}
                >
                  None
                </button>
              </div>
            </div>

            {/* Search within panel */}
            <div className="px-2 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${C.panelBorder}` }}>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" style={{ color: C.textMuted }} />
                <input
                  type="text"
                  placeholder="Filter…"
                  value={leftPanelSearch}
                  onChange={e => setLeftPanelSearch(e.target.value)}
                  className="w-full rounded py-1 pl-6 pr-2 text-[11px] focus:outline-none"
                  style={{
                    background: C.inputBg,
                    border: `1px solid ${C.inputBorder}`,
                    color: C.inputText,
                  }}
                />
              </div>
            </div>

            {/* Visibility stats */}
            <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0" style={{ borderBottom: `1px solid ${C.panelBorder}` }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#3b82f6' }} />
              <span className="text-[10px]" style={{ color: C.textSecondary }}>
                <span style={{ color: C.accentText, fontWeight: 600 }}>{tables.length - hiddenTables.size}</span> visible
                {hiddenTables.size > 0 && <span style={{ color: D ? 'rgba(248,113,113,0.7)' : '#ef4444' }}> · {hiddenTables.size} hidden</span>}
              </span>
            </div>

            {/* Table list */}
            <div className="flex-1 overflow-y-auto">
              {leftPanelTables.map(t => {
                const isHidden  = hiddenTables.has(t.name);
                const isSel     = selectedTable === t.name;
                const isConn    = connectedSet.has(t.name) && !!selectedTable;
                const isHovered = hoveredTable === t.name;

                return (
                  <div
                    key={t.name}
                    className="group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
                    style={{
                      borderBottom: `1px solid ${C.panelRowBorder}`,
                      background: isSel
                        ? C.accentBg
                        : 'transparent',
                      borderLeft: isSel ? '2px solid #3b82f6' : '2px solid transparent',
                      opacity: isHidden ? 0.4 : 1,
                    }}
                    onClick={() => {
                      if (isHidden) return;
                      setSelectedTable(t.name);
                      onTableClick(t.name);
                      focusTable(t.name);
                    }}
                    onMouseEnter={e => {
                      if (!isSel) (e.currentTarget.style.background = C.inputBg);
                    }}
                    onMouseLeave={e => {
                      if (!isSel) (e.currentTarget.style.background = 'transparent');
                    }}
                  >
                    {/* Color dot */}
                    <span
                      className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: isSel ? '#3b82f6' : isConn ? 'rgba(59,130,246,0.6)' : isHidden ? C.textDim : C.textMuted,
                      }}
                    />

                    {/* Table name */}
                    <span
                      className="flex-1 min-w-0 truncate text-[11px]"
                      style={{
                        color: isSel ? C.textSelected : isConn ? C.accent : isHidden ? C.textDim : C.textPrimary,
                        fontWeight: isSel ? 700 : 400,
                        textDecoration: isHidden ? 'line-through' : 'none',
                      }}
                    >
                      {t.name}
                    </span>

                    {/* Column count */}
                    <span className="text-[9px] flex-shrink-0 rounded-full px-1" style={{ color: C.accentText, background: C.accentBg }}>
                      {t.columns.length}
                    </span>

                    {/* Eye toggle */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleHidden(t.name); }}
                      className="flex items-center justify-center rounded flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: C.textMuted, width: 16, height: 16 }}
                      title={isHidden ? 'Show table' : 'Hide table'}
                    >
                      {isHidden
                        ? <EyeOff className="h-3 w-3" />
                        : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════ CANVAS ════════════════════ */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-hidden"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: isPanning ? 'grabbing' : dragging ? 'grabbing' : 'grab',
            userSelect: 'none', WebkitUserSelect: 'none',
            background: C.canvasBg,
            backgroundImage: `radial-gradient(circle, ${C.canvasDot} 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            backgroundPosition: `${translate.x % 24}px ${translate.y % 24}px`,
          }}
        >
          {/* Loading fade-out overlay */}
          {isComputing && (
            <div className="absolute inset-0 z-50 pointer-events-none transition-opacity" style={{ opacity: 0.5, background: C.canvasBg }} />
          )}

          <div
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              width: '5000px', height: '5000px',
              position: 'relative',
              transition: dragging || isPanning ? 'opacity 0.3s ease' : 'transform 0.1s ease-out, opacity 0.3s ease',
              opacity: isComputing ? 0 : 1,
            }}
          >
            {/* ─── Relationship edges (SVG) ─── */}
            {showEdges && (
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '5000px', height: '5000px', pointerEvents: 'none', overflow: 'visible', zIndex: 1 }}>
                <defs>
                  <filter id="e-glow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="3" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>

                  <linearGradient id="pgrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                    <stop offset="40%" stopColor="#3b82f6" stopOpacity="1" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
                  </linearGradient>

                  <marker id="erd-many"   viewBox="0 0 20 20" refX="0"  refY="10" markerWidth="14" markerHeight="14" orient="auto">
                    <path d="M 0 2 L 14 10 M 0 10 L 14 10 M 0 18 L 14 10" stroke={C.edgeMarker} strokeWidth="1.3" fill="none"/>
                  </marker>
                  <marker id="erd-many-h" viewBox="0 0 20 20" refX="0"  refY="10" markerWidth="14" markerHeight="14" orient="auto">
                    <path d="M 0 2 L 14 10 M 0 10 L 14 10 M 0 18 L 14 10" stroke="#60a5fa" strokeWidth="1.8" fill="none"/>
                  </marker>

                  <marker id="erd-one"   viewBox="0 0 10 20" refX="10" refY="10" markerWidth="10" markerHeight="14" orient="auto">
                    <line x1="9" y1="2" x2="9" y2="18" stroke={C.edgeMarker} strokeWidth="1.5"/>
                  </marker>
                  <marker id="erd-one-h" viewBox="0 0 10 20" refX="10" refY="10" markerWidth="10" markerHeight="14" orient="auto">
                    <line x1="9" y1="2" x2="9" y2="18" stroke="#60a5fa" strokeWidth="2.2"/>
                  </marker>
                </defs>

                {displayedTables.flatMap(table => {
                  const sp = positions.get(table.name); if (!sp) return [];
                  return table.columns
                    .filter(c => c.isForeignKey && c.references)
                    .map(fk => {
                      const tgt = displayedTables.find(t => t.name === fk.references!.table);
                      const tp  = tgt && positions.get(tgt.name);
                      if (!tgt || !tp) return null;

                      const fkIdx = table.columns.findIndex(c => c.name === fk.name);
                      const pkIdx = tgt.columns.findIndex(c => c.isPrimaryKey);
                      const srcC  = collapsed.has(table.name);
                      const tgtC  = collapsed.has(tgt.name);

                      const { pathD, x1, y1, x2, y2 } = bezierPath(sp, tp, fkIdx, pkIdx, srcC, tgtC);
                      const relKey   = `${table.name}.${fk.name}->${fk.references!.table}`;
                      const isHov    = hoveredRel === relKey;

                      // Highlight from selection
                      const isSelHlt = selectedTable === table.name || selectedTable === fk.references!.table;
                      // Highlight from hover
                      const isHvrHlt = hoveredTable === table.name || hoveredTable === fk.references!.table;
                      const isHlt    = isSelHlt || isHvrHlt;

                      // Dim: if selection active and not related; or hover active and not related
                      const dimBySelect = !!selectedTable && !isSelHlt;
                      const dimByHover  = !!hoveredTable && !selectedTable && !isHvrHlt;
                      const dim         = dimBySelect || dimByHover;
                      const opacity     = dim ? 0.06 : isHov ? 1 : isHlt ? 0.85 : 0.4;

                      return (
                        <g key={`${table.name}-${fk.name}`}>
                          <path d={pathD} stroke="transparent" strokeWidth="18" fill="none"
                            style={{ cursor: 'default', pointerEvents: 'stroke' }}
                            onMouseEnter={() => setHoveredRel(relKey)}
                            onMouseLeave={() => setHoveredRel(null)}
                          />

                          <path
                            d={pathD}
                            stroke={isHov || isHlt ? '#3b82f6' : C.edgeNormal}
                            strokeWidth={isHov ? 2 : isHlt ? 1.5 : 1}
                            fill="none" opacity={opacity}
                            strokeLinecap="square" strokeLinejoin="miter"
                            markerStart={isHov || isHlt ? 'url(#erd-many-h)' : 'url(#erd-many)'}
                            markerEnd={isHov || isHlt ? 'url(#erd-one-h)' : 'url(#erd-one)'}
                            filter={isHov ? 'url(#e-glow)' : undefined}
                            style={{ pointerEvents: 'none', transition: 'all 0.15s ease' }}
                          />

                          {/* Animated particles on highlight/hover */}
                          {(isHov || isHlt) && Array.from({ length: PARTICLE_N }, (_, i) => (
                            <ellipse key={i} rx="5" ry="1.5" fill="url(#pgrad)" opacity={opacity * 0.9}>
                              <animateMotion
                                begin={`${-i * (PARTICLE_S / PARTICLE_N)}s`}
                                dur={`${PARTICLE_S}s`}
                                repeatCount="indefinite"
                                rotate="auto"
                                path={pathD}
                                calcMode="spline"
                                keySplines="0.42,0,0.58,1"
                              />
                            </ellipse>
                          ))}

                          {/* Hover label */}
                          {isHov && (() => {
                            const labelText = `${table.name}.${fk.name} → ${fk.references!.table}`;
                            const labelW = Math.max(160, labelText.length * 7.4 + 24);
                            const cx = (x1 + x2) / 2;
                            const cy = (y1 + y2) / 2;
                            return (
                            <g style={{ pointerEvents: 'none' }}>
                              <rect x={cx - labelW / 2} y={cy - 13} width={labelW} height="26" rx="6"
                                fill="#0d2038" stroke="#3b82f6" strokeWidth="1" opacity="0.96" />
                              <text x={cx} y={cy + 4}
                                textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="500" fontFamily="monospace">
                                {labelText}
                              </text>
                            </g>
                            );
                          })()}
                        </g>
                      );
                    }).filter(Boolean);
                })}
              </svg>
            )}

            {/* ─── Table nodes ─── */}
            {displayedTables.map(table => {
              const pos = positions.get(table.name); if (!pos) return null;
              const cols      = visibleCols(table);
              const isSel     = selectedTable === table.name;
              const isDrag    = dragging?.table === table.name;
              const isConn    = !!selectedTable && !isSel && connectedSet.has(table.name);

              // Dimming: by selection or by hover (hover takes priority when no selection active)
              const dimBySelect = !!selectedTable && !isSel && !isConn;
              const dimByHover  = !!hoveredTable && !selectedTable && table.name !== hoveredTable && !hoveredConnected.has(table.name);
              const isDimmed    = dimBySelect || dimByHover;

              // Is this table highlighted by hover (and no selection active)
              const isHoverSel  = !selectedTable && hoveredTable === table.name;
              const isHoverConn = !selectedTable && !!hoveredTable && hoveredConnected.has(table.name);
              const isCollapsed = collapsed.has(table.name);

              // TABLE_NAME mode: collapse body
              const bodyHidden = showMode === 'name' || isCollapsed;

              return (
                <div
                  key={table.name}
                  className="absolute overflow-hidden rounded-lg"
                  style={{
                    left: pos.x, top: pos.y, width: TABLE_W,
                    zIndex: isSel || isDrag ? 50 : 2,
                    cursor: isDrag ? 'grabbing' : 'grab',
                    userSelect: 'none', WebkitUserSelect: 'none',
                    background: C.nodeBg,
                    border: isSel
                      ? '2px solid #3b82f6'
                      : isHoverSel
                      ? '1.5px solid rgba(59,130,246,0.75)'
                      : isConn || isHoverConn
                      ? '1px solid rgba(59,130,246,0.5)'
                      : `1px solid ${C.nodeBorder}`,
                    boxShadow: isSel
                      ? D ? '0 0 0 3px rgba(59,130,246,0.2), 0 0 32px rgba(59,130,246,0.55)' : '0 0 0 3px rgba(59,130,246,0.15), 0 4px 24px rgba(59,130,246,0.2)'
                      : isHoverSel
                      ? D ? '0 0 0 2px rgba(59,130,246,0.12), 0 0 18px rgba(59,130,246,0.35)' : '0 0 0 2px rgba(59,130,246,0.1), 0 4px 16px rgba(59,130,246,0.15)'
                      : isDrag
                      ? D ? '0 20px 40px rgba(0,0,0,0.7)' : '0 12px 32px rgba(0,0,0,0.15)'
                      : D ? '0 4px 16px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.08)',
                    opacity: isDimmed ? 0.18 : 1,
                    transition: 'opacity 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                    willChange: isDrag ? 'transform' : 'auto',
                  }}
                  onMouseDown={e => handleTableMouseDown(e, table.name)}
                  onClick={() => onTableClick(table.name)}
                  onMouseEnter={() => setHoveredTable(table.name)}
                  onMouseLeave={() => setHoveredTable(null)}
                >
                  {/* ── Header ── */}
                  <div
                    className="flex items-center justify-between gap-2 px-3"
                    style={{
                      height: HEADER_H, minHeight: HEADER_H,
                      background: isSel ? C.nodeHeaderSel : isHoverSel ? C.nodeHeaderHov : C.nodeHeaderBg,
                      borderBottom: bodyHidden ? 'none' : `1px solid ${isSel ? C.accentBorder : C.nodeHeaderSep}`,
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                        <rect x="0.5" y="0.5" width="13" height="4" rx="1" stroke={C.tableIcon} strokeWidth="1"/>
                        <rect x="0.5" y="5.5" width="6" height="8" rx="1" stroke={C.tableIcon} strokeWidth="1"/>
                        <rect x="7.5" y="5.5" width="6" height="8" rx="1" stroke={C.tableIcon} strokeWidth="1"/>
                      </svg>
                      <span className="text-sm font-medium truncate" style={{ color: isSel ? C.textSelected : isHoverSel ? C.textHovered : C.textPrimary, fontSize: 12, fontWeight: isSel ? 700 : 600, transition: 'color 0.15s ease' }}>
                        {table.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: isSel ? 'rgba(59,130,246,0.22)' : 'rgba(59,130,246,0.12)', color: isSel ? '#93c5fd' : 'rgba(147,197,253,0.6)', border: `1px solid ${isSel ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.18)'}` }}>
                        {table.columns.length}
                      </span>
                      {/* Collapse toggle (not shown in NAME mode since body is always hidden) */}
                      {showMode !== 'name' && (
                        <button
                          onClick={e => toggleCollapse(table.name, e)}
                          className="flex items-center justify-center rounded transition-colors"
                          style={{ color: C.textMuted, width: 16, height: 16 }}
                          onMouseEnter={e => (e.currentTarget.style.color = C.textSecondary)}
                          onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}
                          title={isCollapsed ? 'Expand' : 'Collapse'}
                        >
                          {isCollapsed
                            ? <ChevronRight className="h-3 w-3" />
                            : <ChevronDown className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Columns (hidden in NAME mode or when collapsed) ── */}
                  {!bodyHidden && (
                    <div className="overflow-y-auto overflow-x-hidden" style={{ maxHeight: 280 }}>
                      {cols.length === 0 ? (
                        <div className="px-3 py-3 text-[11px] italic" style={{ color: C.textDim }}>
                          No key columns
                        </div>
                      ) : (
                        cols.map((col, idx) => {
                          const isLast   = idx === cols.length - 1;
                          const relKey   = col.isForeignKey && col.references
                            ? `${table.name}.${col.name}->${col.references.table}` : null;
                          const isRelHov = relKey === hoveredRel;
                          const isRelHlt = !!relKey && (selectedTable === table.name || selectedTable === col.references?.table);

                          const rowBg = isRelHov || isRelHlt
                            ? 'rgba(59,130,246,0.1)'
                            : 'transparent';

                          const isHighlightedTable = isSel || isConn || isHoverSel || isHoverConn;

                          return (
                            <div
                              key={col.name}
                              className="relative transition-colors"
                              style={{
                                height: ROW_H, display: 'grid', gridTemplateColumns: 'auto 1fr auto',
                                alignItems: 'center', gap: 6,
                                paddingLeft: 8, paddingRight: col.isForeignKey ? 12 : 8,
                                borderBottom: !isLast ? `1px solid ${C.nodeRowSep}` : undefined,
                                background: rowBg,
                              }}
                              onMouseEnter={e => { if (!isRelHov && !isRelHlt) (e.currentTarget as HTMLDivElement).style.background = C.nodeRowHov; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = rowBg; }}
                            >
                              {/* FK dot connector */}
                              {col.isForeignKey && (
                                <div
                                  className="absolute right-0 top-1/2 h-2.5 w-2.5 rounded-full border transition-all"
                                  style={{
                                    borderColor: C.canvasBg,
                                    background: isRelHov ? C.fkDotHov : isRelHlt ? C.fkDotActive : C.fkDot,
                                    transform: 'translate(50%, -50%)',
                                    zIndex: 10,
                                    transition: 'background 0.15s ease',
                                  }}
                                />
                              )}

                              {/* Column icon */}
                              <div style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {col.isPrimaryKey ? (
                                  <Key className="h-3.5 w-3.5" style={{ color: '#fbbf24' }} />
                                ) : col.isForeignKey ? (
                                  <Link className="h-3.5 w-3.5" style={{ color: '#60a5fa' }} />
                                ) : col.nullable ? (
                                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                    <path d="M 5 1 L 9 5 L 5 9 L 1 5 Z" stroke={C.colIconNullable} strokeWidth="1.2" fill="none" />
                                  </svg>
                                ) : (
                                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                    <path d="M 5 1 L 9 5 L 5 9 L 1 5 Z" fill={C.colIconRequired} />
                                  </svg>
                                )}
                              </div>

                              {/* Column name + FK hint */}
                              <div className="min-w-0 flex flex-col justify-center">
                                <span className="text-xs truncate" style={{
                                  color: col.isPrimaryKey ? (D ? '#fde68a' : '#b45309') : col.isForeignKey ? C.textSelected : C.textPrimary,
                                  fontWeight: col.isPrimaryKey ? 700 : 400,
                                  fontSize: 11,
                                }}>
                                  {col.name}
                                </span>
                                {col.isForeignKey && col.references && (
                                  <span className="text-[9px] truncate" style={{ color: C.fkHint, lineHeight: 1 }}>
                                    ↗ {col.references.table}
                                  </span>
                                )}
                              </div>

                              {/* Column type badge — colored per type category */}
                              <span
                                className="text-[10px] font-mono flex-shrink-0 rounded px-1"
                                style={{
                                  color: isHighlightedTable || isRelHov ? typeColor(col.type) : typeColor(col.type) + '88',
                                  background: isHighlightedTable || isRelHov ? typeColor(col.type) + '18' : 'transparent',
                                  transition: 'color 0.2s ease, background 0.2s ease',
                                  border: isHighlightedTable || isRelHov ? `1px solid ${typeColor(col.type)}30` : '1px solid transparent',
                                }}
                              >
                                {shortType(col.type)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Minimap ── */}
          {showMinimap && (
            <div
              className="absolute bottom-5 right-5 rounded-xl p-2.5 shadow-2xl"
              style={{
                background: C.minimapBg,
                border: `1px solid ${C.minimapBorder}`,
                backdropFilter: 'blur(12px)',
                boxShadow: D ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.06)' : '0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(59,130,246,0.1)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: C.accentText }}>OVERVIEW</p>
                <div className="flex gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: '#3b82f6' }} />
                  <span className="text-[9px]" style={{ color: C.textMuted }}>
                    {displayedTables.length} shown
                  </span>
                </div>
              </div>
              <div className="relative rounded-md overflow-hidden" style={{ width: 144, height: 104, background: C.minimapCanvas, border: `1px solid ${C.minimapCanvasBorder}` }}>
                {displayedTables.map(t => {
                  const p = positions.get(t.name); if (!p) return null;
                  const isTSel = selectedTable === t.name;
                  const isTConn = (connectedSet.has(t.name) && !!selectedTable) || (hoveredConnected.has(t.name) && !!hoveredTable);
                  const isTHov = hoveredTable === t.name;
                  return (
                    <div
                      key={t.name}
                      className="absolute rounded-sm transition-all duration-150"
                      style={{
                        left: p.x * 0.038, top: p.y * 0.038,
                        width: 16, height: 9,
                        background: isTSel || isTHov ? '#3b82f6' : isTConn ? 'rgba(59,130,246,0.55)' : C.minimapNode,
                        boxShadow: isTSel || isTHov ? '0 0 6px rgba(59,130,246,0.6)' : 'none',
                      }}
                    />
                  );
                })}
              </div>
              <p className="text-center text-[9px] mt-1.5" style={{ color: C.textDim }}>⌘K palette · ⌘F search · ⌘0 reset</p>
            </div>
          )}
        </div>

        {/* ════════════════════ RIGHT SIDEBAR (table inspector) ════════════════════ */}
        {selectedTable && selectedData && (
          <div
            className="flex flex-col flex-shrink-0 overflow-hidden"
            style={{
              width: 280,
              borderLeft: `1px solid ${C.panelBorder}`,
              background: C.panelBg,
            }}
          >
            {/* Sidebar header */}
            <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: `1px solid ${C.panelBorder}` }}>
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: C.textMuted }}>Table Inspector</p>
                <h2 className="text-sm font-bold truncate" style={{ color: C.textSelected, fontSize: 13 }}>{selectedTable}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap" style={{ fontSize: 10 }}>
                  <SidebarStat color={C.textSecondary} label={`${selectedData.columns.length} cols`} textColor={C.textMuted} />
                  <SidebarStat color="#f59e0b" label={`${selectedData.columns.filter(c => c.isPrimaryKey).length} PK`} textColor={C.textMuted} />
                  <SidebarStat color="#60a5fa" label={`${selectedData.columns.filter(c => c.isForeignKey).length} FK`} textColor={C.textMuted} />
                  <SidebarStat color={C.textMuted} label={`${selectedData.columns.filter(c => !c.nullable).length} req`} textColor={C.textMuted} />
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0 mt-0.5">
                <button
                  onClick={() => focusTable(selectedTable)}
                  className="flex items-center justify-center rounded-md transition-colors"
                  style={{ width: 24, height: 24, color: C.textMuted, background: C.inputBg }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#3b82f6')}
                  onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}
                  title="Focus on table"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { setSelectedTable(null); setRelatedOnly(false); }}
                  className="flex items-center justify-center rounded-md transition-colors"
                  style={{ width: 24, height: 24, color: C.textMuted, background: C.inputBg }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.textPrimary)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}
                  title="Close (Esc)"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Related only toggle */}
            <div className="px-4 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${C.panelBorder}` }}>
              <button
                onClick={() => setRelatedOnly(v => !v)}
                className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-xs transition-colors"
                style={{
                  background: relatedOnly ? C.accentBg : C.inputBg,
                  border: relatedOnly ? `1px solid ${C.accentBorder}` : `1px solid ${C.inputBorder}`,
                  color: relatedOnly ? C.accent : C.textSecondary,
                }}
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="font-medium">Show related only</span>
                </div>
                <span className="text-[9px] font-semibold rounded px-1.5 py-0.5" style={{ background: C.kbdBg, color: C.textMuted }}>
                  {1 + connectedSet.size} tables
                </span>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto" style={{ fontSize: 11 }}>

              <SidebarSection label="Columns" count={selectedData.columns.length} bg={C.sectionBg} border={C.panelBorder} textMuted={C.textMuted} accentText={C.accentText} accentBg={C.accentBg} accentBorder={C.accentBorder}>
                {selectedData.columns.map(col => (
                  <div
                    key={col.name}
                    className="flex items-center gap-2 px-4 py-1.5 transition-colors"
                    style={{ borderBottom: `1px solid ${C.panelRowBorder}`, minHeight: 30 }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.inputBg)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 14, flexShrink: 0 }}>
                      {col.isPrimaryKey ? (
                        <Key className="h-3 w-3" style={{ color: '#f59e0b' }} />
                      ) : col.isForeignKey ? (
                        <Link className="h-3 w-3" style={{ color: '#60a5fa' }} />
                      ) : col.nullable ? (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M4 0.5L7.5 4L4 7.5L0.5 4Z" stroke={C.colIconNullable} strokeWidth="1" fill="none"/>
                        </svg>
                      ) : (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M4 0.5L7.5 4L4 7.5L0.5 4Z" fill={C.colIconRequired}/>
                        </svg>
                      )}
                    </div>
                    <span className="flex-1 min-w-0 truncate" style={{
                      color: col.isPrimaryKey ? (D ? '#fde68a' : '#b45309') : col.isForeignKey ? C.textSelected : C.textPrimary,
                      fontWeight: col.isPrimaryKey ? 600 : 400,
                    }}>
                      {col.name}
                      {!col.nullable && <span style={{ color: D ? 'rgba(251,146,60,0.8)' : '#ea580c', marginLeft: 2 }}>*</span>}
                    </span>
                    <span className="font-mono flex-shrink-0 rounded px-1" style={{ color: typeColor(col.type), background: typeColor(col.type) + '18', border: `1px solid ${typeColor(col.type)}28`, fontSize: 10 }}>
                      {shortType(col.type)}
                    </span>
                  </div>
                ))}
              </SidebarSection>

              {outgoingFKs.length > 0 && (
                <SidebarSection label="References" count={outgoingFKs.length} bg={C.sectionBg} border={C.panelBorder} textMuted={C.textMuted} accentText={C.accentText} accentBg={C.accentBg} accentBorder={C.accentBorder}>
                  {outgoingFKs.map(r => (
                    <button
                      key={r.col}
                      className="w-full flex items-center gap-2 px-4 py-2 text-left transition-colors"
                      style={{ borderBottom: `1px solid ${C.panelRowBorder}` }}
                      onMouseEnter={e => {
                        (e.currentTarget.style.background = C.accentBg);
                        setHoveredRel(`${selectedTable}.${r.col}->${r.toTable}`);
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget.style.background = 'transparent');
                        setHoveredRel(null);
                      }}
                      onClick={() => { setSelectedTable(r.toTable); onTableClick(r.toTable); }}
                    >
                      <ArrowRight className="h-3 w-3 flex-shrink-0" style={{ color: C.accent }} />
                      <div className="min-w-0">
                        <div className="truncate" style={{ color: C.accent, fontWeight: 500 }}>{r.toTable}</div>
                        <div className="truncate text-[9px]" style={{ color: C.textMuted }}>
                          via {r.col} → {r.toCol}
                        </div>
                      </div>
                    </button>
                  ))}
                </SidebarSection>
              )}

              {incomingFKs.length > 0 && (
                <SidebarSection label="Referenced by" count={incomingFKs.length} bg={C.sectionBg} border={C.panelBorder} textMuted={C.textMuted} accentText={C.accentText} accentBg={C.accentBg} accentBorder={C.accentBorder}>
                  {incomingFKs.map((r, i) => (
                    <button
                      key={i}
                      className="w-full flex items-center gap-2 px-4 py-2 text-left transition-colors"
                      style={{ borderBottom: `1px solid ${C.panelRowBorder}` }}
                      onMouseEnter={e => {
                        (e.currentTarget.style.background = C.accentBg);
                        setHoveredRel(`${r.fromTable}.${r.fromCol}->${selectedTable}`);
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget.style.background = 'transparent');
                        setHoveredRel(null);
                      }}
                      onClick={() => { setSelectedTable(r.fromTable); onTableClick(r.fromTable); }}
                    >
                      <ArrowRight className="h-3 w-3 flex-shrink-0 rotate-180" style={{ color: 'rgba(59,130,246,0.65)' }} />
                      <div className="min-w-0">
                        <div className="truncate" style={{ color: D ? 'rgba(59,130,246,0.8)' : '#2563eb', fontWeight: 500 }}>{r.fromTable}</div>
                        <div className="truncate text-[9px]" style={{ color: C.textMuted }}>
                          via {r.fromCol}
                        </div>
                      </div>
                    </button>
                  ))}
                </SidebarSection>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════ COMMAND PALETTE ════════════════════ */}
      {showCommandPalette && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCommandPalette(false); }}
        >
          <div
            className="flex flex-col rounded-xl shadow-2xl overflow-hidden"
            style={{
              width: 560, maxHeight: '65vh',
              background: C.cmdBg,
              border: `1px solid ${C.inputBorder}`,
              boxShadow: D ? '0 32px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(59,130,246,0.08)' : '0 16px 48px rgba(0,0,0,0.15), 0 0 0 1px rgba(59,130,246,0.12)',
            }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${C.panelBorder}` }}>
              <Search className="h-4 w-4 flex-shrink-0" style={{ color: C.textMuted }} />
              <input
                ref={cmdRef}
                type="text"
                placeholder="Search tables, run commands…"
                value={commandSearch}
                onChange={e => setCommandSearch(e.target.value)}
                onKeyDown={handleCmdKeyDown}
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: C.textPrimary }}
              />
              {commandSearch && (
                <button onClick={() => setCommandSearch('')} style={{ color: C.textMuted }}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd className="rounded px-1.5 py-0.5 text-[10px] font-mono" style={{ background: C.kbdBg, color: C.kbdText }}>Esc</kbd>
            </div>

            {/* Items */}
            <div ref={cmdListRef} className="overflow-y-auto flex-1">
              {/* Tables section header */}
              {commandItems.filter(i => i.category === 'table').length > 0 && (
                <div className="px-4 py-2 sticky top-0" style={{ background: C.cmdSectionBg, borderBottom: `1px solid ${C.panelBorder}` }}>
                  <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: C.textMuted }}>Tables</span>
                </div>
              )}
              {commandItems.filter(i => i.category === 'table').map((item) => {
                const isActive = cmdIndex === commandItems.indexOf(item);
                return (
                  <button
                    key={item.id}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{
                      background: isActive ? C.cmdItemHovBg : 'transparent',
                      borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                    }}
                    onClick={item.action}
                    onMouseEnter={() => setCmdIndex(commandItems.indexOf(item))}
                  >
                    <div style={{ color: isActive ? C.accent : C.textMuted, flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: isActive ? C.accent : C.textPrimary }}>
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="text-[10px] truncate" style={{ color: C.textMuted }}>
                          {item.description}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <kbd className="rounded px-1.5 py-0.5 text-[9px] font-mono flex-shrink-0" style={{ background: C.accentBg, color: C.accent }}>↵</kbd>
                    )}
                  </button>
                );
              })}

              {/* Actions section header */}
              {commandItems.filter(i => i.category === 'action').length > 0 && (
                <div className="px-4 py-2 sticky top-0 mt-1" style={{ background: C.cmdSectionBg, borderBottom: `1px solid ${C.panelBorder}`, borderTop: `1px solid ${C.panelBorder}` }}>
                  <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: C.textMuted }}>Commands</span>
                </div>
              )}
              {commandItems.filter(i => i.category === 'action').map((item) => {
                const isActive = cmdIndex === commandItems.indexOf(item);
                return (
                  <button
                    key={item.id}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{
                      background: isActive ? C.cmdItemHovBg : 'transparent',
                      borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                    }}
                    onClick={item.action}
                    onMouseEnter={() => setCmdIndex(commandItems.indexOf(item))}
                  >
                    <div style={{ color: isActive ? C.accent : C.textMuted, flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: isActive ? C.accent : C.textPrimary }}>
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="text-[10px] truncate" style={{ color: C.textMuted }}>
                          {item.description}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <kbd className="rounded px-1.5 py-0.5 text-[9px] font-mono flex-shrink-0" style={{ background: C.accentBg, color: C.accent }}>↵</kbd>
                    )}
                  </button>
                );
              })}

              {commandItems.length === 0 && (
                <div className="px-4 py-8 text-center text-sm" style={{ color: C.textMuted }}>
                  No results for "{commandSearch}"
                </div>
              )}
            </div>

            {/* Footer hints */}
            <div className="flex items-center gap-4 px-4 py-2" style={{ borderTop: `1px solid ${C.panelBorder}`, background: C.cmdFooterBg }}>
              {[
                { keys: ['↑', '↓'], label: 'navigate' },
                { keys: ['↵'], label: 'select' },
                { keys: ['Esc'], label: 'close' },
              ].map(({ keys, label }) => (
                <span key={label} className="flex items-center gap-1 text-[10px]" style={{ color: C.textDim }}>
                  {keys.map(k => (
                    <kbd key={k} className="rounded px-1 py-0.5 font-mono" style={{ background: C.kbdBg, color: C.kbdText, fontSize: 9 }}>{k}</kbd>
                  ))}
                  {label}
                </span>
              ))}
              <span className="ml-auto text-[10px]" style={{ color: C.textDim }}>
                {commandItems.length} result{commandItems.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

type Colors = {
  inputBorder: string; inputBg: string; textSecondary: string; textMuted: string; textPrimary: string;
  accentBg: string; accentBorder: string; accentText: string; panelBg: string; panelBorder: string;
};

function ToolbarToggle({
  active, onClick, icon, label, C
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; C: Colors }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all"
      style={{
        background: active ? C.accentBg : 'transparent',
        border: active ? `1px solid ${C.accentBorder}` : `1px solid ${C.inputBorder}`,
        color: active ? '#3b82f6' : C.textSecondary,
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget.style.background = C.inputBg); }}
      onMouseLeave={e => { if (!active) (e.currentTarget.style.background = 'transparent'); }}
    >
      {icon} {label}
    </button>
  );
}

function ToolbarBtn({
  onClick, icon, label, title, C
}: { onClick: () => void; icon: React.ReactNode; label: string; title?: string; C: Colors }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
      style={{ color: C.textSecondary, border: `1px solid ${C.inputBorder}`, background: 'transparent' }}
      onMouseEnter={e => { (e.currentTarget.style.background = C.inputBg); (e.currentTarget.style.color = C.textPrimary); }}
      onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = C.textSecondary); }}
    >
      {icon} {label}
    </button>
  );
}

function SidebarStat({ color, label, textColor }: { color: string; label: string; textColor: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-1 w-1 rounded-full" style={{ background: color }} />
      <span style={{ color: textColor }}>{label}</span>
    </span>
  );
}

function SidebarSection({ label, count, bg, border, textMuted, accentText, accentBg, accentBorder, children }: {
  label: string; count: number; bg: string; border: string; textMuted: string;
  accentText: string; accentBg: string; accentBorder: string; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2 sticky top-0" style={{ background: bg, borderBottom: `1px solid ${border}` }}>
        <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: textMuted }}>{label}</span>
        <span className="rounded-full px-1.5 text-[9px] font-semibold" style={{ background: accentBg, color: accentText, border: `1px solid ${accentBorder}` }}>{count}</span>
      </div>
      {children}
    </div>
  );
}
