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

  // V9 + V10: monthly revenue, transactions, and AOV
  const query = `
    WITH monthly_purchases AS (
      SELECT
        FORMAT_DATE('%Y-%m', PARSE_DATE('%Y%m%d', event_date)) AS month,
        ecommerce.purchase_revenue_in_usd                       AS revenue,
        ecommerce.transaction_id                                AS transaction_id
      FROM \`${BQ_TABLE}\`
      WHERE ${dateFilter(startDate, endDate)}
        AND event_name = 'purchase'
        AND ecommerce.transaction_id IS NOT NULL${whereExtra}
    )
    SELECT
      month,
      ROUND(SUM(revenue), 2)                              AS total_revenue,
      COUNT(DISTINCT transaction_id)                       AS transactions,
      ROUND(
        SAFE_DIVIDE(SUM(revenue), COUNT(DISTINCT transaction_id)),
        2
      )                                                    AS aov
    FROM monthly_purchases
    GROUP BY month
    ORDER BY month
  `;

  try {
    const [rows] = await bigquery.query({ query });
    return NextResponse.json(
      rows.map(
        (r: {
          month: string;
          total_revenue: unknown;
          transactions: unknown;
          aov: unknown;
        }) => ({
          month: r.month,
          revenue: Number(r.total_revenue),
          transactions: Number(r.transactions),
          aov: Number(r.aov),
        })
      )
    );
  } catch (err) {
    console.error("Monthly query failed:", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
