'use client';

import { createContext, useContext, useState } from 'react';
import type { DashielScreenContext } from '@/lib/dashiel/types';

interface DashielContextValue {
  context: DashielScreenContext | null;
  setContext: (context: DashielScreenContext | null) => void;
}

const DashielContext = createContext<DashielContextValue | null>(null);

export function DashielProvider({
  children,
  initialContext = null,
}: {
  children: React.ReactNode;
  initialContext?: DashielScreenContext | null;
}) {
  const [context, setContext] = useState<DashielScreenContext | null>(initialContext);

  return <DashielContext.Provider value={{ context, setContext }}>{children}</DashielContext.Provider>;
}

export function useDashielScreenContext() {
  const value = useContext(DashielContext);
  if (!value) {
    throw new Error('useDashielScreenContext must be used within DashielProvider');
  }
  return value;
}
