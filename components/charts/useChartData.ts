"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function useChartData<T>(endpoint: string) {
  const params = useSearchParams();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = params.toString();
      const res = await fetch(`/api/${endpoint}${qs ? "?" + qs : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params, endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
}

// ── Shared chart theme tokens ─────────────────────────────────────────────────
export const MUTED = "#9D9690";
export const GRID = "#2A2A2A";
export const FG = "#F5F0E8";
export const FONT = {
  family: "'JetBrains Mono', Consolas, monospace" as const,
  size: 10 as const,
};
export const COLORS = [
  "#F59E0B", // amber
  "#6366F1", // indigo
  "#10B981", // green
  "#F43F5E", // rose
  "#14B8A6", // teal
  "#F97316", // orange
  "#A855F7", // purple
  "#06B6D4", // cyan
];
