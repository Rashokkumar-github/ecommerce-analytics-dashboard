"use client";

import { useEffect, useRef } from "react";
import { Chart, type ChartConfiguration } from "chart.js";
import { SankeyController, Flow } from "chartjs-chart-sankey";
import { useChartData } from "./useChartData";

Chart.register(SankeyController, Flow);

type Row = { from: string; to: string; flow: number };

function truncate(s: string, n = 32) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// Distinct palette — one colour per unique source node so paths are traceable
const NODE_PALETTE = [
  "#F59E0B", // amber
  "#6366F1", // indigo
  "#10B981", // emerald
  "#F43F5E", // rose
  "#38BDF8", // sky
  "#A78BFA", // violet
  "#FB923C", // orange
  "#34D399", // green
  "#818CF8", // light indigo
  "#FCD34D", // yellow
];

export default function JourneyChart() {
  const { data, loading, error } = useChartData<Row[]>("journey");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    chartRef.current?.destroy();

    const rows = data.map((r) => ({
      from: truncate(r.from),
      to: truncate(r.to),
      flow: r.flow,
    }));

    // Assign a stable colour to each unique source node
    const sourceNodes = Array.from(new Set(rows.map((r) => r.from)));
    const nodeColor = new Map(
      sourceNodes.map((n, i) => [n, NODE_PALETTE[i % NODE_PALETTE.length]])
    );

    const cfg: ChartConfiguration<"sankey"> = {
      type: "sankey",
      data: {
        datasets: [
          {
            label: "Page flow",
            data: rows,
            // Each flow inherits its source node's colour, fading to semi-transparent
            colorFrom: (ctx: { raw: unknown }) => {
              const raw = ctx.raw as { from?: string } | null;
              const base = nodeColor.get(raw?.from ?? "") ?? NODE_PALETTE[0];
              return base + "99"; // ~60% opacity
            },
            colorTo: (ctx: { raw: unknown }) => {
              const raw = ctx.raw as { from?: string } | null;
              const base = nodeColor.get(raw?.from ?? "") ?? NODE_PALETTE[0];
              return base + "33"; // ~20% opacity at destination
            },
            colorMode: "gradient",
            color: "#F5F0E8",
            borderWidth: 0,
            nodePadding: 12,
            nodeWidth: 16,
            size: "max",
          } as never,
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            right: 220,
            top: 10,
            bottom: 10,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const raw = ctx.raw as any;
                return `${raw.from} → ${raw.to}: ${raw.flow.toLocaleString()} sessions`;
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

  if (loading) return <div className="skeleton h-[900px] rounded" />;
  if (error) return <p className="text-[#F43F5E] text-xs font-mono">Error: {error}</p>;

  return (
    <div className="chart-wrapper" style={{ height: 900 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
