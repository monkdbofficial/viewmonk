'use client';

import { useState } from 'react';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  ClockIcon,
  DatabaseIcon,
} from 'lucide-react';

interface ExplainNode {
  'Node Type'?: string;
  'Relation Name'?: string;
  'Index Name'?: string;
  'Startup Cost'?: number;
  'Total Cost'?: number;
  'Plan Rows'?: number;
  'Plan Width'?: number;
  'Actual Startup Time'?: number;
  'Actual Total Time'?: number;
  'Actual Rows'?: number;
  'Actual Loops'?: number;
  'Filter'?: string;
  'Join Type'?: string;
  'Index Cond'?: string;
  'Plans'?: ExplainNode[];
  [key: string]: any;
}

interface ExplainPlan {
  Plan?: ExplainNode;
  'Planning Time'?: number;
  'Execution Time'?: number;
  [key: string]: any;
}

interface ExplainVisualizerProps {
  explainData: any;
  isAnalyze: boolean;
}

export default function ExplainVisualizer({ explainData, isAnalyze }: ExplainVisualizerProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

  // Parse EXPLAIN output
  const parsePlan = (): ExplainPlan | null => {
    try {
      // If it's a JSON string, parse it
      if (typeof explainData === 'string') {
        const parsed = JSON.parse(explainData);
        return Array.isArray(parsed) ? parsed[0] : parsed;
      }
      // If it's already an object
      return Array.isArray(explainData) ? explainData[0] : explainData;
    } catch {
      return null;
    }
  };

  const plan = parsePlan();

  if (!plan || !plan.Plan) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <AlertTriangleIcon className="h-5 w-5" />
          <span>Unable to parse EXPLAIN output. Ensure the query uses FORMAT JSON.</span>
        </div>
      </div>
    );
  }

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const getCostColor = (cost: number): string => {
    if (cost < 100) return 'text-green-600 dark:text-green-400';
    if (cost < 1000) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getNodeIcon = (nodeType: string) => {
    const type = nodeType.toLowerCase();
    if (type.includes('index')) return '📇';
    if (type.includes('seq scan')) return '📊';
    if (type.includes('join')) return '🔗';
    if (type.includes('aggregate')) return '∑';
    if (type.includes('sort')) return '↕️';
    if (type.includes('hash')) return '#';
    return '⚙️';
  };

  const renderNode = (node: ExplainNode, depth: number = 0, parentId: string = 'root', index: number = 0): React.ReactElement => {
    const nodeId = `${parentId}-${index}`;
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = node.Plans && node.Plans.length > 0;

    const nodeType = node['Node Type'] || 'Unknown';
    const totalCost = node['Total Cost'] || 0;
    const actualTime = node['Actual Total Time'];
    const actualRows = node['Actual Rows'];
    const planRows = node['Plan Rows'];

    return (
      <div key={nodeId} className="mb-2">
        <div
          className={`flex items-start gap-2 p-3 rounded-lg border transition-colors ${
            depth === 0
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          {/* Expand/collapse button */}
          {hasChildren && (
            <button
              onClick={() => toggleNode(nodeId)}
              className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          )}

          {/* Node content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg">{getNodeIcon(nodeType)}</span>
              <span className="font-semibold text-gray-900 dark:text-white">{nodeType}</span>

              {node['Relation Name'] && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                  {node['Relation Name']}
                </span>
              )}

              {node['Index Name'] && (
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
                  📇 {node['Index Name']}
                </span>
              )}

              {node['Join Type'] && (
                <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded text-xs font-medium">
                  {node['Join Type']}
                </span>
              )}
            </div>

            {/* Cost and timing info */}
            <div className="mt-2 flex items-center gap-4 flex-wrap text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <span className="font-medium">Cost:</span>
                <span className={getCostColor(totalCost)}>{totalCost.toFixed(2)}</span>
              </div>

              {isAnalyze && actualTime !== undefined && (
                <div className="flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" />
                  <span className="font-medium">Time:</span>
                  <span>{actualTime.toFixed(3)}ms</span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <DatabaseIcon className="h-3 w-3" />
                <span className="font-medium">Rows:</span>
                {isAnalyze && actualRows !== undefined ? (
                  <span>
                    {actualRows} <span className="text-gray-400">(est: {planRows})</span>
                  </span>
                ) : (
                  <span>{planRows}</span>
                )}
              </div>

              {isAnalyze && actualRows !== undefined && planRows && actualRows > planRows * 2 && (
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <AlertTriangleIcon className="h-3 w-3" />
                  <span>Row estimate mismatch!</span>
                </div>
              )}
            </div>

            {/* Additional details */}
            {(node['Index Cond'] || node['Filter']) && (
              <div className="mt-2 space-y-1">
                {node['Index Cond'] && (
                  <div className="text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Index Condition: </span>
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-900 rounded text-gray-800 dark:text-gray-200">
                      {node['Index Cond']}
                    </code>
                  </div>
                )}
                {node['Filter'] && (
                  <div className="text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Filter: </span>
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-900 rounded text-gray-800 dark:text-gray-200">
                      {node['Filter']}
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Child nodes */}
        {hasChildren && isExpanded && (
          <div className="mt-2">
            {node.Plans!.map((childNode, idx) => renderNode(childNode, depth + 1, nodeId, idx))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {plan['Planning Time'] !== undefined && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Planning Time</div>
            <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
              {plan['Planning Time'].toFixed(3)}ms
            </div>
          </div>
        )}

        {plan['Execution Time'] !== undefined && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Execution Time</div>
            <div className="text-lg font-bold text-green-900 dark:text-green-100">
              {plan['Execution Time'].toFixed(3)}ms
            </div>
          </div>
        )}

        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Total Cost</div>
          <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
            {plan.Plan['Total Cost']?.toFixed(2) || 'N/A'}
          </div>
        </div>

        {plan.Plan['Plan Rows'] && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Estimated Rows</div>
            <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
              {plan.Plan['Plan Rows'].toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
        <InfoIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          {isAnalyze ? (
            <span>
              This is an <strong>EXPLAIN ANALYZE</strong> result showing actual execution metrics.
              Click nodes to expand/collapse the query plan tree.
            </span>
          ) : (
            <span>
              This is an <strong>EXPLAIN</strong> result showing estimated execution plan.
              Use <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">EXPLAIN ANALYZE</code> for actual metrics.
            </span>
          )}
        </div>
      </div>

      {/* Query plan tree */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        {renderNode(plan.Plan, 0)}
      </div>
    </div>
  );
}
