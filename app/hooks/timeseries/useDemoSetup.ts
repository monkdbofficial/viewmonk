'use client';
// ─────────────────────────────────────────────────────────────────────────────
// MonkDB Workbench — useDemoSetup
// Ensures all _demo_* tables exist and are populated before template preview.
// Runs runDemoSetup() once on first call; subsequent calls short-circuit.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useRef } from 'react';
import { useMonkDBClient } from '@/app/lib/monkdb-context';
import { runDemoSetup, DEMO_TABLE_NAMES } from '@/app/lib/timeseries/demo-setup';

type SetupState = 'idle' | 'initializing' | 'ready' | 'error';

export function useDemoSetup() {
  const client = useMonkDBClient();
  const [state, setState] = useState<SetupState>('idle');
  const [error, setError] = useState<string | null>(null);
  // Prevent concurrent runs
  const runningRef = useRef(false);

  const ensureReady = useCallback(async () => {
    if (!client || state === 'ready' || runningRef.current) return;
    runningRef.current = true;
    setState('initializing');
    setError(null);

    try {
      // Check how many _demo_* tables exist and have data.
      // Use the first table in DEMO_TABLE_NAMES as the sentinel — if it exists
      // and has rows, assume the full setup was already completed.
      const sentinelTable = DEMO_TABLE_NAMES[0];
      const check = await client.query(
        `SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = 'monkdb' AND table_name = '${sentinelTable}'`,
      );
      const tableExists = Number(check.rows[0]?.[0] ?? 0) > 0;

      if (tableExists) {
        const dataCheck = await client.query(
          `SELECT COUNT(*) FROM "monkdb"."${sentinelTable}" LIMIT 1`,
        );
        if (Number(dataCheck.rows[0]?.[0] ?? 0) > 0) {
          setState('ready');
          return;
        }
      }

      // Tables missing or empty — run full setup for all DEMO_TABLE_NAMES tables
      await runDemoSetup((sql) => client.query(sql));
      // MonkDB needs a short moment to make freshly inserted rows visible
      await new Promise<void>((r) => setTimeout(r, 600));
      setState('ready');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Demo setup failed';
      setError(msg);
      setState('error');
    } finally {
      runningRef.current = false;
    }
  }, [client, state]);

  return {
    ready: state === 'ready',
    initializing: state === 'initializing',
    error,
    ensureReady,
  };
}
