// ─────────────────────────────────────────────────────────────────────────────
// MonkDB Workbench — Demo Tables Setup
// Auto-creates _demo_* tables in MonkDB at first template preview.
// All values are computed from current time — nothing is statically hardcoded.
// Tables use _ prefix so they're filtered out of the user-facing table selector.
// ─────────────────────────────────────────────────────────────────────────────

import type { AggregationType } from './types';

// ── Table name registry ───────────────────────────────────────────────────────

export const DEMO_TABLE = {
  iot:            '_demo_iot',
  business:       '_demo_business',
  analytics:      '_demo_analytics',
  finance:        '_demo_finance',
  infrastructure: '_demo_infrastructure',
  weather:        '_demo_weather',
  saas:           '_demo_saas',
  ecommerce:      '_demo_ecommerce',
  devops:         '_demo_devops',
  marketing:      '_demo_marketing',
  supplyChain:    '_demo_supply_chain',
  energy:         '_demo_energy',
} as const;

// ── CREATE TABLE definitions ──────────────────────────────────────────────────

const CREATE_SQLS: string[] = [
  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_iot" (
     ts TIMESTAMP WITH TIME ZONE,
     location TEXT,
     temperature DOUBLE,
     humidity DOUBLE,
     wind_speed DOUBLE
   )`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_business" (
     ts TIMESTAMP WITH TIME ZONE,
     category TEXT,
     customer TEXT,
     product TEXT,
     amount DOUBLE,
     status TEXT
   )`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_analytics" (
     ts TIMESTAMP WITH TIME ZONE,
     event_type TEXT,
     source TEXT,
     user_id TEXT,
     event_value DOUBLE,
     uptime DOUBLE,
     satisfaction_score DOUBLE
   )`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_finance" (
     ts TIMESTAMP WITH TIME ZONE,
     asset TEXT,
     trade_type TEXT,
     amount DOUBLE,
     price DOUBLE,
     trade_total DOUBLE
   )`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_infrastructure" (
     ts TIMESTAMP WITH TIME ZONE,
     service TEXT,
     cpu_pct DOUBLE,
     memory_pct DOUBLE,
     disk_pct DOUBLE,
     network_gbps DOUBLE,
     processes BIGINT
   )`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_weather" (
     ts TIMESTAMP WITH TIME ZONE,
     station TEXT,
     temperature DOUBLE,
     humidity DOUBLE,
     wind_speed DOUBLE,
     condition TEXT
   )`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_saas" (
     ts TIMESTAMP WITH TIME ZONE,
     plan TEXT,
     company TEXT,
     mrr DOUBLE,
     active_users BIGINT,
     churn_rate DOUBLE
   )`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_ecommerce" (
     ts TIMESTAMP WITH TIME ZONE,
     category TEXT,
     channel TEXT,
     customer TEXT,
     order_total DOUBLE,
     items BIGINT,
     status TEXT
   )`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_devops" (
     ts TIMESTAMP WITH TIME ZONE,
     service TEXT,
     environment TEXT,
     build_duration DOUBLE,
     success_rate DOUBLE,
     deploys BIGINT,
     mttr DOUBLE
   )`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_marketing" (
     ts TIMESTAMP WITH TIME ZONE,
     channel TEXT,
     campaign TEXT,
     impressions BIGINT,
     clicks BIGINT,
     conversions BIGINT,
     spend DOUBLE,
     ctr DOUBLE,
     roas DOUBLE
   )`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_supply_chain" (
     ts TIMESTAMP WITH TIME ZONE,
     supplier TEXT,
     category TEXT,
     order_value DOUBLE,
     on_time_rate DOUBLE,
     lead_time DOUBLE,
     fill_rate DOUBLE
   )`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_energy" (
     ts TIMESTAMP WITH TIME ZONE,
     source TEXT,
     zone TEXT,
     consumption_kw DOUBLE,
     solar_kw DOUBLE,
     carbon_intensity DOUBLE,
     efficiency DOUBLE
   )`,
];

// ── Math helpers (no hardcoded values — all computed) ─────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rnd   = (min: number, max: number)           => min + Math.random() * (max - min);

/** Returns 0-1. Peaks at hour 14 (2 PM), trough at hour 2 (2 AM). */
const dailyPeak = (h: number) => (Math.sin(((h - 8) / 12) * Math.PI) + 1) / 2;

/** Returns 1.0 at daysAgo=30, up to 1.25 at daysAgo=0 (25% growth over the period). */
const growthFactor = (daysAgo: number) => 1 + 0.25 * (1 - daysAgo / 30);

/** Returns 0.75 on weekends, 1.0 on weekdays. */
const weekFactor = (dow: number) => (dow === 0 || dow === 6) ? 0.75 : 1.0;

/** Multiplicative noise: ±scale fraction around 1.0 */
const noise = (scale = 0.08) => 1 + (Math.random() - 0.5) * 2 * scale;

// ── Time-point generator ──────────────────────────────────────────────────────

type TimePoint = { ts: Date; daysAgo: number };

function makeTimePoints(daysBack = 30, stepHours = 2): TimePoint[] {
  const result: TimePoint[] = [];
  const now = new Date();
  now.setMinutes(0, 0, 0);

  for (let d = daysBack; d >= 0; d--) {
    for (let h = 0; h < 24; h += stepHours) {
      const ts = new Date(now);
      ts.setDate(ts.getDate() - d);
      ts.setHours(h, 0, 0, 0);
      result.push({ ts, daysAgo: d });
    }
  }
  return result;
}

// ── Row generators ────────────────────────────────────────────────────────────

type Row = (string | number)[];

function genIot(): Row[] {
  const LOCATIONS  = ['New York', 'London', 'Tokyo', 'Berlin', 'Sydney'];
  const BASE_TEMPS = [17, 10, 24, 13, 21]; // °C per location
  const rows: Row[] = [];

  for (const { ts, daysAgo } of makeTimePoints()) {
    const dp = dailyPeak(ts.getHours());
    for (let i = 0; i < LOCATIONS.length; i++) {
      const temp = clamp((BASE_TEMPS[i] + dp * 14) * growthFactor(daysAgo) * noise(), -15, 45);
      const hum  = clamp(72 - dp * 22 + rnd(-4, 4), 20, 96);
      const wind = clamp(rnd(1, 15) + dp * 8, 0, 40);
      rows.push([ts.toISOString(), LOCATIONS[i], +temp.toFixed(1), +hum.toFixed(1), +wind.toFixed(1)]);
    }
  }
  return rows;
}

function genBusiness(): Row[] {
  const CATEGORIES = ['Electronics', 'Clothing', 'Home', 'Sports', 'Other'];
  const PRODUCTS   = ['Enterprise', 'Pro Plan', 'Starter', 'Basic', 'Premium'];
  const CUSTOMERS  = ['Alice J.', 'Bob S.', 'Carol W.', 'David L.', 'Eva C.', 'Frank M.', 'Grace K.', 'Harry P.'];
  const STATUSES   = ['Completed', 'Completed', 'Completed', 'Completed', 'Pending', 'Refunded'];
  const rows: Row[] = [];
  let ci = 0;

  for (const { ts, daysAgo } of makeTimePoints()) {
    const dp = dailyPeak(ts.getHours());
    const wf = weekFactor(ts.getDay());
    for (let i = 0; i < CATEGORIES.length; i++) {
      const amount = clamp((80 + dp * 350) * wf * growthFactor(daysAgo) * noise(), 10, 1800);
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      rows.push([ts.toISOString(), CATEGORIES[i], CUSTOMERS[ci++ % CUSTOMERS.length], PRODUCTS[i], +amount.toFixed(2), status]);
    }
  }
  return rows;
}

function genAnalytics(): Row[] {
  const EVENT_TYPES = ['click', 'view', 'purchase', 'signup', 'search'];
  const SOURCES     = ['Organic', 'Direct', 'Social', 'Email', 'Paid'];
  const rows: Row[] = [];
  let uid = 10000;

  for (const { ts, daysAgo } of makeTimePoints()) {
    const dp = dailyPeak(ts.getHours());
    const wf = weekFactor(ts.getDay());
    for (let i = 0; i < EVENT_TYPES.length; i++) {
      const mult  = i === 1 ? 3.2 : i === 4 ? 2.4 : 1.0; // views & searches are more frequent
      const value = clamp(Math.round((80 + dp * 900 * mult) * wf * growthFactor(daysAgo) * noise(0.15)), 1, 6000);
      const uptime = clamp(rnd(99.2, 100.0) * noise(0.003), 97, 100);
      const sat    = clamp(rnd(7.5, 9.8) * noise(0.04), 6.0, 10.0);
      rows.push([ts.toISOString(), EVENT_TYPES[i], SOURCES[i % SOURCES.length], `u_${uid++}`, value, +uptime.toFixed(3), +sat.toFixed(2)]);
    }
  }
  return rows;
}

function genFinance(): Row[] {
  const ASSETS      = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX'];
  const TYPES       = ['BUY', 'SELL', 'BUY', 'BUY', 'SELL'];
  const BASE_PRICES: Record<string, number> = { BTC: 64000, ETH: 3800, SOL: 135, BNB: 370, AVAX: 36 };
  const rows: Row[] = [];

  for (const { ts, daysAgo } of makeTimePoints(30, 4)) {
    const wf = weekFactor(ts.getDay());
    for (let i = 0; i < ASSETS.length; i++) {
      const base  = BASE_PRICES[ASSETS[i]];
      const price = clamp(base * growthFactor(daysAgo) * noise(0.03), base * 0.6, base * 1.6);
      const amt   = ASSETS[i] === 'BTC' ? rnd(0.01, 0.5) : ASSETS[i] === 'ETH' ? rnd(0.1, 5) : rnd(1, 100);
      const total = price * amt * wf;
      rows.push([ts.toISOString(), ASSETS[i], TYPES[i % TYPES.length], +amt.toFixed(4), +price.toFixed(2), +total.toFixed(2)]);
    }
  }
  return rows;
}

function genInfrastructure(): Row[] {
  const SERVICES  = ['api-gateway', 'frontend', 'auth-service', 'data-worker', 'billing'];
  const BASE_CPU  = [28, 18, 22, 48, 12];
  const BASE_MEM  = [42, 28, 38, 68, 32];
  const rows: Row[] = [];

  for (const { ts, daysAgo } of makeTimePoints()) {
    const dp = dailyPeak(ts.getHours());
    const wf = weekFactor(ts.getDay());
    for (let i = 0; i < SERVICES.length; i++) {
      const cpu  = clamp((BASE_CPU[i] + dp * 42 * wf) * growthFactor(daysAgo) * noise(), 2, 97);
      const mem  = clamp((BASE_MEM[i] + dp * 22 * wf) * noise(0.05), 8, 95);
      const disk = clamp(28 + (30 - daysAgo) * 0.4 + rnd(0, 6), 10, 90);
      const net  = clamp(rnd(0.05, 1.8) * dp * wf, 0.01, 5);
      const proc = Math.round(clamp(35 + dp * 120 * wf, 8, 500));
      rows.push([ts.toISOString(), SERVICES[i], +cpu.toFixed(1), +mem.toFixed(1), +disk.toFixed(1), +net.toFixed(3), proc]);
    }
  }
  return rows;
}

function genWeather(): Row[] {
  const STATIONS    = ['Station Alpha', 'Station Beta', 'Station Gamma', 'Station Delta'];
  const BASE_TEMPS  = [19, 24, 12, 27];
  const CONDITIONS  = ['Sunny', 'Cloudy', 'Rain', 'Fog'];
  const COND_WEIGHTS = [0.44, 0.28, 0.19, 0.09];
  const rows: Row[] = [];

  for (const { ts, daysAgo } of makeTimePoints()) {
    const dp = dailyPeak(ts.getHours());
    for (let i = 0; i < STATIONS.length; i++) {
      const temp = clamp((BASE_TEMPS[i] + dp * 11) * growthFactor(daysAgo) * noise(), -8, 42);
      const hum  = clamp(68 - dp * 22 + rnd(-5, 5), 20, 96);
      const wind = clamp(rnd(1, 18) + dp * 6, 0, 38);
      let r = Math.random(), acc = 0, condIdx = 0;
      for (let ci = 0; ci < COND_WEIGHTS.length; ci++) {
        acc += COND_WEIGHTS[ci];
        if (r < acc) { condIdx = ci; break; }
      }
      rows.push([ts.toISOString(), STATIONS[i], +temp.toFixed(1), +hum.toFixed(1), +wind.toFixed(1), CONDITIONS[condIdx]]);
    }
  }
  return rows;
}

function genSaas(): Row[] {
  const PLANS     = ['Enterprise', 'Growth', 'Starter', 'Free'];
  const COMPANIES = ['Acme Corp', 'TechFlow Inc', 'DataSphere', 'NovaSystems', 'CloudBridge', 'PulseAI', 'Orbita', 'Nexio'];
  const BASE_MRR  = [11000, 3800, 750, 0];
  const rows: Row[] = [];

  for (const { ts, daysAgo } of makeTimePoints(30, 6)) {
    const wf = weekFactor(ts.getDay());
    for (let i = 0; i < PLANS.length; i++) {
      for (let j = 0; j < 2; j++) {
        const comp  = COMPANIES[(i * 2 + j) % COMPANIES.length];
        const mrr   = clamp(BASE_MRR[i] * growthFactor(daysAgo) * noise(0.04), 0, 60000);
        const users = Math.round(clamp((i === 0 ? 480 : i === 1 ? 140 : i === 2 ? 25 : 4) * wf * growthFactor(daysAgo) * noise(), 1, 2500));
        const churn = clamp(rnd(0.4, 3.8) * (4 - i) * 0.5 * noise(0.12), 0, 12);
        rows.push([ts.toISOString(), PLANS[i], comp, +mrr.toFixed(2), users, +churn.toFixed(2)]);
      }
    }
  }
  return rows;
}

function genEcommerce(): Row[] {
  const CATEGORIES = ['Electronics', 'Apparel', 'Home & Garden', 'Beauty', 'Other'];
  const CHANNELS   = ['Direct', 'Organic Search', 'Paid Search', 'Social Media', 'Email'];
  const CUSTOMERS  = ['Sarah M.', 'James T.', 'Priya K.', 'Michael R.', 'Emma L.', 'David C.', 'Sofia B.', 'Kevin H.'];
  const STATUSES   = ['Delivered', 'Delivered', 'Delivered', 'Shipped', 'Processing', 'Cancelled'];
  const BASE_ORDER = [220, 75, 110, 55, 45];
  const rows: Row[] = [];
  let ci = 0;

  for (const { ts, daysAgo } of makeTimePoints()) {
    const dp = dailyPeak(ts.getHours());
    const wf = weekFactor(ts.getDay());
    for (let i = 0; i < CATEGORIES.length; i++) {
      const total  = clamp((BASE_ORDER[i] + dp * BASE_ORDER[i] * 1.6) * wf * growthFactor(daysAgo) * noise(), 10, 2500);
      const items  = Math.round(clamp(1 + dp * 4 * Math.random(), 1, 12));
      const status = STATUSES[Math.floor(Math.random() < 0.8 ? 0 : Math.random() * STATUSES.length)];
      rows.push([ts.toISOString(), CATEGORIES[i], CHANNELS[i % CHANNELS.length], CUSTOMERS[ci++ % CUSTOMERS.length], +total.toFixed(2), items, status]);
    }
  }
  return rows;
}

function genDevops(): Row[] {
  const SERVICES   = ['api-gateway', 'frontend', 'auth-service', 'data-worker', 'billing'];
  const ENVS       = ['prod', 'prod', 'staging', 'prod', 'staging'];
  const BASE_DUR   = [3.8, 2.4, 3.5, 5.0, 2.9];
  const rows: Row[] = [];

  for (const { ts, daysAgo } of makeTimePoints(30, 6)) {
    const wf = weekFactor(ts.getDay());
    for (let i = 0; i < SERVICES.length; i++) {
      const deploys = Math.round(clamp(rnd(0, 6) * wf * growthFactor(daysAgo), 0, 18));
      const success = clamp(94 + rnd(0, 5.5) * noise(0.02), 84, 100);
      const dur     = clamp(BASE_DUR[i] * noise(0.18) * growthFactor(daysAgo), 0.4, 18);
      const mttr    = clamp(rnd(4, 32) * noise(0.2), 1, 75);
      rows.push([ts.toISOString(), SERVICES[i], ENVS[i], +dur.toFixed(1), +success.toFixed(1), deploys, +mttr.toFixed(1)]);
    }
  }
  return rows;
}

function genMarketing(): Row[] {
  const CHANNELS   = ['Google Ads', 'Meta Ads', 'LinkedIn', 'TikTok', 'YouTube', 'Twitter/X'];
  const CAMPAIGNS  = ['Brand Awareness', 'Retargeting', 'Competitor KW', 'Lookalike', 'Product Launch', 'Seasonal'];
  const BASE_IMPR  = [48000, 33000, 19000, 14000, 9500, 4800];
  const rows: Row[] = [];

  for (const { ts, daysAgo } of makeTimePoints(30, 6)) {
    const dp = dailyPeak(ts.getHours());
    const wf = weekFactor(ts.getDay());
    for (let i = 0; i < CHANNELS.length; i++) {
      const impr    = Math.round(clamp(BASE_IMPR[i] * dp * wf * growthFactor(daysAgo) * noise(), 50, 250000));
      const ctr     = clamp(rnd(2, 9) * noise(0.15), 1, 16);
      const clicks  = Math.round(impr * ctr / 100);
      const convR   = clamp(rnd(1.5, 6) * noise(0.2), 0.8, 14);
      const convs   = Math.round(clicks * convR / 100);
      const spend   = clamp(clicks * rnd(0.4, 3.8) * noise(), 5, 35000);
      const roas    = spend > 0 ? clamp((convs * rnd(25, 220)) / spend, 0.3, 18) : 0;
      rows.push([ts.toISOString(), CHANNELS[i], CAMPAIGNS[i % CAMPAIGNS.length], impr, clicks, convs, +spend.toFixed(2), +ctr.toFixed(2), +roas.toFixed(2)]);
    }
  }
  return rows;
}

function genSupplyChain(): Row[] {
  const SUPPLIERS  = ['Acme Materials', 'TechComp Ltd', 'GlobaLogix', 'FastParts Co', 'EuroSupply'];
  const CATEGORIES = ['Raw Materials', 'Finished Goods', 'Components', 'Packaging', 'MRO'];
  const rows: Row[] = [];

  for (const { ts, daysAgo } of makeTimePoints(30, 6)) {
    const wf = weekFactor(ts.getDay());
    for (let i = 0; i < SUPPLIERS.length; i++) {
      const val    = clamp(rnd(8000, 220000) * wf * growthFactor(daysAgo) * noise(), 500, 600000);
      const onTime = clamp(rnd(86, 99.5) * noise(0.03), 68, 100);
      const lead   = clamp(rnd(2, 11) * noise(0.15), 0.5, 22);
      const fill   = clamp(rnd(93, 99.9) * noise(0.02), 78, 100);
      rows.push([ts.toISOString(), SUPPLIERS[i], CATEGORIES[i % CATEGORIES.length], +val.toFixed(0), +onTime.toFixed(1), +lead.toFixed(1), +fill.toFixed(1)]);
    }
  }
  return rows;
}

function genEnergy(): Row[] {
  const SOURCES = ['Grid', 'Solar', 'Wind', 'Battery', 'Generator'];
  const ZONES   = ['Zone A', 'Zone B', 'Zone C'];
  const BASE_KW = [700, 280, 110, 55, 35];
  const rows: Row[] = [];

  for (const { ts, daysAgo } of makeTimePoints()) {
    const h  = ts.getHours();
    const dp = dailyPeak(h);
    const solar = h >= 6 && h <= 20 ? Math.sin(((h - 6) / 14) * Math.PI) : 0;
    const wf = weekFactor(ts.getDay());

    for (let i = 0; i < SOURCES.length; i++) {
      const factor = i === 1 ? solar : dp;
      const kw     = clamp(BASE_KW[i] * factor * wf * growthFactor(daysAgo) * noise(), 0, 2500);
      const solarKw = i === 0 ? clamp(230 * solar * noise(), 0, 520) : 0;
      const carbon  = (i === 1 || i === 2) ? clamp(rnd(20, 55) * noise(0.1), 5, 90)
                                            : clamp(rnd(340, 520) * noise(0.08), 150, 700);
      const eff = clamp(rnd(74, 96) * noise(0.03), 55, 100);
      rows.push([ts.toISOString(), SOURCES[i], ZONES[i % ZONES.length], +kw.toFixed(1), +solarKw.toFixed(1), +carbon.toFixed(0), +eff.toFixed(1)]);
    }
  }
  return rows;
}

// ── Batch INSERT builder ──────────────────────────────────────────────────────

function buildInserts(table: string, columns: string[], rows: Row[], batchSize = 400): string[] {
  const sqls: string[] = [];
  const colList = columns.map((c) => `"${c}"`).join(', ');

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const vals  = batch.map((row) => {
      const cells = row.map((v) =>
        typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`,
      );
      return `(${cells.join(', ')})`;
    }).join(',\n');

    sqls.push(`INSERT INTO "monkdb"."${table}" (${colList}) VALUES\n${vals}`);
  }
  return sqls;
}

// ── Table data manifest ────────────────────────────────────────────────────────

interface TableManifest {
  table: string;
  columns: string[];
  genFn: () => Row[];
}

const MANIFEST: TableManifest[] = [
  { table: '_demo_iot',            columns: ['ts', 'location', 'temperature', 'humidity', 'wind_speed'],                                       genFn: genIot },
  { table: '_demo_business',       columns: ['ts', 'category', 'customer', 'product', 'amount', 'status'],                                      genFn: genBusiness },
  { table: '_demo_analytics',      columns: ['ts', 'event_type', 'source', 'user_id', 'event_value', 'uptime', 'satisfaction_score'],           genFn: genAnalytics },
  { table: '_demo_finance',        columns: ['ts', 'asset', 'trade_type', 'amount', 'price', 'trade_total'],                                    genFn: genFinance },
  { table: '_demo_infrastructure', columns: ['ts', 'service', 'cpu_pct', 'memory_pct', 'disk_pct', 'network_gbps', 'processes'],               genFn: genInfrastructure },
  { table: '_demo_weather',        columns: ['ts', 'station', 'temperature', 'humidity', 'wind_speed', 'condition'],                            genFn: genWeather },
  { table: '_demo_saas',           columns: ['ts', 'plan', 'company', 'mrr', 'active_users', 'churn_rate'],                                     genFn: genSaas },
  { table: '_demo_ecommerce',      columns: ['ts', 'category', 'channel', 'customer', 'order_total', 'items', 'status'],                        genFn: genEcommerce },
  { table: '_demo_devops',         columns: ['ts', 'service', 'environment', 'build_duration', 'success_rate', 'deploys', 'mttr'],              genFn: genDevops },
  { table: '_demo_marketing',      columns: ['ts', 'channel', 'campaign', 'impressions', 'clicks', 'conversions', 'spend', 'ctr', 'roas'],      genFn: genMarketing },
  { table: '_demo_supply_chain',   columns: ['ts', 'supplier', 'category', 'order_value', 'on_time_rate', 'lead_time', 'fill_rate'],            genFn: genSupplyChain },
  { table: '_demo_energy',         columns: ['ts', 'source', 'zone', 'consumption_kw', 'solar_kw', 'carbon_intensity', 'efficiency'],           genFn: genEnergy },
];

// ── Public: run full setup ────────────────────────────────────────────────────

export async function runDemoSetup(
  queryFn: (sql: string) => Promise<{ cols: string[]; rows: unknown[][] }>,
): Promise<void> {
  // 1. Create all tables
  for (const sql of CREATE_SQLS) {
    await queryFn(sql);
  }

  // 2. Generate rows at call time (computed from current Date, not statically embedded)
  //    and bulk-insert in batches
  for (const { table, columns, genFn } of MANIFEST) {
    const rows = genFn();
    for (const sql of buildInserts(table, columns, rows)) {
      await queryFn(sql);
    }
  }
}

/** Returns the names of all demo tables (used for filtering in table selector). */
export const DEMO_TABLE_NAMES = MANIFEST.map((m) => m.table);

// ── Demo table schema registry — single authoritative source for ALL data binding
//
// This is the ONLY place in the entire codebase that knows:
//   • which columns each _demo_* table has
//   • which column each widget should display
//   • which aggregation to use
//   • which column to group by
//
// Template files contain ZERO data configuration — only visual layout.
// buildPreviewConfig() resolves everything from here at runtime.

/** Per-widget role: indices into numericCols / textCols arrays. */
interface WidgetRole {
  /** Index into numericCols (0 = primary metric column) */
  n: number;
  agg: AggregationType;
  /** Index into textCols for group-by (omit for no grouping) */
  g?: number;
  limit?: number;
}

export interface DemoTableSchema {
  numericCols: string[];
  textCols: string[];
  /**
   * Widget ID → data role. buildPreviewConfig() in page.tsx resolves
   * n/g indices to actual column names at runtime.
   */
  widgetRoles: Record<string, WidgetRole>;
}

export const DEMO_TABLE_SCHEMAS: Record<string, DemoTableSchema> = {
  '_demo_iot': {
    numericCols: ['temperature', 'humidity', 'wind_speed'],
    textCols:    ['location'],
    widgetRoles: {
      w1: { n: 0, agg: 'COUNT' },
      w2: { n: 0, agg: 'AVG' },
      w3: { n: 1, agg: 'AVG' },
      w4: { n: 2, agg: 'MAX' },
      w5: { n: 0, agg: 'AVG', g: 0 },
      w6: { n: 0, agg: 'COUNT', g: 0 },
      w7: { n: 0, agg: 'AVG' },
      w8: { n: 0, agg: 'AVG', g: 0, limit: 100 },
    },
  },

  '_demo_business': {
    numericCols: ['amount'],
    textCols:    ['category', 'customer', 'product', 'status'],
    widgetRoles: {
      w1: { n: 0, agg: 'SUM' },
      w2: { n: 0, agg: 'COUNT' },
      w3: { n: 0, agg: 'SUM' },
      w4: { n: 0, agg: 'AVG' },
      w5: { n: 0, agg: 'SUM', g: 0 },
      w6: { n: 0, agg: 'SUM', g: 0 },
      w7: { n: 0, agg: 'SUM', g: 0, limit: 100 },
    },
  },

  '_demo_analytics': {
    numericCols: ['event_value', 'uptime', 'satisfaction_score'],
    textCols:    ['event_type', 'source', 'user_id'],
    widgetRoles: {
      w1: { n: 0, agg: 'SUM' },
      w2: { n: 1, agg: 'AVG' },
      w3: { n: 2, agg: 'AVG' },
      w4: { n: 0, agg: 'SUM', g: 0 },
      w5: { n: 0, agg: 'SUM', g: 0 },
      w6: { n: 0, agg: 'SUM', g: 1 },
      w7: { n: 0, agg: 'SUM', g: 0, limit: 100 },
    },
  },

  '_demo_finance': {
    numericCols: ['amount', 'price', 'trade_total'],
    textCols:    ['asset', 'trade_type'],
    widgetRoles: {
      w1: { n: 2, agg: 'SUM' },
      w2: { n: 1, agg: 'AVG' },
      w3: { n: 2, agg: 'COUNT' },
      w4: { n: 1, agg: 'AVG', g: 0 },
      w5: { n: 2, agg: 'SUM', g: 0 },
      w6: { n: 1, agg: 'AVG', g: 0, limit: 100 },
    },
  },

  '_demo_infrastructure': {
    numericCols: ['cpu_pct', 'memory_pct', 'disk_pct', 'network_gbps', 'processes'],
    textCols:    ['service'],
    widgetRoles: {
      w1: { n: 0, agg: 'AVG' },
      w2: { n: 1, agg: 'AVG' },
      w3: { n: 2, agg: 'AVG' },
      w4: { n: 3, agg: 'AVG' },
      w5: { n: 4, agg: 'SUM' },
      w6: { n: 0, agg: 'AVG', g: 0 },
      w7: { n: 1, agg: 'AVG', g: 0 },
      w8: { n: 0, agg: 'AVG', g: 0, limit: 100 },
    },
  },

  '_demo_weather': {
    numericCols: ['temperature', 'humidity', 'wind_speed'],
    textCols:    ['station', 'condition'],
    widgetRoles: {
      w1: { n: 0, agg: 'AVG' },
      w2: { n: 1, agg: 'AVG' },
      w3: { n: 2, agg: 'AVG' },
      w4: { n: 0, agg: 'AVG', g: 0 },
      w5: { n: 0, agg: 'AVG', g: 0 },
      w6: { n: 0, agg: 'COUNT', g: 1 },
    },
  },

  '_demo_saas': {
    numericCols: ['mrr', 'active_users', 'churn_rate'],
    textCols:    ['plan', 'company'],
    widgetRoles: {
      w1: { n: 0, agg: 'SUM' },
      w2: { n: 0, agg: 'SUM' },
      w3: { n: 2, agg: 'AVG' },
      w4: { n: 0, agg: 'AVG' },
      w5: { n: 0, agg: 'SUM', g: 0 },
      w6: { n: 0, agg: 'SUM', g: 0 },
      w7: { n: 1, agg: 'SUM', g: 0 },
      w8: { n: 0, agg: 'SUM', g: 0, limit: 100 },
    },
  },

  '_demo_ecommerce': {
    numericCols: ['order_total', 'items'],
    textCols:    ['category', 'channel', 'customer', 'status'],
    widgetRoles: {
      w1: { n: 0, agg: 'SUM' },
      w2: { n: 0, agg: 'COUNT' },
      w3: { n: 1, agg: 'AVG' },
      w4: { n: 0, agg: 'AVG' },
      w5: { n: 0, agg: 'SUM', g: 0 },
      w6: { n: 0, agg: 'SUM', g: 0 },
      w7: { n: 0, agg: 'COUNT', g: 1 },
      w8: { n: 0, agg: 'SUM', g: 1, limit: 100 },
    },
  },

  '_demo_devops': {
    numericCols: ['build_duration', 'success_rate', 'deploys', 'mttr'],
    textCols:    ['service', 'environment'],
    widgetRoles: {
      w1: { n: 1, agg: 'AVG' },
      w2: { n: 2, agg: 'SUM' },
      w3: { n: 3, agg: 'AVG' },
      w4: { n: 1, agg: 'AVG' },
      w5: { n: 0, agg: 'AVG', g: 0 },
      w6: { n: 2, agg: 'SUM', g: 0 },
      w7: { n: 0, agg: 'AVG', g: 0, limit: 100 },
    },
  },

  '_demo_marketing': {
    numericCols: ['impressions', 'clicks', 'conversions', 'spend', 'ctr', 'roas'],
    textCols:    ['channel', 'campaign'],
    widgetRoles: {
      w1: { n: 0, agg: 'SUM' },
      w2: { n: 4, agg: 'AVG' },
      w3: { n: 3, agg: 'AVG' },
      w4: { n: 5, agg: 'AVG' },
      w5: { n: 2, agg: 'SUM', g: 0 },
      w6: { n: 0, agg: 'SUM', g: 0 },
      w7: { n: 3, agg: 'SUM', g: 0 },
      w8: { n: 3, agg: 'SUM', g: 1, limit: 100 },
    },
  },

  '_demo_supply_chain': {
    numericCols: ['order_value', 'on_time_rate', 'lead_time', 'fill_rate'],
    textCols:    ['supplier', 'category'],
    widgetRoles: {
      w1: { n: 0, agg: 'SUM' },
      w2: { n: 3, agg: 'AVG' },
      w3: { n: 1, agg: 'AVG' },
      w4: { n: 2, agg: 'AVG' },
      w5: { n: 0, agg: 'SUM', g: 1 },
      w6: { n: 0, agg: 'SUM', g: 1 },
      w7: { n: 1, agg: 'AVG', g: 0 },
      w8: { n: 0, agg: 'SUM', g: 0, limit: 100 },
    },
  },

  '_demo_energy': {
    numericCols: ['consumption_kw', 'solar_kw', 'carbon_intensity', 'efficiency'],
    textCols:    ['source', 'zone'],
    widgetRoles: {
      w1: { n: 0, agg: 'SUM' },
      w2: { n: 0, agg: 'MAX' },
      w3: { n: 2, agg: 'AVG' },
      w4: { n: 3, agg: 'AVG' },
      w5: { n: 0, agg: 'SUM', g: 0 },
      w6: { n: 0, agg: 'SUM', g: 0 },
      w7: { n: 0, agg: 'SUM', g: 1 },
    },
  },
};
