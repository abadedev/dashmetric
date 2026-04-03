'use client';

import { useEffect } from 'react';
import { useDashielScreenContext } from '@/components/ai/dashiel-provider';
import type { DashielScreenContext } from '@/lib/dashiel/types';

export function DashielContextBridge({ context }: { context: DashielScreenContext }) {
  const { setContext } = useDashielScreenContext();

  useEffect(() => {
    setContext(context);
    return () => setContext(null);
  }, [context, setContext]);

  return null;
}
