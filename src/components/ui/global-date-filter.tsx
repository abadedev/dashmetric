"use client";

import { DatePickerWithRange } from "./date-range-picker";
import { useQueryState, createParser } from "nuqs";
import { startOfMonth, endOfMonth } from "date-fns";
import { useMemo, useCallback } from "react";

export const parseAsLocalIsoDate = createParser({
  parse: (v) => {
    if (!v) return null;
    const date = new Date(`${v}T00:00:00`);
    return isNaN(date.getTime()) ? null : date;
  },
  serialize: (v: Date) => {
    const year = v.getFullYear();
    const month = String(v.getMonth() + 1).padStart(2, '0');
    const day = String(v.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
});

const defaultFrom = startOfMonth(new Date());
const defaultTo = endOfMonth(new Date());

export function GlobalDateFilter() {
  const [from, setFrom] = useQueryState(
    "from",
    parseAsLocalIsoDate.withDefault(defaultFrom).withOptions({ shallow: false })
  );

  const [to, setTo] = useQueryState(
    "to",
    parseAsLocalIsoDate.withDefault(defaultTo).withOptions({ shallow: false })
  );

  const dateRange = useMemo(() => ({
    from: from || undefined,
    to: to || undefined,
  }), [from, to]);

  const handleSetDate = useCallback((range: { from?: Date; to?: Date } | undefined) => {
    if (!range) {
      setFrom(null);
      setTo(null);
      return;
    }
    setFrom(range.from || null);
    setTo(range.to || null);
  }, [setFrom, setTo]);

  return <DatePickerWithRange date={dateRange} setDate={handleSetDate} />;
}
