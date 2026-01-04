'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface QueryTab {
  id: string;
  name: string;
  query: string;
  results: any | null;
  executionStats: {
    executionTime: number;
    returnedDocs: number;
  };
  error: string | null;
  isDirty: boolean;
  connectionId?: string;
  createdAt: number;
  lastModified: number;
}

interface QueryTabsContextType {
  tabs: QueryTab[];
  activeTabId: string | null;
  activeTab: QueryTab | null;
  createTab: (name?: string) => string;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<QueryTab>) => void;
  renameTab: (tabId: string, name: string) => void;
  duplicateTab: (tabId: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (tabId: string) => void;
}

const QueryTabsContext = createContext<QueryTabsContextType | undefined>(undefined);

const STORAGE_KEY = 'monkdb_query_tabs';
const ACTIVE_TAB_KEY = 'monkdb_active_tab';

export function QueryTabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<QueryTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Load tabs from localStorage on mount
  useEffect(() => {
    try {
      const storedTabs = localStorage.getItem(STORAGE_KEY);
      const storedActiveTab = localStorage.getItem(ACTIVE_TAB_KEY);

      if (storedTabs) {
        const parsedTabs = JSON.parse(storedTabs) as QueryTab[];
        if (parsedTabs.length > 0) {
          setTabs(parsedTabs);
          setActiveTabId(storedActiveTab || parsedTabs[0].id);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load tabs from localStorage:', error);
    }

    // Create default tab if none exist
    const defaultTab = createDefaultTab();
    setTabs([defaultTab]);
    setActiveTabId(defaultTab.id);
  }, []);

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    if (tabs.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
      } catch (error) {
        console.error('Failed to save tabs to localStorage:', error);
      }
    }
  }, [tabs]);

  // Save active tab ID to localStorage
  useEffect(() => {
    if (activeTabId) {
      try {
        localStorage.setItem(ACTIVE_TAB_KEY, activeTabId);
      } catch (error) {
        console.error('Failed to save active tab to localStorage:', error);
      }
    }
  }, [activeTabId]);

  const createDefaultTab = (): QueryTab => {
    const now = Date.now();
    return {
      id: `tab_${now}`,
      name: 'Untitled',
      query: '',
      results: null,
      executionStats: {
        executionTime: 0,
        returnedDocs: 0,
      },
      error: null,
      isDirty: false,
      createdAt: now,
      lastModified: now,
    };
  };

  const createTab = (name?: string): string => {
    const newTab = createDefaultTab();
    if (name) {
      newTab.name = name;
    } else {
      // Find next available "Query N" name
      const queryNumbers = tabs
        .map((t) => {
          const match = t.name.match(/^Query (\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((n) => n > 0);
      const nextNumber = queryNumbers.length > 0 ? Math.max(...queryNumbers) + 1 : 1;
      newTab.name = `Query ${nextNumber}`;
    }

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    return newTab.id;
  };

  const closeTab = (tabId: string) => {
    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== tabId);

      // If closing the active tab, switch to another tab
      if (tabId === activeTabId) {
        if (newTabs.length > 0) {
          const closedIndex = prev.findIndex((t) => t.id === tabId);
          const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
          setActiveTabId(newTabs[newActiveIndex].id);
        } else {
          // If no tabs left, create a new one
          const defaultTab = createDefaultTab();
          setActiveTabId(defaultTab.id);
          return [defaultTab];
        }
      }

      return newTabs;
    });
  };

  const switchTab = (tabId: string) => {
    if (tabs.find((t) => t.id === tabId)) {
      setActiveTabId(tabId);
    }
  };

  const updateTab = (tabId: string, updates: Partial<QueryTab>) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              ...updates,
              lastModified: Date.now(),
              isDirty: updates.query !== undefined ? updates.query !== tab.query : tab.isDirty,
            }
          : tab
      )
    );
  };

  const renameTab = (tabId: string, name: string) => {
    updateTab(tabId, { name });
  };

  const duplicateTab = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;

    const now = Date.now();
    const newTab: QueryTab = {
      ...tab,
      id: `tab_${now}`,
      name: `${tab.name} (Copy)`,
      createdAt: now,
      lastModified: now,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeAllTabs = () => {
    const defaultTab = createDefaultTab();
    setTabs([defaultTab]);
    setActiveTabId(defaultTab.id);
  };

  const closeOtherTabs = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;

    setTabs([tab]);
    setActiveTabId(tab.id);
  };

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  const value: QueryTabsContextType = {
    tabs,
    activeTabId,
    activeTab,
    createTab,
    closeTab,
    switchTab,
    updateTab,
    renameTab,
    duplicateTab,
    closeAllTabs,
    closeOtherTabs,
  };

  return <QueryTabsContext.Provider value={value}>{children}</QueryTabsContext.Provider>;
}

export function useQueryTabs() {
  const context = useContext(QueryTabsContext);
  if (!context) {
    throw new Error('useQueryTabs must be used within QueryTabsProvider');
  }
  return context;
}
