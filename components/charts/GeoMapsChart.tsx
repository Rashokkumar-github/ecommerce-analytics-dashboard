"use client";

import { useEffect, useRef, useState } from "react";
import { Chart, type ChartConfiguration } from "chart.js";
import {
  ChoroplethController,
  GeoFeature,
  ColorScale,
  ProjectionScale,
} from "chartjs-chart-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { useChartData, MUTED, FONT } from "./useChartData";

Chart.register(ChoroplethController, GeoFeature, ColorScale, ProjectionScale);

type Row = { country: string; sessions: number; revenue: number };

// ISO 3166-1 numeric → country name mapping (covers the GA4 sample dataset)
const NAME_TO_ISO: Record<string, number> = {
  "Afghanistan": 4, "Albania": 8, "Algeria": 12, "Argentina": 32, "Australia": 36,
  "Austria": 40, "Bangladesh": 50, "Belgium": 56, "Bolivia": 68, "Brazil": 76,
  "Bulgaria": 100, "Cambodia": 116, "Canada": 124, "Chile": 152, "China": 156,
  "Colombia": 170, "Croatia": 191, "Czech Republic": 203, "Denmark": 208,
  "Ecuador": 218, "Egypt": 818, "Ethiopia": 231, "Finland": 246, "France": 250,
  "Germany": 276, "Ghana": 288, "Greece": 300, "Hungary": 348, "India": 356,
  "Indonesia": 360, "Iran": 364, "Iraq": 368, "Ireland": 372, "Israel": 376,
  "Italy": 380, "Japan": 392, "Jordan": 400, "Kazakhstan": 398, "Kenya": 404,
  "Kuwait": 414, "Malaysia": 458, "Mexico": 484, "Morocco": 504,
  "Netherlands": 528, "New Zealand": 554, "Nigeria": 566, "Norway": 578,
  "Pakistan": 586, "Peru": 604, "Philippines": 608, "Poland": 616,
  "Portugal": 620, "Romania": 642, "Russia": 643, "Saudi Arabia": 682,
  "Serbia": 688, "Singapore": 702, "Slovakia": 703, "Slovenia": 705,
  "South Africa": 710, "South Korea": 410, "Spain": 724, "Sri Lanka": 144,
  "Sweden": 752, "Switzerland": 756, "Taiwan": 158, "Thailand": 764,
  "Turkey": 792, "Ukraine": 804, "United Arab Emirates": 784, "United Kingdom": 826,
  "United States": 840, "Uruguay": 858, "Venezuela": 862, "Vietnam": 704,
};

type GeoFeatureShape = GeoJSON.Feature<GeoJSON.Geometry>;

function buildGeoFeatures(topology: Topology): GeoFeatureShape[] {
  const obj = topology.objects["countries"] as GeometryCollection;
  return feature(topology, obj).features as GeoFeatureShape[];
}

export default function GeoMapsChart() {
  const { data, loading, error } = useChartData<Row[]>("geo");
  const sessCanvasRef = useRef<HTMLCanvasElement>(null);
  const revCanvasRef = useRef<HTMLCanvasElement>(null);
  const sessChartRef = useRef<Chart | null>(null);
  const revChartRef = useRef<Chart | null>(null);
  const [geoFeatures, setGeoFeatures] = useState<GeoFeatureShape[] | null>(null);

  // Load world topology once
  useEffect(() => {
    import("world-atlas/countries-110m.json").then((mod) => {
      setGeoFeatures(buildGeoFeatures(mod.default as unknown as Topology));
    });
  }, []);

  useEffect(() => {
    if (!data || !geoFeatures || !sessCanvasRef.current || !revCanvasRef.current) return;

    sessChartRef.current?.destroy();
    revChartRef.current?.destroy();

    // Build lookup by ISO numeric id
    const sessionsByIso: Record<number, number> = {};
    const revenueByIso: Record<number, number> = {};
    for (const row of data) {
      const iso = NAME_TO_ISO[row.country];
      if (iso !== undefined) {
        sessionsByIso[iso] = (sessionsByIso[iso] || 0) + row.sessions;
        revenueByIso[iso] = (revenueByIso[iso] || 0) + row.revenue;
      }
    }

    const makeDataset = (lookup: Record<number, number>) =>
      geoFeatures.map((f) => ({
        feature: f,
        value: lookup[Number(f.id)] ?? 0,
      }));

    const baseOpts: ChartConfiguration<"choropleth">["options"] = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { color: MUTED, font: FONT },
        },
      },
      scales: {
        projection: {
          axis: "x",
          projection: "naturalEarth1",
        },
        color: {
          axis: "x",
          quantize: 6,
          legend: { position: "bottom-right", align: "bottom" },
        },
      },
    };

    // Sessions choropleth
    const sessCfg: ChartConfiguration<"choropleth"> = {
      type: "choropleth",
      data: {
        labels: geoFeatures.map((f) => (f.properties as Record<string,string>)?.name ?? ""),
        datasets: [
          {
            label: "Sessions",
            data: makeDataset(sessionsByIso),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            backgroundColor(ctx: any) {
              if (ctx.type !== "data") return "rgba(0,0,0,0)";
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const v = (ctx.raw as any).value as number;
              if (!v) return "#1C1C1C";
              const max = Math.max(...Object.values(sessionsByIso));
              const t = Math.sqrt(v / max); // sqrt for better contrast
              return `rgba(99,102,241,${0.15 + t * 0.8})`;
            },
            borderColor: "#2A2A2A",
            borderWidth: 0.5,
          } as never,
        ],
      },
      options: {
        ...baseOpts,
        plugins: {
          ...baseOpts.plugins,
          tooltip: {
            callbacks: {
              label: (ctx) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const v = (ctx.raw as any).value as number;
                return v ? `Sessions: ${v.toLocaleString()}` : "No data";
              },
            },
          },
        },
      },
    };

    // Revenue choropleth
    const revCfg: ChartConfiguration<"choropleth"> = {
      type: "choropleth",
      data: {
        labels: geoFeatures.map((f) => (f.properties as Record<string,string>)?.name ?? ""),
        datasets: [
          {
            label: "Revenue",
            data: makeDataset(revenueByIso),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            backgroundColor(ctx: any) {
              if (ctx.type !== "data") return "rgba(0,0,0,0)";
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const v = (ctx.raw as any).value as number;
              if (!v) return "#1C1C1C";
              const max = Math.max(...Object.values(revenueByIso));
              const t = Math.sqrt(v / max);
              return `rgba(245,158,11,${0.15 + t * 0.8})`;
            },
            borderColor: "#2A2A2A",
            borderWidth: 0.5,
          } as never,
        ],
      },
      options: {
        ...baseOpts,
        plugins: {
          ...baseOpts.plugins,
          tooltip: {
            callbacks: {
              label: (ctx) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const v = (ctx.raw as any).value as number;
                return v ? `Revenue: $${v.toLocaleString()}` : "No data";
              },
            },
          },
        },
      },
    };

    sessChartRef.current = new Chart(sessCanvasRef.current, sessCfg);
    revChartRef.current = new Chart(revCanvasRef.current, revCfg);

    return () => {
      sessChartRef.current?.destroy();
      revChartRef.current?.destroy();
    };
  }, [data, geoFeatures]);

  if (loading || !geoFeatures) return <div className="skeleton h-72 rounded" />;
  if (error) return <p className="text-[#F43F5E] text-xs font-mono">Error: {error}</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p className="filter-label mb-2">Sessions by Country</p>
        <div className="chart-wrapper" style={{ height: 280 }}>
          <canvas ref={sessCanvasRef} />
        </div>
      </div>
      <div>
        <p className="filter-label mb-2">Revenue by Country</p>
        <div className="chart-wrapper" style={{ height: 280 }}>
          <canvas ref={revCanvasRef} />
        </div>
      </div>
    </div>
  );
}
