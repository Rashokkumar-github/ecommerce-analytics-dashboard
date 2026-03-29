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

  const query = `
    WITH sessions AS (
      SELECT
        user_pseudo_id,
        (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS session_id,
        MAX(
          CASE
            WHEN (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'session_engaged') = '1' THEN 1
            ELSE 0
          END
        ) AS is_engaged,
        MAX(CASE WHEN event_name = 'purchase' THEN 1 ELSE 0 END) AS has_purchase,
        MAX(CASE WHEN event_name = 'add_to_cart' THEN 1 ELSE 0 END) AS has_cart,
        COALESCE(SUM(CASE WHEN event_name = 'purchase' THEN ecommerce.purchase_revenue_in_usd ELSE 0 END), 0) AS revenue,
        COUNTIF(event_name = 'purchase') AS transactions
      FROM \`${BQ_TABLE}\`
      WHERE ${dateFilter(startDate, endDate)}${whereExtra}
      GROUP BY user_pseudo_id, session_id
    )
    SELECT
      COUNT(*)                                                           AS total_sessions,
      SUM(is_engaged)                                                    AS engaged_sessions,
      SUM(has_purchase)                                                  AS purchasing_sessions,
      SUM(has_cart)                                                      AS cart_sessions,
      ROUND(SUM(revenue), 2)                                             AS total_revenue,
      SUM(transactions)                                                  AS total_transactions
    FROM sessions
  `;

  try {
    const [rows] = await getBigQuery().query({ query });
    const r = rows[0];

    const totalSessions = Number(r.total_sessions) || 0;
    const engagedSessions = Number(r.engaged_sessions) || 0;
    const purchasingSessions = Number(r.purchasing_sessions) || 0;
    const cartSessions = Number(r.cart_sessions) || 0;
    const totalRevenue = Number(r.total_revenue) || 0;
    const totalTransactions = Number(r.total_transactions) || 0;

    return NextResponse.json({
      engagementRate:
        totalSessions > 0
          ? Math.round((engagedSessions / totalSessions) * 10000) / 100
          : 0,
      purchaseConvRate:
        totalSessions > 0
          ? Math.round((purchasingSessions / totalSessions) * 10000) / 100
          : 0,
      totalRevenue,
      aov:
        totalTransactions > 0
          ? Math.round((totalRevenue / totalTransactions) * 100) / 100
          : 0,
      cartAbandonmentRate:
        cartSessions > 0
          ? Math.round(
              ((cartSessions - purchasingSessions) / cartSessions) * 10000
            ) / 100
          : 0,
      totalSessions,
      totalTransactions,
    });
  } catch (err) {
    console.error("KPI query failed:", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
