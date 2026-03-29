"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from "chart.js";
import { useChartData, MUTED, GRID, FONT } from "./useChartData";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type Row = { date: string; revenue: number; sessions: number };

export default function RevenueSessionsChart() {
  const { data, loading, error } = useChartData<Row[]>("revenue");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    chartRef.current?.destroy();

    const cfg: ChartConfiguration = {
      type: "line",
      data: {
        labels: data.map((r) => r.date.slice(5)), // MM-DD
        datasets: [
          {
            label: "Revenue ($)",
            data: data.map((r) => r.revenue),
            borderColor: "#F59E0B",
            backgroundColor: "rgba(245,158,11,0.07)",
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2,
            yAxisID: "yRev",
          },
          {
            label: "Sessions",
            data: data.map((r) => r.sessions),
            borderColor: "#6366F1",
            backgroundColor: "rgba(99,102,241,0.07)",
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2,
            yAxisID: "ySess",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { labels: { color: MUTED, font: FONT, boxWidth: 10 } },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                ctx.datasetIndex === 0
                  ? `Revenue: $${ctx.parsed.y.toFixed(2)}`
                  : `Sessions: ${ctx.parsed.y.toLocaleString()}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: GRID },
            ticks: { color: MUTED, font: FONT, maxTicksLimit: 12 },
          },
          yRev: {
            position: "left",
            grid: { color: GRID },
            ticks: {
              color: "#F59E0B",
              font: FONT,
              callback: (v) => "$" + Number(v).toLocaleString(),
            },
          },
          ySess: {
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: {
              color: "#6366F1",
              font: FONT,
              callback: (v) => Number(v).toLocaleString(),
            },
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
