'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

type SidebarContextType = {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggle: () => void;
};

const SIDEBAR_STORAGE_KEY = 'dashmetric:sidebar-collapsed';

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  toggle: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved !== null) {
        setCollapsed(saved === 'true');
      }
    } catch {
      // Ignore storage access errors and keep default behavior.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {
      // Ignore storage access errors.
    }
  }, [collapsed]);

  const value = useMemo(
    () => ({
      collapsed,
      setCollapsed,
      toggle: () => setCollapsed((current) => !current),
    }),
    [collapsed]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
