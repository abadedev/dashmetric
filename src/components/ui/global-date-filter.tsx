"use client";

import { DatePickerWithRange } from "./date-range-picker";
import { useQueryState, createParser } from "nuqs";
import { startOfMonth, endOfMonth } from "date-fns";
import { useMemo, useCallback } from "react";

function getDatePart(value: string): string | null {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export const parseAsLocalIsoDate = createParser({
  parse: (v) => {
    if (!v) return null;
    const datePart = getDatePart(v);
    if (!datePart) return null;
    const [year, month, day] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day);
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

export function GlobalDateFilter({ noDefault }: { noDefault?: boolean } = {}) {
  const [from, setFrom] = useQueryState(
    "from",
    (noDefault
      ? parseAsLocalIsoDate
      : parseAsLocalIsoDate.withDefault(defaultFrom)
    ).withOptions({ shallow: false, clearOnDefault: false })
  ) as [Date | null, (v: Date | null) => Promise<URLSearchParams>];

  const [to, setTo] = useQueryState(
    "to",
    (noDefault
      ? parseAsLocalIsoDate
      : parseAsLocalIsoDate.withDefault(defaultTo)
    ).withOptions({ shallow: false, clearOnDefault: false })
  ) as [Date | null, (v: Date | null) => Promise<URLSearchParams>];

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
