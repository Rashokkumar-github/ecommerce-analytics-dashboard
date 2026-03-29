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

  // V2: unique sessions grouped by traffic medium
  const query = `
    SELECT
      COALESCE(NULLIF(traffic_source.medium, ''), '(none)') AS medium,
      COUNT(DISTINCT CONCAT(
        user_pseudo_id, '-',
        CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)
      )) AS sessions
    FROM \`${BQ_TABLE}\`
    WHERE ${dateFilter(startDate, endDate)}${whereExtra}
    GROUP BY medium
    ORDER BY sessions DESC
  `;

  try {
    const [rows] = await bigquery.query({ query });
    return NextResponse.json(
      rows.map((r: { medium: string; sessions: unknown }) => ({
        medium: r.medium,
        sessions: Number(r.sessions),
      }))
    );
  } catch (err) {
    console.error("Traffic sources query failed:", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
