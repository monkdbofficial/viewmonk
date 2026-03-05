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
  support:        '_demo_support',
} as const;

// ── CREATE TABLE definitions ──────────────────────────────────────────────────

const CREATE_SQLS: string[] = [
  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_iot" (
     ts          TIMESTAMP WITH TIME ZONE NOT NULL,
     location    TEXT NOT NULL,
     temperature DOUBLE,
     humidity    DOUBLE,
     wind_speed  DOUBLE,
     PRIMARY KEY (ts, location)
   ) CLUSTERED BY ("ts") INTO 4 SHARDS WITH (number_of_replicas = '0-1')`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_business" (
     ts       TIMESTAMP WITH TIME ZONE NOT NULL,
     category TEXT NOT NULL,
     customer TEXT,
     product  TEXT,
     amount   DOUBLE,
     status   TEXT,
     PRIMARY KEY (ts, category)
   ) CLUSTERED BY ("ts") INTO 4 SHARDS WITH (number_of_replicas = '0-1')`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_analytics" (
     ts                 TIMESTAMP WITH TIME ZONE NOT NULL,
     event_type         TEXT NOT NULL,
     source             TEXT,
     user_id            TEXT,
     event_value        DOUBLE,
     uptime             DOUBLE,
     satisfaction_score DOUBLE,
     PRIMARY KEY (ts, event_type)
   ) CLUSTERED BY ("ts") INTO 4 SHARDS WITH (number_of_replicas = '0-1')`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_finance" (
     ts          TIMESTAMP WITH TIME ZONE NOT NULL,
     asset       TEXT NOT NULL,
     trade_type  TEXT,
     amount      DOUBLE,
     price       DOUBLE,
     trade_total DOUBLE,
     PRIMARY KEY (ts, asset)
   ) CLUSTERED BY ("ts") INTO 4 SHARDS WITH (number_of_replicas = '0-1')`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_infrastructure" (
     ts           TIMESTAMP WITH TIME ZONE NOT NULL,
     service      TEXT NOT NULL,
     cpu_pct      DOUBLE,
     memory_pct   DOUBLE,
     disk_pct     DOUBLE,
     network_gbps DOUBLE,
     processes    BIGINT,
     PRIMARY KEY (ts, service)
   ) CLUSTERED BY ("ts") INTO 4 SHARDS WITH (number_of_replicas = '0-1')`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_weather" (
     ts          TIMESTAMP WITH TIME ZONE NOT NULL,
     station     TEXT NOT NULL,
     temperature DOUBLE,
     humidity    DOUBLE,
     wind_speed  DOUBLE,
     condition   TEXT,
     PRIMARY KEY (ts, station)
   ) CLUSTERED BY ("ts") INTO 4 SHARDS WITH (number_of_replicas = '0-1')`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_saas" (
     ts           TIMESTAMP WITH TIME ZONE NOT NULL,
     plan         TEXT NOT NULL,
     company      TEXT NOT NULL,
     mrr          DOUBLE,
     active_users BIGINT,
     churn_rate   DOUBLE,
     PRIMARY KEY (ts, plan, company)
   ) CLUSTERED BY ("ts") INTO 4 SHARDS WITH (number_of_replicas = '0-1')`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_ecommerce" (
     ts          TIMESTAMP WITH TIME ZONE NOT NULL,
     category    TEXT NOT NULL,
     channel     TEXT,
     customer    TEXT,
     order_total DOUBLE,
     items       BIGINT,
     status      TEXT,
     PRIMARY KEY (ts, category)
   ) CLUSTERED BY ("ts") INTO 4 SHARDS WITH (number_of_replicas = '0-1')`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_devops" (
     ts             TIMESTAMP WITH TIME ZONE NOT NULL,
     service        TEXT NOT NULL,
     environment    TEXT,
     build_duration DOUBLE,
     success_rate   DOUBLE,
     deploys        BIGINT,
     mttr           DOUBLE,
     PRIMARY KEY (ts, service)
   ) CLUSTERED BY ("ts") INTO 4 SHARDS WITH (number_of_replicas = '0-1')`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_marketing" (
     ts          TIMESTAMP WITH TIME ZONE NOT NULL,
     channel     TEXT NOT NULL,
     campaign    TEXT,
     impressions BIGINT,
     clicks      BIGINT,
     conversions BIGINT,
     spend       DOUBLE,
     ctr         DOUBLE,
     roas        DOUBLE,
     PRIMARY KEY (ts, channel)
   ) CLUSTERED BY ("ts") INTO 4 SHARDS WITH (number_of_replicas = '0-1')`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_supply_chain" (
     ts           TIMESTAMP WITH TIME ZONE NOT NULL,
     supplier     TEXT NOT NULL,
     category     TEXT,
     order_value  DOUBLE,
     on_time_rate DOUBLE,
     lead_time    DOUBLE,
     fill_rate    DOUBLE,
     PRIMARY KEY (ts, supplier)
   ) CLUSTERED BY ("ts") INTO 4 SHARDS WITH (number_of_replicas = '0-1')`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_energy" (
     ts               TIMESTAMP WITH TIME ZONE NOT NULL,
     source           TEXT NOT NULL,
     zone             TEXT,
     consumption_kw   DOUBLE,
     solar_kw         DOUBLE,
     carbon_intensity DOUBLE,
     efficiency       DOUBLE,
     PRIMARY KEY (ts, source)
   ) CLUSTERED BY ("ts") INTO 4 SHARDS WITH (number_of_replicas = '0-1')`,

  `CREATE TABLE IF NOT EXISTS "monkdb"."_demo_support" (
     ts              TIMESTAMP WITH TIME ZONE NOT NULL,
     category        TEXT NOT NULL,
     agent           TEXT,
     priority        TEXT,
     tickets         BIGINT,
     resolution_time DOUBLE,
     satisfaction    DOUBLE,
     sla_met         DOUBLE,
     PRIMARY KEY (ts, category)
   ) CLUSTERED BY ("ts") INTO 4 SHARDS WITH (number_of_replicas = '0-1')`,
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

function genSupport(): Row[] {
  const AGENTS     = ['Alice J.', 'Bob C.', 'Carlos R.', 'Diana P.', 'Eve S.'];
  const CATEGORIES = ['Technical', 'Billing', 'Account', 'Feature Request', 'General'];
  const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
  // Avg resolution time per priority in minutes: Critical fastest, Low slowest
  const PRI_RES_BASE = [35, 95, 210, 390];
  const rows: Row[] = [];
  let ai = 0;

  for (const { ts, daysAgo } of makeTimePoints()) {
    const dp = dailyPeak(ts.getHours());
    const wf = weekFactor(ts.getDay());
    for (let i = 0; i < CATEGORIES.length; i++) {
      const priIdx    = Math.floor(Math.random() * 4);
      const priority  = PRIORITIES[priIdx];
      const tickets   = Math.round(clamp((3 + dp * 22) * wf * growthFactor(daysAgo) * noise(), 0, 80));
      const resTime   = clamp(PRI_RES_BASE[priIdx] * noise(0.35), 5, 1200);
      const sat       = clamp(5.1 - resTime / 450 + rnd(-0.4, 0.4), 1.0, 5.0);
      const sla       = clamp(98 - priIdx * 7 - resTime / 60 * noise(0.1), 40, 100);
      rows.push([ts.toISOString(), CATEGORIES[i], AGENTS[ai++ % AGENTS.length], priority, tickets, +resTime.toFixed(0), +sat.toFixed(1), +sla.toFixed(1)]);
    }
  }
  return rows;
}

// ── Batch INSERT builder ──────────────────────────────────────────────────────

interface BatchInsert { sql: string; args: unknown[]; }

function buildInserts(table: string, columns: string[], pkCols: string[], rows: Row[], batchSize = 400): BatchInsert[] {
  const batches: BatchInsert[] = [];
  const colList      = columns.map((c) => `"${c}"`).join(', ');
  const placeholder  = `(${columns.map(() => '?').join(', ')})`;
  const conflictCols = pkCols.map((c) => `"${c}"`).join(', ');

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const placeholders = batch.map(() => placeholder).join(',\n');
    const args = batch.flatMap((row) => row as unknown[]);
    batches.push({
      sql:  `INSERT INTO "monkdb"."${table}" (${colList}) VALUES\n${placeholders}\nON CONFLICT (${conflictCols}) DO NOTHING`,
      args,
    });
  }
  return batches;
}

// ── Table data manifest ────────────────────────────────────────────────────────

interface TableManifest {
  table: string;
  columns: string[];
  /** Primary key columns — used for ON CONFLICT DO NOTHING on each INSERT batch */
  pkCols: string[];
  genFn: () => Row[];
}

const MANIFEST: TableManifest[] = [
  { table: '_demo_iot',            pkCols: ['ts', 'location'],          columns: ['ts', 'location', 'temperature', 'humidity', 'wind_speed'],                                       genFn: genIot },
  { table: '_demo_business',       pkCols: ['ts', 'category'],          columns: ['ts', 'category', 'customer', 'product', 'amount', 'status'],                                      genFn: genBusiness },
  { table: '_demo_analytics',      pkCols: ['ts', 'event_type'],        columns: ['ts', 'event_type', 'source', 'user_id', 'event_value', 'uptime', 'satisfaction_score'],           genFn: genAnalytics },
  { table: '_demo_finance',        pkCols: ['ts', 'asset'],             columns: ['ts', 'asset', 'trade_type', 'amount', 'price', 'trade_total'],                                    genFn: genFinance },
  { table: '_demo_infrastructure', pkCols: ['ts', 'service'],           columns: ['ts', 'service', 'cpu_pct', 'memory_pct', 'disk_pct', 'network_gbps', 'processes'],               genFn: genInfrastructure },
  { table: '_demo_weather',        pkCols: ['ts', 'station'],           columns: ['ts', 'station', 'temperature', 'humidity', 'wind_speed', 'condition'],                            genFn: genWeather },
  { table: '_demo_saas',           pkCols: ['ts', 'plan', 'company'],   columns: ['ts', 'plan', 'company', 'mrr', 'active_users', 'churn_rate'],                                     genFn: genSaas },
  { table: '_demo_ecommerce',      pkCols: ['ts', 'category'],          columns: ['ts', 'category', 'channel', 'customer', 'order_total', 'items', 'status'],                        genFn: genEcommerce },
  { table: '_demo_devops',         pkCols: ['ts', 'service'],           columns: ['ts', 'service', 'environment', 'build_duration', 'success_rate', 'deploys', 'mttr'],              genFn: genDevops },
  { table: '_demo_marketing',      pkCols: ['ts', 'channel'],           columns: ['ts', 'channel', 'campaign', 'impressions', 'clicks', 'conversions', 'spend', 'ctr', 'roas'],      genFn: genMarketing },
  { table: '_demo_supply_chain',   pkCols: ['ts', 'supplier'],          columns: ['ts', 'supplier', 'category', 'order_value', 'on_time_rate', 'lead_time', 'fill_rate'],            genFn: genSupplyChain },
  { table: '_demo_energy',         pkCols: ['ts', 'source'],            columns: ['ts', 'source', 'zone', 'consumption_kw', 'solar_kw', 'carbon_intensity', 'efficiency'],           genFn: genEnergy },
  { table: '_demo_support',        pkCols: ['ts', 'category'],          columns: ['ts', 'category', 'agent', 'priority', 'tickets', 'resolution_time', 'satisfaction', 'sla_met'],   genFn: genSupport },
];

/// ── Public: run full setup ────────────────────────────────────────────────────

export async function runDemoSetup(
  queryFn: (sql: string, args?: unknown[]) => Promise<{ cols: string[]; rows: unknown[][] }>,
): Promise<void> {
  // 1. Create all tables
  for (const sql of CREATE_SQLS) {
    await queryFn(sql);
  }

  // 2. Generate rows at call time (computed from current Date, not statically embedded)
  //    and bulk-insert in batches using parameterized ? placeholders + ON CONFLICT DO NOTHING
  for (const { table, columns, pkCols, genFn } of MANIFEST) {
    const rows = genFn();
    for (const { sql, args } of buildInserts(table, columns, pkCols, rows)) {
      await queryFn(sql, args);
    }
  }

  // 3. Explicitly refresh all tables so rows are immediately visible to queries.
  //    MonkDB's default ~1s background refresh is unreliable right after bulk inserts
  //    (idle tables may not refresh on schedule). REFRESH TABLE guarantees visibility.
  for (const { table } of MANIFEST) {
    await queryFn(`REFRESH TABLE "monkdb"."${table}"`);
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

/** Per-widget role: literal column names — no fragile index indirection. */
interface WidgetRole {
  metricCol: string;
  agg: AggregationType;
  groupCol?: string;
  limit?: number;
}

export interface DemoTableSchema {
  /** Fallback metric column used when no role is defined for a widget */
  primaryMetric: string;
  /** Widget ID → data role resolved directly to column names */
  widgetRoles: Record<string, WidgetRole>;
}

export const DEMO_TABLE_SCHEMAS: Record<string, DemoTableSchema> = {
  '_demo_iot': {
    primaryMetric: 'temperature',
    widgetRoles: {
      w1: { metricCol: 'temperature', agg: 'COUNT' },
      w2: { metricCol: 'temperature', agg: 'AVG' },
      w3: { metricCol: 'humidity',    agg: 'AVG' },
      w4: { metricCol: 'wind_speed',  agg: 'MAX' },
      w5: { metricCol: 'temperature', agg: 'AVG',   groupCol: 'location' },
      w6: { metricCol: 'temperature', agg: 'COUNT',  groupCol: 'location' },
      w7: { metricCol: 'temperature', agg: 'AVG' },
      w8: { metricCol: 'temperature', agg: 'AVG',   groupCol: 'location', limit: 100 },
    },
  },

  '_demo_business': {
    primaryMetric: 'amount',
    widgetRoles: {
      w1: { metricCol: 'amount', agg: 'SUM' },
      w2: { metricCol: 'amount', agg: 'COUNT' },
      w3: { metricCol: 'amount', agg: 'SUM' },
      w4: { metricCol: 'amount', agg: 'AVG' },
      w5: { metricCol: 'amount', agg: 'SUM', groupCol: 'category' },
      w6: { metricCol: 'amount', agg: 'SUM', groupCol: 'category' },
      w7: { metricCol: 'amount', agg: 'SUM', groupCol: 'category', limit: 100 },
    },
  },

  '_demo_analytics': {
    primaryMetric: 'event_value',
    widgetRoles: {
      w1: { metricCol: 'event_value',        agg: 'SUM' },
      w2: { metricCol: 'uptime',             agg: 'AVG' },
      w3: { metricCol: 'satisfaction_score', agg: 'AVG' },
      w4: { metricCol: 'event_value',        agg: 'SUM', groupCol: 'event_type' },
      w5: { metricCol: 'event_value',        agg: 'SUM', groupCol: 'event_type' },
      w6: { metricCol: 'event_value',        agg: 'SUM', groupCol: 'source' },
      w7: { metricCol: 'event_value',        agg: 'SUM', groupCol: 'event_type', limit: 100 },
    },
  },

  '_demo_finance': {
    primaryMetric: 'trade_total',
    widgetRoles: {
      w1: { metricCol: 'trade_total', agg: 'SUM' },
      w2: { metricCol: 'price',       agg: 'AVG' },
      w3: { metricCol: 'trade_total', agg: 'COUNT' },
      w4: { metricCol: 'price',       agg: 'AVG', groupCol: 'asset' },
      w5: { metricCol: 'trade_total', agg: 'SUM', groupCol: 'asset' },
      w6: { metricCol: 'price',       agg: 'AVG', groupCol: 'asset', limit: 100 },
    },
  },

  '_demo_infrastructure': {
    primaryMetric: 'cpu_pct',
    widgetRoles: {
      w1: { metricCol: 'cpu_pct',      agg: 'AVG' },
      w2: { metricCol: 'memory_pct',   agg: 'AVG' },
      w3: { metricCol: 'disk_pct',     agg: 'AVG' },
      w4: { metricCol: 'network_gbps', agg: 'AVG' },
      w5: { metricCol: 'processes',    agg: 'SUM' },
      w6: { metricCol: 'cpu_pct',      agg: 'AVG', groupCol: 'service' },
      w7: { metricCol: 'memory_pct',   agg: 'AVG', groupCol: 'service' },
      w8: { metricCol: 'cpu_pct',      agg: 'AVG', groupCol: 'service', limit: 100 },
    },
  },

  '_demo_weather': {
    primaryMetric: 'temperature',
    widgetRoles: {
      w1: { metricCol: 'temperature', agg: 'AVG' },
      w2: { metricCol: 'humidity',    agg: 'AVG' },
      w3: { metricCol: 'wind_speed',  agg: 'AVG' },
      w4: { metricCol: 'temperature', agg: 'AVG',   groupCol: 'station' },
      w5: { metricCol: 'temperature', agg: 'AVG',   groupCol: 'station' },
      w6: { metricCol: 'temperature', agg: 'COUNT',  groupCol: 'condition' },
    },
  },

  '_demo_saas': {
    primaryMetric: 'mrr',
    widgetRoles: {
      w1: { metricCol: 'mrr',          agg: 'SUM' },
      w2: { metricCol: 'mrr',          agg: 'SUM' },
      w3: { metricCol: 'churn_rate',   agg: 'AVG' },
      w4: { metricCol: 'mrr',          agg: 'AVG' },
      w5: { metricCol: 'mrr',          agg: 'SUM', groupCol: 'plan' },
      w6: { metricCol: 'mrr',          agg: 'SUM', groupCol: 'plan' },
      w7: { metricCol: 'active_users', agg: 'SUM', groupCol: 'plan' },
      w8: { metricCol: 'mrr',          agg: 'SUM', groupCol: 'plan', limit: 100 },
    },
  },

  '_demo_ecommerce': {
    primaryMetric: 'order_total',
    widgetRoles: {
      w1: { metricCol: 'order_total', agg: 'SUM' },
      w2: { metricCol: 'order_total', agg: 'COUNT' },
      w3: { metricCol: 'items',       agg: 'AVG' },
      w4: { metricCol: 'order_total', agg: 'AVG' },
      w5: { metricCol: 'order_total', agg: 'SUM',   groupCol: 'category' },
      w6: { metricCol: 'order_total', agg: 'SUM',   groupCol: 'category' },
      w7: { metricCol: 'order_total', agg: 'COUNT',  groupCol: 'channel' },
      w8: { metricCol: 'order_total', agg: 'SUM',   groupCol: 'channel', limit: 100 },
    },
  },

  '_demo_devops': {
    primaryMetric: 'success_rate',
    widgetRoles: {
      w1: { metricCol: 'success_rate',   agg: 'AVG' },
      w2: { metricCol: 'deploys',        agg: 'SUM' },
      w3: { metricCol: 'mttr',           agg: 'AVG' },
      w4: { metricCol: 'success_rate',   agg: 'AVG' },
      w5: { metricCol: 'build_duration', agg: 'AVG', groupCol: 'service' },
      w6: { metricCol: 'deploys',        agg: 'SUM', groupCol: 'service' },
      w7: { metricCol: 'build_duration', agg: 'AVG', groupCol: 'service', limit: 100 },
    },
  },

  '_demo_marketing': {
    primaryMetric: 'impressions',
    widgetRoles: {
      w1: { metricCol: 'impressions',  agg: 'SUM' },
      w2: { metricCol: 'ctr',         agg: 'AVG' },
      w3: { metricCol: 'spend',       agg: 'AVG' },
      w4: { metricCol: 'roas',        agg: 'AVG' },
      w5: { metricCol: 'conversions', agg: 'SUM', groupCol: 'channel' },
      w6: { metricCol: 'impressions', agg: 'SUM', groupCol: 'channel' },
      w7: { metricCol: 'spend',       agg: 'SUM', groupCol: 'channel' },
      w8: { metricCol: 'spend',       agg: 'SUM', groupCol: 'campaign', limit: 100 },
    },
  },

  '_demo_supply_chain': {
    primaryMetric: 'order_value',
    widgetRoles: {
      w1: { metricCol: 'order_value',  agg: 'SUM' },
      w2: { metricCol: 'fill_rate',    agg: 'AVG' },
      w3: { metricCol: 'on_time_rate', agg: 'AVG' },
      w4: { metricCol: 'lead_time',    agg: 'AVG' },
      w5: { metricCol: 'order_value',  agg: 'SUM', groupCol: 'category' },
      w6: { metricCol: 'order_value',  agg: 'SUM', groupCol: 'category' },
      w7: { metricCol: 'on_time_rate', agg: 'AVG', groupCol: 'supplier' },
      w8: { metricCol: 'order_value',  agg: 'SUM', groupCol: 'supplier', limit: 100 },
    },
  },

  '_demo_energy': {
    primaryMetric: 'consumption_kw',
    widgetRoles: {
      w1: { metricCol: 'consumption_kw',   agg: 'SUM' },
      w2: { metricCol: 'consumption_kw',   agg: 'MAX' },
      w3: { metricCol: 'carbon_intensity', agg: 'AVG' },
      w4: { metricCol: 'efficiency',       agg: 'AVG' },
      w5: { metricCol: 'consumption_kw',   agg: 'SUM', groupCol: 'source' },
      w6: { metricCol: 'consumption_kw',   agg: 'SUM', groupCol: 'source' },
      w7: { metricCol: 'consumption_kw',   agg: 'SUM', groupCol: 'zone' },
    },
  },

  '_demo_support': {
    primaryMetric: 'tickets',
    widgetRoles: {
      w1: { metricCol: 'tickets',         agg: 'SUM' },
      w2: { metricCol: 'resolution_time', agg: 'AVG' },
      w3: { metricCol: 'satisfaction',    agg: 'AVG' },
      w4: { metricCol: 'sla_met',         agg: 'AVG' },
      w5: { metricCol: 'tickets',         agg: 'SUM', groupCol: 'category' },
      w6: { metricCol: 'tickets',         agg: 'SUM', groupCol: 'priority' },
      w7: { metricCol: 'tickets',         agg: 'SUM', groupCol: 'category' },
      w8: { metricCol: 'resolution_time', agg: 'AVG', groupCol: 'agent',    limit: 100 },
    },
  },
};
