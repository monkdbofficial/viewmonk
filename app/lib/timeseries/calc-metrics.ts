// ── Calculated Metrics Evaluator ──────────────────────────────────────────────
// Evaluates a formula string (arithmetic + {{var_name}} references) safely.
// Security model: after variable substitution the expression is checked against
// a strict whitelist (digits, arithmetic operators, parens, dots) before eval.

import type { CalculatedMetric } from './types';

/**
 * Evaluate a single calculated-metric formula against a set of variable values.
 * Returns the numeric result, or null if the formula is invalid / variables missing.
 */
export function evalCalcMetric(
  formula: string,
  variables: Record<string, string>,
): number | null {
  let expr = formula.trim();
  if (!expr) return null;

  // Substitute {{var_name}} references — abort if any reference is non-numeric
  let allResolved = true;
  expr = expr.replace(/\{\{([^}]+)\}\}/g, (_, rawName) => {
    const name = rawName.trim();
    const val  = variables[name];
    if (val === undefined) { allResolved = false; return '0'; }
    const n = Number(val);
    if (isNaN(n))          { allResolved = false; return '0'; }
    return String(n);
  });

  if (!allResolved) return null;

  // Whitelist: only allow arithmetic chars — blocks any JS injection
  if (!/^[\d\s+\-*/().]+$/.test(expr)) return null;

  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${expr})`)() as unknown;
    if (typeof result !== 'number' || !isFinite(result)) return null;
    // Remove float noise (e.g. 0.1 + 0.2 = 0.30000000000000004)
    return Math.round(result * 1e10) / 1e10;
  } catch {
    return null;
  }
}

/**
 * Evaluate all calculated metrics and return a flat map of name → string value.
 * The returned map can be merged directly into the variableValues state so that
 * calc results are injected into widget SQL as {{name}} alongside regular vars.
 */
export function evalAllCalcMetrics(
  metrics: CalculatedMetric[],
  variables: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  // Metrics can reference each other in definition order — evaluate sequentially
  const combined = { ...variables };
  for (const m of metrics) {
    const val = evalCalcMetric(m.formula, combined);
    if (val !== null) {
      const decimals = m.decimals ?? 2;
      const str = Number.isInteger(val) ? String(val) : val.toFixed(decimals);
      result[m.name] = str;
      combined[m.name] = str; // make available to later metrics
    }
  }
  return result;
}

/**
 * Format a calculated metric result for display in the UI.
 */
export function formatCalcValue(val: number, metric: CalculatedMetric): string {
  const decimals = metric.decimals ?? 2;
  const str = Number.isInteger(val) && decimals === 0
    ? val.toLocaleString()
    : val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return metric.unit ? `${str} ${metric.unit}` : str;
}
