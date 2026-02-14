'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================================
// KPI CARD COMPONENT
// ============================================================================
// Purpose: Professional KPI display with trend indicators
// Used in: Dashboard headers, metric grids
// ============================================================================

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
    isGood?: boolean; // Whether trend direction is positive
  };
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  comparison?: string; // e.g., "vs yesterday"
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    icon: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
    gradient: 'from-blue-500/10 to-transparent',
  },
  green: {
    bg: 'bg-green-500/10 dark:bg-green-500/20',
    icon: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/20',
    gradient: 'from-green-500/10 to-transparent',
  },
  yellow: {
    bg: 'bg-yellow-500/10 dark:bg-yellow-500/20',
    icon: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-500/20',
    gradient: 'from-yellow-500/10 to-transparent',
  },
  red: {
    bg: 'bg-red-500/10 dark:bg-red-500/20',
    icon: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/20',
    gradient: 'from-red-500/10 to-transparent',
  },
  purple: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    icon: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/20',
    gradient: 'from-purple-500/10 to-transparent',
  },
  gray: {
    bg: 'bg-gray-500/10 dark:bg-gray-500/20',
    icon: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-500/20',
    gradient: 'from-gray-500/10 to-transparent',
  },
};

export function KPICard({
  label,
  value,
  unit,
  trend,
  icon: Icon,
  color = 'blue',
  comparison,
  loading = false,
  onClick,
  className,
}: KPICardProps) {
  const colors = colorClasses[color];

  const getTrendIcon = () => {
    if (!trend) return null;

    if (trend.direction === 'up') return TrendingUp;
    if (trend.direction === 'down') return TrendingDown;
    return Minus;
  };

  const TrendIcon = getTrendIcon();

  const trendColor = trend?.isGood
    ? trend.direction === 'up'
      ? 'text-green-600 dark:text-green-400'
      : trend.direction === 'down'
      ? 'text-red-600 dark:text-red-400'
      : 'text-gray-600 dark:text-gray-400'
    : trend?.direction === 'up'
    ? 'text-red-600 dark:text-red-400'
    : trend?.direction === 'down'
    ? 'text-green-600 dark:text-green-400'
    : 'text-gray-600 dark:text-gray-400';

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        'hover:shadow-lg hover:-translate-y-0.5',
        'border',
        colors.border,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Gradient background */}
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', colors.gradient)} />

      <div className="relative p-6">
        {/* Header with icon */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn('p-3 rounded-lg', colors.bg)}>
            <Icon className={cn('w-6 h-6', colors.icon)} />
          </div>

          {trend && TrendIcon && (
            <div className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
              <TrendIcon className="w-4 h-4" />
              <span>{trend.percentage}%</span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="space-y-1">
          {loading ? (
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
          ) : (
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                {value}
              </h3>
              {unit && (
                <span className="text-lg text-gray-600 dark:text-gray-400">
                  {unit}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {label}
            </p>
            {comparison && (
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {comparison}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div className={cn('h-full animate-pulse', colors.bg)} style={{ width: '60%' }} />
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// KPI GRID COMPONENT
// ============================================================================
// Purpose: Grid layout for multiple KPI cards
// ============================================================================

interface KPIGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

export function KPIGrid({ children, columns = 3, className }: KPIGridProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
}
