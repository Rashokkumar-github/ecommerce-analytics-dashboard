"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

type Row = {
  pagePath: string;
  sessions: number;
  bounces: number;
  bounceRate: number;
};

type SortKey = keyof Row;
type SortDir = "asc" | "desc";

function bounceClass(rate: number) {
  if (rate < 40) return "bounce-low";
  if (rate < 65) return "bounce-med";
  return "bounce-high";
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="ml-1 inline-block opacity-50" aria-hidden>
      {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
    </span>
  );
}

export default function BounceRateTable() {
  const params = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("sessions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = params.toString();
      const res = await fetch(`/api/bounce-rate${qs ? "?" + qs : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Row[] = await res.json();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "pagePath" ? "asc" : "desc");
    }
  };

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "string" && typeof bv === "string") {
      return sortDir === "asc"
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    }
    return sortDir === "asc"
      ? (av as number) - (bv as number)
      : (bv as number) - (av as number);
  });

  // ── Skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="card">
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-8 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-[#F43F5E] text-sm font-mono">
        Error: {error}
      </div>
    );
  }

  const columns: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "pagePath", label: "Page" },
    { key: "sessions", label: "Sessions", align: "right" },
    { key: "bounces", label: "Bounces", align: "right" },
    { key: "bounceRate", label: "Bounce Rate", align: "right" },
  ];

  return (
    <div className="card overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(({ key, label, align }) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                style={{ textAlign: align ?? "left" }}
                aria-sort={
                  sortKey === key
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                {label}
                <SortIcon active={sortKey === key} dir={sortDir} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.pagePath}>
              <td
                className="max-w-xs truncate"
                title={row.pagePath}
              >
                <span className="font-mono text-[0.7rem] text-[#F5F0E8]">
                  {row.pagePath}
                </span>
              </td>
              <td className="text-right font-mono">
                {row.sessions.toLocaleString()}
              </td>
              <td className="text-right font-mono">
                {row.bounces.toLocaleString()}
              </td>
              <td className="text-right font-mono">
                <span className={bounceClass(row.bounceRate)}>
                  {row.bounceRate.toFixed(1)}%
                </span>
                {/* inline bar */}
                <span
                  className="inline-block ml-2 h-1.5 rounded-full align-middle"
                  style={{
                    width: `${Math.min(row.bounceRate, 100) * 0.6}px`,
                    backgroundColor:
                      row.bounceRate < 40
                        ? "#10B981"
                        : row.bounceRate < 65
                        ? "#F59E0B"
                        : "#F43F5E",
                  }}
                />
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td
                colSpan={4}
                className="text-center text-[#9D9690] py-8 text-sm"
              >
                No data for selected filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-3 text-[0.62rem] text-[#9D9690] font-mono">
        {sorted.length} pages · min 10 sessions · GA4 bounce = not engaged
      </p>
    </div>
  );
}
