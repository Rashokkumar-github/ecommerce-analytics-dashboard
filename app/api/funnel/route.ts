import { NextRequest, NextResponse } from "next/server";
import {
  getBigQuery,
  BQ_TABLE,
  dateFilter,
  parseFilters,
  buildFilterClauses,
} from "@/lib/bigquery";

export const revalidate = 3600; // cache for 1 hour

export async function GET(req: NextRequest) {
  const { startDate, endDate, countries, sources, regions, device } = parseFilters(
    req.url
  );

  const extraClauses = buildFilterClauses(countries, sources, device, regions);
  const whereExtra =
    extraClauses.length > 0 ? " AND " + extraClauses.join(" AND ") : "";

  // V3: conversion funnel — unique sessions that fired each step event
  const query = `
    WITH sessions AS (
      SELECT
        CONCAT(
          user_pseudo_id, '-',
          CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)
        ) AS session_key,
        MAX(CASE WHEN event_name = 'session_start'   THEN 1 ELSE 0 END) AS step_session,
        MAX(CASE WHEN event_name = 'view_item'        THEN 1 ELSE 0 END) AS step_view,
        MAX(CASE WHEN event_name = 'add_to_cart'      THEN 1 ELSE 0 END) AS step_cart,
        MAX(CASE WHEN event_name = 'begin_checkout'   THEN 1 ELSE 0 END) AS step_checkout,
        MAX(CASE WHEN event_name = 'purchase'         THEN 1 ELSE 0 END) AS step_purchase
      FROM \`${BQ_TABLE}\`
      WHERE ${dateFilter(startDate, endDate)}${whereExtra}
      GROUP BY session_key
    )
    SELECT
      SUM(step_session)  AS sessions,
      SUM(step_view)     AS view_item,
      SUM(step_cart)     AS add_to_cart,
      SUM(step_checkout) AS begin_checkout,
      SUM(step_purchase) AS purchase
    FROM sessions
  `;

  try {
    const [rows] = await getBigQuery().query({ query });
    const r = rows[0];
    return NextResponse.json([
      { step: "Sessions",       count: Number(r.sessions) },
      { step: "View Item",      count: Number(r.view_item) },
      { step: "Add to Cart",    count: Number(r.add_to_cart) },
      { step: "Begin Checkout", count: Number(r.begin_checkout) },
      { step: "Purchase",       count: Number(r.purchase) },
    ]);
  } catch (err) {
    console.error("Funnel query failed:", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
