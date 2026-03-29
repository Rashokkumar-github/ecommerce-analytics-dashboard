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

  const extraClauses = buildFilterClauses(countries, sources, device, regions);
  const whereExtra =
    extraClauses.length > 0 ? " AND " + extraClauses.join(" AND ") : "";

  // V1: daily revenue + unique sessions
  const query = `
    WITH daily AS (
      SELECT
        event_date,
        CONCAT(
          SUBSTR(event_date, 1, 4), '-',
          SUBSTR(event_date, 5, 2), '-',
          SUBSTR(event_date, 7, 2)
        ) AS date,
        COALESCE(SUM(CASE WHEN event_name = 'purchase' THEN ecommerce.purchase_revenue_in_usd ELSE 0 END), 0) AS revenue,
        COUNT(DISTINCT CONCAT(
          user_pseudo_id, '-',
          CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)
        )) AS sessions
      FROM \`${BQ_TABLE}\`
      WHERE ${dateFilter(startDate, endDate)}${whereExtra}
      GROUP BY event_date
    )
    SELECT date, ROUND(revenue, 2) AS revenue, sessions
    FROM daily
    ORDER BY date
  `;

  try {
    const [rows] = await bigquery.query({ query });
    return NextResponse.json(
      rows.map((r: { date: string; revenue: unknown; sessions: unknown }) => ({
        date: r.date,
        revenue: Number(r.revenue),
        sessions: Number(r.sessions),
      }))
    );
  } catch (err) {
    console.error("Revenue query failed:", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
