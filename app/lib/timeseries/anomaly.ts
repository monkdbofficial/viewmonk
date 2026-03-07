// ── Anomaly Detection ─────────────────────────────────────────────────────────
// Purely statistical — no ML or external deps.
// Uses full-series mean + population std deviation to define a "normal" band.
// Points outside ±N·σ are flagged as anomalies.

export interface SeriesStats {
  mean:  number;
  std:   number;
  upper: number; // mean + N·σ
  lower: number; // mean - N·σ
}

/**
 * Compute mean and standard deviation for a data series.
 * Returns band bounds at the given sensitivity (σ multiplier).
 */
export function computeSeriesStats(
  data: [string, number][],
  sensitivity: number,
): SeriesStats | null {
  const values = data.map(([, v]) => v).filter((v) => isFinite(v));
  if (values.length < 4) return null; // not enough data to be meaningful

  const mean     = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  const std      = Math.sqrt(variance);

  return {
    mean,
    std,
    upper: mean + sensitivity * std,
    lower: mean - sensitivity * std,
  };
}

/**
 * Return only the data points that fall outside the normal band.
 */
export function detectAnomalies(
  data: [string, number][],
  stats: SeriesStats,
): [string, number][] {
  return data.filter(([, v]) => isFinite(v) && (v > stats.upper || v < stats.lower));
}

/**
 * Build the ECharts markArea config for the normal band (between lower and upper).
 * Applied to the primary series so it appears behind the line.
 */
export function buildBandMarkArea(stats: SeriesStats, bandColor: string) {
  return {
    silent:    true,
    animation: false,
    itemStyle: { color: `${bandColor}12`, borderWidth: 0 },
    data: [[{ yAxis: stats.lower }, { yAxis: stats.upper }]],
  };
}

/**
 * Build the ECharts markLine config for the mean line.
 */
export function buildMeanMarkLine(stats: SeriesStats, color: string) {
  return {
    silent:    true,
    animation: false,
    symbol:    ['none', 'none'],
    data: [{
      yAxis:     stats.mean,
      lineStyle: { color, type: 'dotted' as const, width: 1.5, opacity: 0.6 },
      label: {
        show:      true,
        formatter: `μ ${stats.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        color,
        fontSize:  9,
        position:  'insideEndTop' as const,
      },
    }],
  };
}

/**
 * Build the ECharts markPoint config for anomalous data points.
 * Uses category-axis coord [timestampString, value].
 */
export function buildAnomalyMarkPoints(anomalies: [string, number][]) {
  if (!anomalies.length) return undefined;
  return {
    animation:  false,
    symbol:     'circle',
    symbolSize: 8,
    data: anomalies.map(([ts, v]) => ({
      coord:     [ts, v],
      itemStyle: { color: '#EF4444', borderColor: '#fff', borderWidth: 1.5 },
      tooltip:   { formatter: `⚠ Anomaly: ${v}` },
    })),
  };
}
