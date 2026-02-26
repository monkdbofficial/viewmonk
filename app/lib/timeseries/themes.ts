// ─────────────────────────────────────────────────────────────────────────────
// MonkDB Workbench — Dashboard Theme Definitions
// 6 visually distinct enterprise themes
// ─────────────────────────────────────────────────────────────────────────────

import type { DashboardThemeId } from './types';

export interface ThemeTokens {
  id: DashboardThemeId;
  name: string;
  description: string;

  // Layout
  pageBg: string;       // Tailwind class for page background
  cardBg: string;       // Tailwind class for card/widget background
  cardBorder: string;   // Tailwind class for card border
  cardHover: string;    // Tailwind class for card hover state
  cardShadow: string;   // Tailwind class for card shadow

  // Typography
  textPrimary: string;  // Tailwind class for primary text
  textSecondary: string;
  textMuted: string;

  // Accents
  accentPrimary: string;  // hex color for ECharts
  accentBadge: string;    // Tailwind class for badge/tag
  accentBorder: string;   // Tailwind class for accent-colored border

  // Stat card trend colors
  trendUp: string;    // Tailwind class for positive trend
  trendDown: string;  // Tailwind class for negative trend

  // ECharts color palette (6 colors for series)
  chartColors: string[];

  // Special effects
  glowEffect: boolean;       // neon box-shadow on charts
  glassmorphism: boolean;    // backdrop-blur on cards
  glowColor?: string;        // hex for glow shadow

  // Divider
  divider: string;  // Tailwind class for dividers/separators
}

// ─────────────────────────────────────────────────────────────────────────────

export const THEMES: Record<DashboardThemeId, ThemeTokens> = {

  // ── Dark Navy (IoT / Medical / Professional) ──────────────────────────────
  'dark-navy': {
    id: 'dark-navy',
    name: 'Dark Navy',
    description: 'Deep navy blue — professional and data-dense',
    pageBg:        'bg-[#0A1929]',
    cardBg:        'bg-[#0D2137]',
    cardBorder:    'border border-blue-900/40',
    cardHover:     'hover:border-blue-700/60',
    cardShadow:    'shadow-lg shadow-black/30',
    textPrimary:   'text-white',
    textSecondary: 'text-blue-100/80',
    textMuted:     'text-blue-300/50',
    accentPrimary: '#3B82F6',
    accentBadge:   'bg-blue-500/20 text-blue-300',
    accentBorder:  'border-blue-500/50',
    trendUp:       'text-emerald-400',
    trendDown:     'text-red-400',
    chartColors:   ['#3B82F6', '#06B6D4', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'],
    glowEffect:    false,
    glassmorphism: false,
    divider:       'border-blue-900/50',
  },

  // ── Midnight Glow (Analytics / Neon Blue) ─────────────────────────────────
  'midnight-glow': {
    id: 'midnight-glow',
    name: 'Midnight Glow',
    description: 'Near-black with glowing neon-cyan charts',
    pageBg:        'bg-[#050D1A]',
    cardBg:        'bg-[#0A1628]',
    cardBorder:    'border border-cyan-900/30',
    cardHover:     'hover:border-cyan-600/50',
    cardShadow:    'shadow-xl shadow-cyan-950/50',
    textPrimary:   'text-cyan-50',
    textSecondary: 'text-cyan-100/70',
    textMuted:     'text-cyan-400/50',
    accentPrimary: '#00D4FF',
    accentBadge:   'bg-cyan-500/20 text-cyan-300',
    accentBorder:  'border-cyan-500/50',
    trendUp:       'text-cyan-400',
    trendDown:     'text-rose-400',
    chartColors:   ['#00D4FF', '#0066FF', '#7C3AED', '#06B6D4', '#3B82F6', '#A78BFA'],
    glowEffect:    true,
    glassmorphism: false,
    glowColor:     '#00D4FF',
    divider:       'border-cyan-900/40',
  },

  // ── Light Clean (Business Admin / Corporate) ──────────────────────────────
  'light-clean': {
    id: 'light-clean',
    name: 'Light Clean',
    description: 'Clean white — professional corporate style',
    pageBg:        'bg-slate-50',
    cardBg:        'bg-white',
    cardBorder:    'border border-gray-200',
    cardHover:     'hover:border-blue-300',
    cardShadow:    'shadow-sm hover:shadow-md',
    textPrimary:   'text-gray-900',
    textSecondary: 'text-gray-600',
    textMuted:     'text-gray-400',
    accentPrimary: '#3B82F6',
    accentBadge:   'bg-blue-50 text-blue-700',
    accentBorder:  'border-blue-400',
    trendUp:       'text-emerald-600',
    trendDown:     'text-red-500',
    chartColors:   ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
    glowEffect:    false,
    glassmorphism: false,
    divider:       'border-gray-200',
  },

  // ── Purple Storm (Finance / Luxury) ───────────────────────────────────────
  'purple-storm': {
    id: 'purple-storm',
    name: 'Purple Storm',
    description: 'Deep purple with gradient glass cards',
    pageBg:        'bg-[#1A0A2E]',
    cardBg:        'bg-[#2D1B4E]/80',
    cardBorder:    'border border-purple-800/40',
    cardHover:     'hover:border-purple-600/60',
    cardShadow:    'shadow-xl shadow-purple-950/60',
    textPrimary:   'text-purple-50',
    textSecondary: 'text-purple-100/80',
    textMuted:     'text-purple-300/60',
    accentPrimary: '#A855F7',
    accentBadge:   'bg-purple-500/20 text-purple-300',
    accentBorder:  'border-purple-500/50',
    trendUp:       'text-emerald-400',
    trendDown:     'text-pink-400',
    chartColors:   ['#A855F7', '#EC4899', '#8B5CF6', '#F472B6', '#C084FC', '#E879F9'],
    glowEffect:    false,
    glassmorphism: true,
    divider:       'border-purple-800/40',
  },

  // ── Neon Cyber (Infrastructure / Cyberpunk) ───────────────────────────────
  'neon-cyber': {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    description: 'Dark black with neon-green system metrics aesthetic',
    pageBg:        'bg-[#000510]',
    cardBg:        'bg-[#0A1020]',
    cardBorder:    'border border-green-900/50',
    cardHover:     'hover:border-green-600/60',
    cardShadow:    'shadow-xl shadow-black/60',
    textPrimary:   'text-green-400',
    textSecondary: 'text-green-300/80',
    textMuted:     'text-green-600/70',
    accentPrimary: '#00FF88',
    accentBadge:   'bg-green-500/10 text-green-400',
    accentBorder:  'border-green-500/50',
    trendUp:       'text-green-400',
    trendDown:     'text-red-400',
    chartColors:   ['#00FF88', '#00D4FF', '#FFFF00', '#FF6B6B', '#A855F7', '#FF8C00'],
    glowEffect:    true,
    glassmorphism: false,
    glowColor:     '#00FF88',
    divider:       'border-green-900/40',
  },

  // ── Warm Vibrant (Weather / General Purpose) ──────────────────────────────
  'warm-vibrant': {
    id: 'warm-vibrant',
    name: 'Warm Vibrant',
    description: 'Dark slate with warm amber and coral accents',
    pageBg:        'bg-slate-900',
    cardBg:        'bg-slate-800',
    cardBorder:    'border border-amber-900/40',
    cardHover:     'hover:border-amber-600/50',
    cardShadow:    'shadow-lg shadow-black/40',
    textPrimary:   'text-white',
    textSecondary: 'text-amber-100/80',
    textMuted:     'text-amber-300/50',
    accentPrimary: '#F59E0B',
    accentBadge:   'bg-amber-500/20 text-amber-300',
    accentBorder:  'border-amber-500/50',
    trendUp:       'text-emerald-400',
    trendDown:     'text-red-400',
    chartColors:   ['#F59E0B', '#EF4444', '#F97316', '#FBBF24', '#10B981', '#60A5FA'],
    glowEffect:    false,
    glassmorphism: false,
    divider:       'border-slate-700',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getTheme(id: DashboardThemeId): ThemeTokens {
  return THEMES[id];
}

export const ALL_THEMES = Object.values(THEMES);

// ECharts global option builder — applies theme colors to any chart
export function buildEChartsTheme(theme: ThemeTokens) {
  return {
    color: theme.chartColors,
    backgroundColor: 'transparent',
    textStyle: {
      color: theme.id === 'light-clean' ? '#374151' : '#ffffff99',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 11,
    },
    grid: {
      borderColor: theme.id === 'light-clean' ? '#E5E7EB' : '#ffffff15',
    },
    legend: {
      textStyle: {
        color: theme.id === 'light-clean' ? '#6B7280' : '#ffffff80',
      },
    },
    tooltip: {
      backgroundColor: theme.id === 'light-clean' ? '#FFFFFF' : '#0D2137',
      borderColor: theme.id === 'light-clean' ? '#E5E7EB' : '#3B82F620',
      textStyle: {
        color: theme.id === 'light-clean' ? '#111827' : '#F9FAFB',
      },
    },
    xAxis: {
      axisLine: { lineStyle: { color: theme.id === 'light-clean' ? '#D1D5DB' : '#ffffff15' } },
      axisTick: { lineStyle: { color: theme.id === 'light-clean' ? '#D1D5DB' : '#ffffff15' } },
      axisLabel: { color: theme.id === 'light-clean' ? '#6B7280' : '#ffffff50' },
      splitLine: { lineStyle: { color: theme.id === 'light-clean' ? '#F3F4F6' : '#ffffff08' } },
    },
    yAxis: {
      axisLine: { lineStyle: { color: theme.id === 'light-clean' ? '#D1D5DB' : '#ffffff15' } },
      axisTick: { lineStyle: { color: theme.id === 'light-clean' ? '#D1D5DB' : '#ffffff15' } },
      axisLabel: { color: theme.id === 'light-clean' ? '#6B7280' : '#ffffff50' },
      splitLine: { lineStyle: { color: theme.id === 'light-clean' ? '#F3F4F6' : '#ffffff08' } },
    },
  };
}
