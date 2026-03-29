"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from "chart.js";
import { useChartData, MUTED, GRID, FONT } from "./useChartData";

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

type Row = { month: string; revenue: number; transactions: number; aov: number };

export default function RevenueTransactionsChart() {
  const { data, loading, error } = useChartData<Row[]>("monthly");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    chartRef.current?.destroy();

    const cfg: ChartConfiguration = {
      type: "bar",
      data: {
        labels: data.map((r) => r.month),
        datasets: [
          {
            type: "bar",
            label: "Revenue ($)",
            data: data.map((r) => r.revenue),
            backgroundColor: "rgba(245,158,11,0.65)",
            borderColor: "#F59E0B",
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: "yRev",
          },
          {
            type: "line",
            label: "Transactions",
            data: data.map((r) => r.transactions),
            borderColor: "#6366F1",
            backgroundColor: "rgba(99,102,241,0.1)",
            fill: false,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
            yAxisID: "yTx",
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
                  ? `Revenue: $${ctx.parsed.y.toLocaleString()}`
                  : `Transactions: ${ctx.parsed.y.toLocaleString()}`,
            },
          },
        },
        scales: {
          x: { grid: { color: GRID }, ticks: { color: MUTED, font: FONT } },
          yRev: {
            position: "left",
            grid: { color: GRID },
            ticks: {
              color: "#F59E0B",
              font: FONT,
              callback: (v) => "$" + Number(v).toLocaleString(),
            },
          },
          yTx: {
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: { color: "#6366F1", font: FONT, callback: (v) => Number(v).toLocaleString() },
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
