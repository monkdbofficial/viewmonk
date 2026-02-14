'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Clock,
  Target,
  Wind,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// POLLUTION POINTER PANEL COMPONENT
// ============================================================================
// Purpose: Display comprehensive pollution intelligence
// Shows: What, Where, Why, How, Solutions with evidence
// ============================================================================

interface PollutionPointer {
  pointer_id: string;
  timestamp: string;
  aqi_impact: number;
  what: {
    primary_pollutants: Record<string, number>;
    pollutant_ratios: Record<string, number>;
    signature_match: string;
    fingerprint_confidence: number;
  };
  where: {
    coordinates: [number, number];
    spatial_radius_m: number;
    affected_area_sqkm: number;
    nearby_assets: any[];
    upwind_direction_deg: number;
    distance_to_source_m: number;
  };
  why: {
    primary_cause: string;
    contributing_factors: string[];
    atmospheric_conditions: any;
    temporal_patterns: any;
  };
  how: {
    emission_mechanism: string;
    transport_pathway: string;
    accumulation_factors: string[];
    time_to_impact_minutes: number;
  };
  solutions: Solution[];
  confidence_score: number;
  evidence_count: number;
}

interface Solution {
  action_type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimated_cost_usd: number;
  estimated_aqi_reduction: number;
  cost_per_aqi_point: number;
  implementation_time_days: number;
  effectiveness_confidence: number;
  historical_success_rate: number;
  requirements: string[];
  responsible_entity: string;
}

interface PollutionPointerPanelProps {
  stationId: string;
  timeRange?: string;
  className?: string;
}

export function PollutionPointerPanel({
  stationId,
  timeRange = '24h',
  className,
}: PollutionPointerPanelProps) {
  const [pointers, setPointers] = useState<PollutionPointer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPointer, setExpandedPointer] = useState<string | null>(null);

  useEffect(() => {
    fetchPollutionPointers();
  }, [stationId, timeRange]);

  const fetchPollutionPointers = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/aqi/analytics/pollution-pointers?station_id=${stationId}&time_range=${timeRange}`
      );

      if (!response.ok) throw new Error('Failed to fetch pollution pointers');

      const data = await response.json();
      setPointers(data.pollution_pointers || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching pollution pointers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="space-y-4">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="text-center text-red-600 dark:text-red-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
          <p className="font-medium">Failed to load pollution pointers</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </Card>
    );
  }

  if (pointers.length === 0) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Target className="w-12 h-12 mx-auto mb-2" />
          <p className="font-medium">No pollution events detected</p>
          <p className="text-sm mt-1">Air quality is within normal ranges</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Target className="w-5 h-5" />
          Pollution Intelligence Pointers
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {pointers.length} event{pointers.length !== 1 ? 's' : ''} detected in last {timeRange}
        </p>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {pointers.map((pointer) => (
          <PollutionPointerItem
            key={pointer.pointer_id}
            pointer={pointer}
            expanded={expandedPointer === pointer.pointer_id}
            onToggle={() =>
              setExpandedPointer(
                expandedPointer === pointer.pointer_id ? null : pointer.pointer_id
              )
            }
          />
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// POLLUTION POINTER ITEM
// ============================================================================

interface PollutionPointerItemProps {
  pointer: PollutionPointer;
  expanded: boolean;
  onToggle: () => void;
}

function PollutionPointerItem({ pointer, expanded, onToggle }: PollutionPointerItemProps) {
  const priorityColors = {
    critical: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-white',
    low: 'bg-blue-500 text-white',
  };

  const topSolution = pointer.solutions[0];

  return (
    <div className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {/* Header - Always visible */}
      <div className="flex items-start justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="font-mono text-xs">
              {new Date(pointer.timestamp).toLocaleString()}
            </Badge>
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              AQI Impact: +{pointer.aqi_impact}
            </Badge>
            <Badge variant="secondary">
              {Math.round(pointer.confidence_score * 100)}% confident
            </Badge>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {pointer.what.signature_match} • {pointer.why.primary_cause}
          </h3>

          {/* Quick summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {pointer.where.affected_area_sqkm.toFixed(1)} km²
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {pointer.how.time_to_impact_minutes} min impact
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {pointer.where.upwind_direction_deg}° upwind
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {pointer.solutions.length} solution{pointer.solutions.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <button className="ml-4 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-6 space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6">
          {/* WHAT */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              WHAT: Pollutant Fingerprint
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(pointer.what.primary_pollutants).map(([pollutant, value]) => (
                <div key={pollutant} className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-gray-600 dark:text-gray-400">{pollutant}</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {value.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(pointer.what.pollutant_ratios[pollutant] * 100).toFixed(1)}% ratio
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WHERE */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              WHERE: Source Location
            </h4>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Coordinates:</span>
                <span className="text-sm font-mono text-gray-900 dark:text-white">
                  {pointer.where.coordinates[0].toFixed(4)}, {pointer.where.coordinates[1].toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Affected Radius:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {pointer.where.spatial_radius_m} meters
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Nearby Assets:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {pointer.where.nearby_assets.length} identified
                </span>
              </div>
            </div>
          </div>

          {/* WHY */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              WHY: Root Causes
            </h4>
            <div className="space-y-2">
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-3 rounded-lg">
                <div className="text-sm font-semibold text-red-900 dark:text-red-400">
                  Primary Cause
                </div>
                <div className="text-sm text-red-800 dark:text-red-300 mt-1">
                  {pointer.why.primary_cause}
                </div>
              </div>
              {pointer.why.contributing_factors.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg">
                  <div className="text-sm font-semibold text-yellow-900 dark:text-yellow-400 mb-2">
                    Contributing Factors
                  </div>
                  <ul className="space-y-1">
                    {pointer.why.contributing_factors.map((factor, idx) => (
                      <li key={idx} className="text-sm text-yellow-800 dark:text-yellow-300 flex items-start gap-2">
                        <span className="text-yellow-500 mt-0.5">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* HOW */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              HOW: Emission & Transport
            </h4>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg space-y-2">
              <div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Emission Mechanism:</span>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {pointer.how.emission_mechanism}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Transport Pathway:</span>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {pointer.how.transport_pathway}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Time to Impact:</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                  {pointer.how.time_to_impact_minutes} minutes
                </p>
              </div>
            </div>
          </div>

          {/* SOLUTIONS */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              SOLUTIONS: Recommended Actions
            </h4>
            <div className="space-y-3">
              {pointer.solutions.map((solution, idx) => (
                <div
                  key={idx}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge className={priorityColors[solution.priority]}>
                        {solution.priority.toUpperCase()}
                      </Badge>
                      <h5 className="font-semibold text-gray-900 dark:text-white mt-2">
                        {solution.action_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </h5>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600 dark:text-gray-400">Success Rate</div>
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {Math.round(solution.historical_success_rate * 100)}%
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                    {solution.description}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Cost
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        ${(solution.estimated_cost_usd / 1000).toFixed(0)}K
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">AQI Reduction</div>
                      <div className="font-semibold text-green-600 dark:text-green-400">
                        -{solution.estimated_aqi_reduction}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Cost/AQI Point</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        ${(solution.cost_per_aqi_point / 1000).toFixed(1)}K
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Timeline
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {solution.implementation_time_days}d
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Responsible: {solution.responsible_entity}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
