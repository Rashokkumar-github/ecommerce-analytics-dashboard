import { NextRequest, NextResponse } from "next/server";
import {
  bigquery,
  BQ_TABLE,
  dateFilter,
  parseFilters,
  buildFilterClauses,
} from "@/lib/bigquery";

export async function GET(req: NextRequest) {
  const { startDate, endDate, countries, sources, regions, device } = parseFilters(
    req.url
  );

  // For geo, skip country filter (we group by it) but apply source, device, and region
  const extraClauses = buildFilterClauses([], sources, device, regions);
  const whereExtra =
    extraClauses.length > 0 ? " AND " + extraClauses.join(" AND ") : "";

  // Optionally restrict to selected countries if explicitly filtered
  const countryFilter =
    countries.length > 0
      ? ` AND geo.country IN (${countries
          .map((c) => `'${c.replace(/'/g, "\\'")}'`)
          .join(", ")})`
      : "";

  // V7: sessions + revenue per country
  const query = `
    SELECT
      geo.country AS country,
      COUNT(DISTINCT CONCAT(
        user_pseudo_id, '-',
        CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)
      )) AS sessions,
      ROUND(COALESCE(SUM(CASE WHEN event_name = 'purchase' THEN ecommerce.purchase_revenue_in_usd ELSE 0 END), 0), 2) AS revenue
    FROM \`${BQ_TABLE}\`
    WHERE ${dateFilter(startDate, endDate)}
      AND geo.country IS NOT NULL
      AND geo.country != ''${whereExtra}${countryFilter}
    GROUP BY country
    ORDER BY sessions DESC
    LIMIT 100
  `;

  try {
    const [rows] = await bigquery.query({ query });
    return NextResponse.json(
      rows.map((r: { country: string; sessions: unknown; revenue: unknown }) => ({
        country: r.country,
        sessions: Number(r.sessions),
        revenue: Number(r.revenue),
      }))
    );
  } catch (err) {
    console.error("Geo query failed:", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
