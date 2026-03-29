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

  // V6: bounce rate per landing page
  // A session "bounces" when no event in the session has session_engaged = '1'.
  // We must scan ALL events (not just session_start) because GA4 sets the
  // session_engaged flag on subsequent events once engagement is established —
  // it is almost never present on the session_start event itself.
  // Landing page is captured from the session_start event separately.
  const query = `
    WITH all_events AS (
      SELECT
        CONCAT(
          user_pseudo_id, '-',
          CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)
        ) AS session_key,
        event_name,
        REGEXP_REPLACE(
          COALESCE(
            (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location'),
            ''
          ),
          r'\\?.*$', ''
        ) AS page_path,
        CASE
          WHEN (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'session_engaged') = '1' THEN 1
          ELSE 0
        END AS is_engaged
      FROM \`${BQ_TABLE}\`
      WHERE ${dateFilter(startDate, endDate)}${whereExtra}
    ),
    page_sessions AS (
      SELECT
        e.session_key,
        -- landing page = page_path from the session_start event
        MAX(CASE WHEN e.event_name = 'session_start' THEN e.page_path END) AS page_path,
        -- engaged if ANY event in the session carries session_engaged = '1'
        MAX(e.is_engaged) AS is_engaged
      FROM all_events e
      GROUP BY e.session_key
    )
    SELECT
      page_path,
      COUNT(*)                                                  AS sessions,
      SUM(CASE WHEN is_engaged = 0 THEN 1 ELSE 0 END)          AS bounces,
      ROUND(
        SUM(CASE WHEN is_engaged = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
        1
      )                                                         AS bounce_rate
    FROM page_sessions
    WHERE page_path != ''
    GROUP BY page_path
    HAVING sessions >= 10
    ORDER BY sessions DESC
    LIMIT 50
  `;

  try {
    const [rows] = await bigquery.query({ query });
    return NextResponse.json(
      rows.map(
        (r: {
          page_path: string;
          sessions: unknown;
          bounces: unknown;
          bounce_rate: unknown;
        }) => ({
          pagePath: r.page_path,
          sessions: Number(r.sessions),
          bounces: Number(r.bounces),
          bounceRate: Number(r.bounce_rate),
        })
      )
    );
  } catch (err) {
    console.error("Bounce rate query failed:", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
