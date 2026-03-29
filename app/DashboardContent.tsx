"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import "@/components/charts/chartSetup";
import FilterBar from "@/components/FilterBar";
import KPICard from "@/components/KPICard";
import BounceRateTable from "@/components/BounceRateTable";
import RevenueSessionsChart from "@/components/charts/RevenueSessionsChart";
import TrafficSourceChart from "@/components/charts/TrafficSourceChart";
import FunnelChart from "@/components/charts/FunnelChart";
import TopProductsChart from "@/components/charts/TopProductsChart";
import JourneyChart from "@/components/charts/JourneyChart";
import GeoMapsChart from "@/components/charts/GeoMapsChart";
import DeviceChart from "@/components/charts/DeviceChart";
import RevenueTransactionsChart from "@/components/charts/RevenueTransactionsChart";
import AOVChart from "@/components/charts/AOVChart";

// ── Types ─────────────────────────────────────────────────────────────────────

type KPIData = {
  engagementRate: number;
  purchaseConvRate: number;
  totalRevenue: number;
  aov: number;
  cartAbandonmentRate: number;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="mb-5">
      <p className="section-label">{eyebrow}</p>
      <h2 className="section-title">{title}</h2>
      <p className="section-desc">{desc}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      {title && (
        <p className="filter-label mb-4">{title}</p>
      )}
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const params = useSearchParams();
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  const fetchKpis = useCallback(async () => {
    setKpiLoading(true);
    try {
      const qs = params.toString();
      const res = await fetch(`/api/kpis${qs ? "?" + qs : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setKpis(await res.json());
    } catch {
      // cards display 0 on failure — not blocking
    } finally {
      setKpiLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  return (
    <div className="min-h-screen">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <header className="px-6 md:px-10 pt-8 pb-5 border-b border-[#2A2A2A]">
        <p className="section-label">GA4 Obfuscated E-Commerce · Nov 2020 – Jan 2021</p>
        <h1 className="text-3xl md:text-4xl mt-1 font-normal tracking-tight text-[#F5F0E8]">
          E-Commerce Analytics Dashboard
        </h1>
      </header>

      {/* ── Sticky Filter Bar ─────────────────────────────────────────────── */}
      <FilterBar />

      {/* ── KPI Bar ──────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 pt-7 pb-2">
        {kpiLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <KPICard
              label="Total Revenue"
              value={kpis?.totalRevenue ?? 0}
              format="currency"
              accent="amber"
              tooltip="Sum of all purchase revenue in USD across the selected period."
              index={0}
            />
            <KPICard
              label="Engagement Rate"
              value={kpis?.engagementRate ?? 0}
              format="percent"
              accent="indigo"
              tooltip="Sessions where users were engaged (≥10 s on page, 2+ page views, or conversion) ÷ total sessions."
              index={1}
            />
            <KPICard
              label="Purchase Conv. Rate"
              value={kpis?.purchaseConvRate ?? 0}
              format="percent"
              accent="green"
              tooltip="Sessions that resulted in a purchase ÷ total sessions."
              index={2}
            />
            <KPICard
              label="Avg. Order Value"
              value={kpis?.aov ?? 0}
              format="currency"
              accent="teal"
              tooltip="Total purchase revenue ÷ number of transactions."
              index={3}
            />
            <KPICard
              label="Cart Abandonment"
              value={kpis?.cartAbandonmentRate ?? 0}
              format="percent"
              accent="rose"
              tooltip="Sessions with add-to-cart but no purchase ÷ sessions with add-to-cart."
              index={4}
            />
          </div>
        )}
      </section>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="px-6 md:px-10 py-8 space-y-12">

        {/* ① Revenue — daily trends + monthly breakdown + AOV ─────────── */}
        <section>
          <SectionHeader
            eyebrow="Revenue"
            title="Revenue Trends & Order Value"
            desc="Daily revenue and session volume, monthly transaction totals, and average order value over time."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard title="Revenue & Sessions — Daily">
              <RevenueSessionsChart />
            </ChartCard>
            <ChartCard title="Monthly Revenue & Transactions">
              <RevenueTransactionsChart />
            </ChartCard>
          </div>
          <ChartCard title="Monthly Average Order Value">
            <AOVChart />
          </ChartCard>
        </section>

        {/* ② Acquisition — sources + devices + geography ──────────────── */}
        <section>
          <SectionHeader
            eyebrow="Acquisition"
            title="Traffic Sources, Devices & Geography"
            desc="Where sessions originate — by channel, device type, and country."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard title="Sessions by Traffic Source">
              <TrafficSourceChart />
            </ChartCard>
            <ChartCard title="Sessions by Device per Month">
              <DeviceChart />
            </ChartCard>
          </div>
          <ChartCard title="Geographic Distribution">
            <GeoMapsChart />
          </ChartCard>
        </section>

        {/* ③ Conversion — funnel + category revenue ────────────────────── */}
        <section>
          <SectionHeader
            eyebrow="Conversion"
            title="Purchase Funnel & Revenue by Category"
            desc="Drop-off at each funnel stage and the highest-revenue product categories."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Conversion Funnel">
              <FunnelChart />
            </ChartCard>
            <ChartCard title="Revenue by Category">
              <TopProductsChart />
            </ChartCard>
          </div>
        </section>

        {/* ④ Behavior — user journey + bounce rate ─────────────────────── */}
        <section>
          <SectionHeader
            eyebrow="Behavior"
            title="User Journey & Engagement"
            desc="How users navigate through the site and which pages see the highest bounce rates."
          />
          <ChartCard title="User Journey Flow">
            <JourneyChart />
          </ChartCard>
          <SectionHeader
            eyebrow="Engagement"
            title="Bounce Rate by Page"
            desc="Pages ranked by session volume. Click any column header to sort. Bounce = session with no GA4 engagement signal."
          />
          <BounceRateTable />
        </section>

      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="px-6 md:px-10 py-6 border-t border-[#2A2A2A]">
        <p className="text-[0.65rem] font-mono text-[#9D9690]">
          Data source: <span className="text-[#F5F0E8]">bigquery-public-data.ga4_obfuscated_sample_ecommerce</span>
          &nbsp;·&nbsp; Period: <span className="text-[#F5F0E8]">2020-11-01 → 2021-01-31</span>
          &nbsp;·&nbsp; Project: <span className="text-[#F5F0E8]">data-vis-491514</span>
        </p>
      </footer>
    </div>
  );
}
