"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from "chart.js";
import { useChartData, MUTED, GRID, FONT } from "./useChartData";

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Row = { month: string; device: string; sessions: number };

const DEVICE_COLORS: Record<string, { bg: string; border: string }> = {
  desktop: { bg: "rgba(245,158,11,0.75)", border: "#F59E0B" },
  mobile:  { bg: "rgba(99,102,241,0.75)",  border: "#6366F1" },
  tablet:  { bg: "rgba(16,185,129,0.75)",  border: "#10B981" },
};

export default function DeviceChart() {
  const { data, loading, error } = useChartData<Row[]>("devices");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    chartRef.current?.destroy();

    // Pivot: months (x) × devices (datasets)
    const months = [...new Set(data.map((r) => r.month))].sort();
    const devices = [...new Set(data.map((r) => r.device))].sort();

    const lookup: Record<string, number> = {};
    for (const r of data) lookup[`${r.month}|${r.device}`] = r.sessions;

    const datasets = devices.map((device) => {
      const c = DEVICE_COLORS[device] ?? { bg: "rgba(156,163,175,0.7)", border: "#9CA3AF" };
      return {
        label: device.charAt(0).toUpperCase() + device.slice(1),
        data: months.map((m) => lookup[`${m}|${device}`] ?? 0),
        backgroundColor: c.bg,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 3,
      };
    });

    const cfg: ChartConfiguration = {
      type: "bar",
      data: { labels: months, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: MUTED, font: FONT, boxWidth: 10 } },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} sessions`,
            },
          },
        },
        scales: {
          x: { grid: { color: GRID }, ticks: { color: MUTED, font: FONT } },
          y: {
            grid: { color: GRID },
            ticks: { color: MUTED, font: FONT, callback: (v) => Number(v).toLocaleString() },
          },
        },
      },
    };

    chartRef.current = new Chart(canvasRef.current, cfg);
    return () => {
      chartRef.current?.destroy();
    };
  }, [data]);

  if (loading) return <div className="skeleton h-64 rounded" />;
  if (error) return <p className="text-[#F43F5E] text-xs font-mono">Error: {error}</p>;

  return (
    <div className="chart-wrapper" style={{ height: 260 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
