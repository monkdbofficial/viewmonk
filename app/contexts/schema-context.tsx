/**
 * Schema Context
 * Enterprise-grade: Tracks active schema for multi-tenant isolation
 * Persists user's selected schema across sessions
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useActiveConnection } from '../lib/monkdb-context';

interface SchemaContextValue {
  activeSchema: string | null;
  setActiveSchema: (schema: string) => void;
  defaultSchema: string;
}

const SchemaContext = createContext<SchemaContextValue | undefined>(undefined);

export function SchemaProvider({ children }: { children: ReactNode }) {
  const activeConnection = useActiveConnection();
  const [activeSchema, setActiveSchemaState] = useState<string | null>(null);

  // MonkDB default schema (like PostgreSQL's "public")
  const defaultSchema = 'doc';

  // Load saved schema preference for this connection
  useEffect(() => {
    if (activeConnection) {
      const key = `schema_${activeConnection.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setActiveSchemaState(saved);
      } else {
        setActiveSchemaState(defaultSchema);
      }
    } else {
      setActiveSchemaState(null);
    }
  }, [activeConnection]);

  const setActiveSchema = (schema: string) => {
    setActiveSchemaState(schema);

    // Save preference for this connection
    if (activeConnection) {
      const key = `schema_${activeConnection.id}`;
      localStorage.setItem(key, schema);
    }
  };

  return (
    <SchemaContext.Provider value={{ activeSchema, setActiveSchema, defaultSchema }}>
      {children}
    </SchemaContext.Provider>
  );
}

export function useSchema() {
  const context = useContext(SchemaContext);
  if (!context) {
    throw new Error('useSchema must be used within SchemaProvider');
  }
  return context;
}
