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
      // Verify that a spread of demo tables (first, middle, last) all exist AND have rows.
      // Checking only the first table misses partial-setup failures where later tables
      // were never created (e.g., network blip mid-run).
      const checkTables = [
        DEMO_TABLE_NAMES[0],                                          // _demo_iot
        DEMO_TABLE_NAMES[Math.floor(DEMO_TABLE_NAMES.length / 2)],   // _demo_saas
        DEMO_TABLE_NAMES[DEMO_TABLE_NAMES.length - 1],               // _demo_energy
      ];

      // Step 1: all three tables must exist in information_schema
      const inList = checkTables.map((t) => `'${t}'`).join(', ');
      const existsCheck = await client.query(
        `SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = 'monkdb' AND table_name IN (${inList})`,
      );
      const tablesExist = Number(existsCheck.rows[0]?.[0] ?? 0) === checkTables.length;

      // Step 2: each of the three tables must have at least one row
      if (tablesExist) {
        let allHaveData = true;
        for (const t of checkTables) {
          const dataCheck = await client.query(
            `SELECT COUNT(*) FROM "monkdb"."${t}" LIMIT 1`,
          );
          if (Number(dataCheck.rows[0]?.[0] ?? 0) === 0) {
            allHaveData = false;
            break;
          }
        }
        if (allHaveData) {
          setState('ready');
          return;
        }
      }

      // Tables missing or empty — run full setup for all DEMO_TABLE_NAMES tables
      await runDemoSetup((sql, args) => client.query(sql, args));
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
