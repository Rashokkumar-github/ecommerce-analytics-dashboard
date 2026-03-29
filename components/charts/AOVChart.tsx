"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { useChartData, MUTED, GRID, FONT } from "./useChartData";

// Register datalabels only for this chart instance
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type Row = { month: string; revenue: number; transactions: number; aov: number };

export default function AOVChart() {
  const { data, loading, error } = useChartData<Row[]>("monthly");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    chartRef.current?.destroy();

    const cfg: ChartConfiguration = {
      type: "line",
      data: {
        labels: data.map((r) => r.month),
        datasets: [
          {
            label: "AOV ($)",
            data: data.map((r) => r.aov),
            borderColor: "#14B8A6",
            backgroundColor: "rgba(20,184,166,0.1)",
            fill: true,
            tension: 0.3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: "#14B8A6",
            borderWidth: 2,
          },
        ],
      },
      plugins: [ChartDataLabels],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: MUTED, font: FONT, boxWidth: 10 } },
          tooltip: {
            callbacks: {
              label: (ctx) => `AOV: $${ctx.parsed.y.toFixed(2)}`,
            },
          },
          datalabels: {
            color: "#14B8A6",
            font: { ...FONT, size: 10 },
            anchor: "end",
            align: "top",
            offset: 4,
            formatter: (value: number) => "$" + value.toFixed(0),
          },
        },
        scales: {
          x: { grid: { color: GRID }, ticks: { color: MUTED, font: FONT } },
          y: {
            grid: { color: GRID },
            ticks: {
              color: MUTED,
              font: FONT,
              callback: (v) => "$" + Number(v).toFixed(0),
            },
          },
        },
        layout: { padding: { top: 24 } },
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
