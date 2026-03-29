import { NextRequest, NextResponse } from "next/server";
import {
  getBigQuery,
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

  // V6: page navigation flow for Sankey chart
  // Builds from→to pairs by ordering page_view events within each session by timestamp
  const query = `
    WITH page_views AS (
      SELECT
        CONCAT(
          user_pseudo_id, '-',
          CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)
        ) AS session_key,
        event_timestamp,
        REGEXP_REPLACE(
          COALESCE(
            (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_title'),
            (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location'),
            'Unknown'
          ),
          r' - .*$', ''   -- strip site name suffix from page titles
        ) AS page_label
      FROM \`${BQ_TABLE}\`
      WHERE ${dateFilter(startDate, endDate)}
        AND event_name = 'page_view'${whereExtra}
    ),
    ordered AS (
      SELECT
        session_key,
        page_label,
        LEAD(page_label) OVER (PARTITION BY session_key ORDER BY event_timestamp) AS next_page
      FROM page_views
    )
    SELECT
      page_label  AS from_page,
      next_page   AS to_page,
      COUNT(*)    AS flow_count
    FROM ordered
    WHERE next_page IS NOT NULL
      AND page_label != next_page
    GROUP BY from_page, to_page
    HAVING flow_count >= 50
    ORDER BY flow_count DESC
    LIMIT 20
  `;

  try {
    const [rows] = await getBigQuery().query({ query });
    return NextResponse.json(
      rows.map(
        (r: { from_page: string; to_page: string; flow_count: unknown }) => ({
          from: r.from_page,
          to: r.to_page,
          flow: Number(r.flow_count),
        })
      )
    );
  } catch (err) {
    console.error("Journey query failed:", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
