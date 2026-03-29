"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from "chart.js";
import { useChartData, MUTED, FONT, COLORS } from "./useChartData";

Chart.register(ArcElement, Tooltip, Legend);

type Row = { medium: string; sessions: number };

export default function TrafficSourceChart() {
  const { data, loading, error } = useChartData<Row[]>("traffic-sources");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    chartRef.current?.destroy();

    const total = data.reduce((s, r) => s + r.sessions, 0);

    const cfg: ChartConfiguration<"doughnut"> = {
      type: "doughnut",
      data: {
        labels: data.map((r) => r.medium),
        datasets: [
          {
            data: data.map((r) => r.sessions),
            backgroundColor: COLORS.map((c) => c + "CC"), // 80% opacity
            borderColor: COLORS,
            borderWidth: 1,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: MUTED,
              font: FONT,
              boxWidth: 10,
              padding: 10,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const pct = ((ctx.parsed / total) * 100).toFixed(1);
                return `${ctx.label}: ${ctx.parsed.toLocaleString()} (${pct}%)`;
              },
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
