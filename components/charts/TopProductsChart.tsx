"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";
import { useSearchParams } from "next/navigation";
import { MUTED, GRID, FONT } from "./useChartData";

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip);

type CategoryRow = { category: string; revenue: number; unitsSold: number; transactions: number };
type ProductRow  = { product: string;  revenue: number; unitsSold: number; transactions: number };
type Row = CategoryRow | ProductRow;

function getLabel(r: Row) {
  return "category" in r ? r.category : r.product;
}

function truncate(s: string, n = 28) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default function TopProductsChart() {
  const params = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [data, setData] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = params.toString();
      let url = `/api/products${qs ? "?" + qs : ""}`;
      if (selectedCategory) {
        url += (qs ? "&" : "?") + `category=${encodeURIComponent(selectedCategory)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params, selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    chartRef.current?.destroy();

    // Reverse so highest revenue appears at the top of the horizontal bar chart
    const rows = [...data].reverse();
    const isCategoryView = !selectedCategory;

    const cfg: ChartConfiguration = {
      type: "bar",
      data: {
        labels: rows.map((r) => truncate(getLabel(r))),
        datasets: [
          {
            label: "Revenue ($)",
            data: rows.map((r) => r.revenue),
            backgroundColor: isCategoryView ? "rgba(99,102,241,0.7)" : "rgba(245,158,11,0.7)",
            borderColor: isCategoryView ? "#6366F1" : "#F59E0B",
            borderWidth: 1,
            borderRadius: 3,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => getLabel(rows[items[0].dataIndex]),
              label: (ctx) => {
                const r = rows[ctx.dataIndex];
                return [
                  `Revenue: $${ctx.parsed.x.toLocaleString()}`,
                  `Units sold: ${r.unitsSold.toLocaleString()}`,
                  `Transactions: ${r.transactions.toLocaleString()}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: GRID },
            ticks: {
              color: MUTED,
              font: FONT,
              callback: (v) => "$" + Number(v).toLocaleString(),
            },
          },
          y: {
            grid: { color: GRID },
            ticks: { color: MUTED, font: { ...FONT, size: 10 } },
          },
        },
        // Drill-down only available in category view
        onClick: isCategoryView
          ? (_, elements) => {
              if (!elements[0]) return;
              const r = rows[elements[0].index] as CategoryRow;
              setSelectedCategory(r.category);
            }
          : undefined,
        onHover: isCategoryView
          ? (event, elements) => {
              const canvas = event.native?.target as HTMLCanvasElement | null;
              if (canvas) canvas.style.cursor = elements.length > 0 ? "pointer" : "default";
            }
          : undefined,
      },
    };

    chartRef.current = new Chart(canvasRef.current, cfg);
    return () => {
      chartRef.current?.destroy();
    };
  }, [data, selectedCategory]);

  if (loading) return <div className="skeleton h-72 rounded" />;
  if (error) return <p className="text-[#F43F5E] text-xs font-mono">Error: {error}</p>;

  return (
    <div>
      {/* Breadcrumb for drill-down */}
      <div className="flex items-center gap-2 mb-3 min-h-[1.25rem]">
        {selectedCategory ? (
          <>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-[0.65rem] font-mono text-[#9D9690] hover:text-[#F5F0E8] transition-colors"
            >
              ← All Categories
            </button>
            <span className="text-[0.65rem] font-mono text-[#9D9690]">/</span>
            <span className="text-[0.65rem] font-mono text-[#F59E0B]">{selectedCategory}</span>
          </>
        ) : (
          <span className="text-[0.6rem] font-mono text-[#9D9690]">
            Click a category to see its top products
          </span>
        )}
      </div>
      <div className="chart-wrapper" style={{ height: 300 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
