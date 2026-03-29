"use client";

import { useChartData } from "./useChartData";

type Row = { step: string; count: number };

const SVG_W    = 600;
const SVG_H    = 255;
const CX       = 310;   // center x (shifted right to leave room for step labels)
const MAX_HW   = 145;   // half-width of the widest step
const MIN_HW   = 8;     // minimum half-width so tiny steps are still visible
const STEP_H   = 44;    // height of each funnel slice
const START_Y  = 10;
const LABEL_X  = CX - MAX_HW - 14;  // right edge of step name labels
const VALUE_X  = CX + MAX_HW + 14;  // left edge of count/drop-off labels
const MONO     = "'JetBrains Mono', Consolas, monospace";

export default function FunnelChart() {
  const { data, loading, error } = useChartData<Row[]>("funnel");

  if (loading) return <div className="skeleton h-64 rounded" />;
  if (error) return <p className="text-[#F43F5E] text-xs font-mono">Error: {error}</p>;
  if (!data || data.length === 0) return null;

  const top = data[0].count;

  // Half-widths per step (proportional to count)
  const halfWidths = data.map((r) =>
    Math.max((r.count / top) * MAX_HW, MIN_HW)
  );

  // Drop-off % relative to the previous step
  const dropOffs = data.map((r, i) =>
    i === 0
      ? null
      : (((data[i - 1].count - r.count) / data[i - 1].count) * 100).toFixed(1)
  );

  return (
    <div style={{ height: SVG_H }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        height="100%"
        style={{ fontFamily: MONO, overflow: "visible" }}
      >
        {data.map((row, i) => {
          const y   = START_Y + i * STEP_H;
          const hw  = halfWidths[i];
          // Bottom edge tapers to the next step's width (or stays the same for the last step)
          const hwB = i < data.length - 1 ? halfWidths[i + 1] : hw;
          const pct = row.count / top;
          // Amber gets lighter as the funnel narrows
          const opacity = 0.25 + pct * 0.65;

          const points = [
            `${CX - hw},${y}`,
            `${CX + hw},${y}`,
            `${CX + hwB},${y + STEP_H}`,
            `${CX - hwB},${y + STEP_H}`,
          ].join(" ");

          const midY = y + STEP_H / 2;

          return (
            <g key={row.step}>
              {/* Funnel trapezoid slice */}
              <polygon
                points={points}
                fill={`rgba(245,158,11,${opacity})`}
                stroke="#F59E0B"
                strokeWidth={0.5}
              />

              {/* Step name — right-aligned, left of funnel */}
              <text
                x={LABEL_X}
                y={midY}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fill="#9D9690"
              >
                {row.step}
              </text>

              {/* Count — right of funnel */}
              <text
                x={VALUE_X}
                y={dropOffs[i] ? midY - 6 : midY}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={10}
                fill="#F5F0E8"
              >
                {row.count.toLocaleString()}
              </text>

              {/* Drop-off % — below count, in red */}
              {dropOffs[i] && (
                <text
                  x={VALUE_X}
                  y={midY + 8}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={9}
                  fill="#F43F5E"
                >
                  ▼{dropOffs[i]}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
