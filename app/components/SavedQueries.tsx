'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useToast } from './ToastContext';
import {
  BookmarkIcon,
  FolderIcon,
  SearchIcon,
  TrashIcon,
  StarIcon,
  PlayIcon,
  XIcon,
  ClockIcon,
  TagIcon,
  HashIcon,
  CopyIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DatabaseIcon,
  SlidersHorizontalIcon,
  InboxIcon,
} from 'lucide-react';

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: string;
  connection_id?: string;
  folder?: string;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  last_executed?: string;
  execution_count: number;
}

const STORAGE_KEY = 'monkdb_saved_queries';

export function loadSavedQueries(): SavedQuery[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedQuery[];
  } catch {
    return [];
  }
}

export function persistSavedQueries(queries: SavedQuery[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

type SectionFilter =
  | { type: 'all' }
  | { type: 'favorites' }
  | { type: 'folder'; value: string }
  | { type: 'tag'; value: string };

type SortOrder = 'recent' | 'name' | 'popular';

interface SavedQueriesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery: (query: string) => void;
  connectionId?: string;
}

export default function SavedQueries({
  isOpen,
  onClose,
  onSelectQuery,
}: SavedQueriesProps) {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<SectionFilter>({ type: 'all' });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOrder>('recent');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const refresh = useCallback(() => {
    setQueries(loadSavedQueries());
  }, []);

  useEffect(() => {
    if (isOpen) {
      refresh();
      setSearch('');
      setSection({ type: 'all' });
      setExpandedId(null);
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [isOpen, refresh]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isOpen, onClose]);

  // Derived: folders and tags with counts
  const folderCounts = useMemo(() => {
    const map = new Map<string, number>();
    queries.forEach((q) => { if (q.folder) map.set(q.folder, (map.get(q.folder) ?? 0) + 1); });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [queries]);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    queries.forEach((q) => q.tags.forEach((t) => map.set(t, (map.get(t) ?? 0) + 1)));
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [queries]);

  const favCount = useMemo(() => queries.filter((q) => q.is_favorite).length, [queries]);

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = [...queries];

    if (section.type === 'favorites') list = list.filter((q) => q.is_favorite);
    else if (section.type === 'folder') list = list.filter((q) => q.folder === section.value);
    else if (section.type === 'tag') list = list.filter((q) => q.tags.includes(section.value));

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (q) =>
          q.name.toLowerCase().includes(s) ||
          q.query.toLowerCase().includes(s) ||
          q.description?.toLowerCase().includes(s) ||
          q.folder?.toLowerCase().includes(s) ||
          q.tags.some((t) => t.toLowerCase().includes(s))
      );
    }

    list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'popular') return b.execution_count - a.execution_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return list;
  }, [queries, section, search, sort]);

  const toggleFavorite = (q: SavedQuery, e: React.MouseEvent) => {
    e.stopPropagation();
    const all = loadSavedQueries();
    const updated = all.map((x) =>
      x.id === q.id ? { ...x, is_favorite: !x.is_favorite, updated_at: new Date().toISOString() } : x
    );
    persistSavedQueries(updated);
    setQueries(updated);
  };

  const deleteQuery = (q: SavedQuery, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${q.name}"?`)) return;
    const updated = loadSavedQueries().filter((x) => x.id !== q.id);
    persistSavedQueries(updated);
    setQueries(updated);
    if (expandedId === q.id) setExpandedId(null);
    toast.success('Deleted', `"${q.name}" removed`);
  };

  const loadQuery = (q: SavedQuery, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectQuery(q.query);
    const all = loadSavedQueries();
    const updated = all.map((x) =>
      x.id === q.id
        ? { ...x, execution_count: x.execution_count + 1, last_executed: new Date().toISOString() }
        : x
    );
    persistSavedQueries(updated);
    onClose();
    toast.success('Loaded', `"${q.name}" loaded into editor`);
  };

  const copySQL = (q: SavedQuery, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(q.query);
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 1800);
    toast.success('Copied', 'SQL copied to clipboard');
  };

  const sectionLabel = (s: SectionFilter) => {
    if (s.type === 'all') return 'All Queries';
    if (s.type === 'favorites') return 'Favorites';
    if (s.type === 'folder') return s.value;
    return `#${s.value}`;
  };

  if (!isOpen) return null;

  // ── Sidebar nav item ─────────────────────────────────────────────
  const NavItem = ({
    label,
    count,
    icon,
    active,
    onClick,
  }: {
    label: string;
    count: number;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      <span className={`shrink-0 ${active ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>
        {icon}
      </span>
      <span className="flex-1 truncate font-medium">{label}</span>
      <span
        className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 tabular-nums ${
          active
            ? 'bg-white/20 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}
      >
        {count}
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-6xl mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
        style={{ height: 'min(88vh, 720px)' }}
      >
        {/* ── Top bar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <BookmarkIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-none">
                Saved Queries
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {queries.length} saved · {filtered.length} shown
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
          >
            <XIcon className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* ── Body: sidebar + main ─────────────────────────────── */}
        <div className="flex flex-1 min-h-0">
          {/* ── Sidebar ── */}
          <aside className="w-52 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 flex flex-col overflow-y-auto p-3 gap-1">
            <NavItem
              label="All Queries"
              count={queries.length}
              icon={<DatabaseIcon className="h-3.5 w-3.5" />}
              active={section.type === 'all'}
              onClick={() => setSection({ type: 'all' })}
            />
            <NavItem
              label="Favorites"
              count={favCount}
              icon={<StarIcon className="h-3.5 w-3.5" />}
              active={section.type === 'favorites'}
              onClick={() => setSection({ type: 'favorites' })}
            />

            {folderCounts.length > 0 && (
              <>
                <div className="pt-2 pb-1 px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    Folders
                  </span>
                </div>
                {folderCounts.map(([folder, count]) => (
                  <NavItem
                    key={folder}
                    label={folder}
                    count={count}
                    icon={<FolderIcon className="h-3.5 w-3.5" />}
                    active={section.type === 'folder' && section.value === folder}
                    onClick={() => setSection({ type: 'folder', value: folder })}
                  />
                ))}
              </>
            )}

            {tagCounts.length > 0 && (
              <>
                <div className="pt-2 pb-1 px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    Tags
                  </span>
                </div>
                {tagCounts.map(([tag, count]) => (
                  <NavItem
                    key={tag}
                    label={tag}
                    count={count}
                    icon={<HashIcon className="h-3.5 w-3.5" />}
                    active={section.type === 'tag' && section.value === tag}
                    onClick={() => setSection({ type: 'tag', value: tag })}
                  />
                ))}
              </>
            )}
          </aside>

          {/* ── Main area ── */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Search + sort bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search in ${sectionLabel(section)}…`}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <SlidersHorizontalIcon className="h-3.5 w-3.5 text-gray-400 mr-0.5" />
                {(['recent', 'name', 'popular'] as SortOrder[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                      sort === s
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Query list */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <InboxIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {queries.length === 0
                      ? 'No saved queries yet'
                      : search
                      ? `No results for "${search}"`
                      : 'Nothing in this section'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {queries.length === 0
                      ? 'Press Save in the toolbar to save your current query'
                      : 'Try adjusting your search or filter'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {filtered.map((q) => {
                    const isExpanded = expandedId === q.id;
                    return (
                      <li
                        key={q.id}
                        onClick={() => setExpandedId(isExpanded ? null : q.id)}
                        className={`group cursor-pointer transition-colors ${
                          isExpanded
                            ? 'bg-blue-50 dark:bg-blue-900/10'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                        }`}
                      >
                        {/* Row header */}
                        <div className="flex items-start gap-3 px-4 py-3">
                          {/* Favorite */}
                          <button
                            onClick={(e) => toggleFavorite(q, e)}
                            className="mt-0.5 shrink-0 p-0.5 rounded hover:scale-110 transition-transform"
                            title={q.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <StarIcon
                              className={`h-4 w-4 ${
                                q.is_favorite
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300 dark:text-gray-600 group-hover:text-gray-400'
                              }`}
                            />
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {q.name}
                              </span>
                              {q.folder && (
                                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                  <FolderIcon className="h-3 w-3" />
                                  {q.folder}
                                </span>
                              )}
                            </div>

                            {q.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">
                                {q.description}
                              </p>
                            )}

                            {/* SQL preview (collapsed) */}
                            {!isExpanded && (
                              <code className="block text-xs text-gray-600 dark:text-gray-400 font-mono truncate">
                                {q.query.replace(/\s+/g, ' ').trim()}
                              </code>
                            )}

                            {/* Meta row */}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {q.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                                >
                                  <HashIcon className="h-2.5 w-2.5" />
                                  {tag}
                                </span>
                              ))}
                              {q.execution_count > 0 && (
                                <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                                  <ClockIcon className="h-3 w-3" />
                                  {q.execution_count}× used
                                </span>
                              )}
                              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                saved {formatRelativeTime(q.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Actions — always visible on hover or expanded */}
                          <div
                            className={`flex items-center gap-1 shrink-0 transition-opacity ${
                              isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => copySQL(q, e)}
                              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
                              title="Copy SQL"
                            >
                              {copiedId === q.id ? (
                                <CheckIcon className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <CopyIcon className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              onClick={(e) => deleteQuery(q, e)}
                              className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => loadQuery(q, e)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors"
                            >
                              <PlayIcon className="h-3 w-3" />
                              Load
                            </button>
                          </div>

                          {/* Expand chevron */}
                          <span className="shrink-0 text-gray-400 dark:text-gray-500 mt-0.5">
                            {isExpanded ? (
                              <ChevronUpIcon className="h-4 w-4" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4" />
                            )}
                          </span>
                        </div>

                        {/* Expanded SQL panel */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-0" onClick={(e) => e.stopPropagation()}>
                            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700/60 border-b border-gray-200 dark:border-gray-600">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  SQL
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={(e) => copySQL(q, e)}
                                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                  >
                                    {copiedId === q.id ? (
                                      <CheckIcon className="h-3 w-3 text-green-500" />
                                    ) : (
                                      <CopyIcon className="h-3 w-3" />
                                    )}
                                    {copiedId === q.id ? 'Copied' : 'Copy'}
                                  </button>
                                  <button
                                    onClick={(e) => loadQuery(q, e)}
                                    className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded font-semibold transition-colors"
                                  >
                                    <PlayIcon className="h-3 w-3" />
                                    Load into Editor
                                  </button>
                                </div>
                              </div>
                              <pre className="p-3 text-xs font-mono text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                {q.query}
                              </pre>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Bottom status bar */}
            <div className="shrink-0 px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {filtered.length} of {queries.length} queries
                {search && ` matching "${search}"`}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Stored locally in browser · not synced
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
