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

  // For devices chart we group by device, so only apply country + source + region filters
  const extraClauses = buildFilterClauses(countries, sources, "all", regions);
  const whereExtra =
    extraClauses.length > 0 ? " AND " + extraClauses.join(" AND ") : "";

  // If user filtered to a specific device, narrow the data
  const deviceFilter =
    device !== "all" && device !== ""
      ? ` AND device.category = '${device.replace(/'/g, "\\'")}'`
      : "";

  // V8: sessions by month × device category
  const query = `
    SELECT
      FORMAT_DATE('%Y-%m', PARSE_DATE('%Y%m%d', event_date)) AS month,
      device.category                                         AS device,
      COUNT(DISTINCT CONCAT(
        user_pseudo_id, '-',
        CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)
      )) AS sessions
    FROM \`${BQ_TABLE}\`
    WHERE ${dateFilter(startDate, endDate)}
      AND device.category IS NOT NULL${whereExtra}${deviceFilter}
    GROUP BY month, device
    ORDER BY month, device
  `;

  try {
    const [rows] = await getBigQuery().query({ query });
    return NextResponse.json(
      rows.map((r: { month: string; device: string; sessions: unknown }) => ({
        month: r.month,
        device: r.device,
        sessions: Number(r.sessions),
      }))
    );
  } catch (err) {
    console.error("Devices query failed:", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
