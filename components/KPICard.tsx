"use client";

import { useEffect, useRef, useState } from "react";

type KPICardProps = {
  label: string;
  value: number;
  format: "currency" | "percent" | "number";
  accent?: "amber" | "indigo" | "green" | "rose" | "teal";
  tooltip?: string;
  /** 0-based stagger index for reveal animation */
  index?: number;
};

const ACCENT_COLORS: Record<string, string> = {
  amber: "#F59E0B",
  indigo: "#6366F1",
  green: "#10B981",
  rose: "#F43F5E",
  teal: "#14B8A6",
};

function formatValue(value: number, format: KPICardProps["format"]): string {
  if (format === "currency") {
    if (value >= 1_000_000)
      return "$" + (value / 1_000_000).toFixed(2) + "M";
    if (value >= 1_000)
      return "$" + (value / 1_000).toFixed(1) + "K";
    return "$" + value.toFixed(2);
  }
  if (format === "percent") return value.toFixed(1) + "%";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(1) + "K";
  return value.toLocaleString();
}

function useCountUp(target: number, duration = 1200) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(eased * target);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return displayed;
}

export default function KPICard({
  label,
  value,
  format,
  accent = "amber",
  tooltip,
  index = 0,
}: KPICardProps) {
  const animatedValue = useCountUp(value);
  const [showTooltip, setShowTooltip] = useState(false);
  const color = ACCENT_COLORS[accent];

  const delayClass = [
    "reveal-1",
    "reveal-2",
    "reveal-3",
    "reveal-4",
    "reveal-5",
  ][index] ?? "reveal-1";

  return (
    <div
      className={`kpi-card reveal ${delayClass}`}
      style={{ "--accent-color": color } as React.CSSProperties}
    >
      {/* Top accent stripe is rendered by .kpi-card::before in CSS */}

      <div className="flex items-start justify-between gap-2">
        <p className="kpi-label">{label}</p>

        {tooltip && (
          <div className="relative flex-shrink-0">
            <button
              className="w-4 h-4 rounded-full border border-[#2A2A2A] text-[#9D9690] text-[10px] flex items-center justify-center leading-none hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              aria-label={`Info: ${label}`}
            >
              ?
            </button>

            {showTooltip && (
              <div className="absolute right-0 top-6 z-50 w-56 rounded-md border border-[#2A2A2A] bg-[#1C1C1C] p-3 text-[0.68rem] leading-relaxed text-[#9D9690] shadow-xl">
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="kpi-value mt-2" style={{ color }}>
        {formatValue(animatedValue, format)}
      </p>
    </div>
  );
}
