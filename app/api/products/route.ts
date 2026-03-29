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

  const url = new URL(req.url);
  const category = url.searchParams.get("category");

  try {
    if (category) {
      // Drill-down: top products within a specific category
      const query = `
        SELECT
          item.item_name                                             AS product,
          ROUND(SUM(item.price_in_usd * item.quantity), 2)          AS revenue,
          SUM(item.quantity)                                         AS units_sold,
          COUNT(DISTINCT ecommerce.transaction_id)                   AS transactions
        FROM \`${BQ_TABLE}\`,
        UNNEST(items) AS item
        WHERE ${dateFilter(startDate, endDate)}
          AND event_name = 'purchase'
          AND item.item_name IS NOT NULL
          AND item.item_category = @category${whereExtra}
        GROUP BY product
        ORDER BY revenue DESC
        LIMIT 10
      `;
      const [rows] = await getBigQuery().query({ query, params: { category } });
      return NextResponse.json(
        rows.map(
          (r: { product: string; revenue: unknown; units_sold: unknown; transactions: unknown }) => ({
            product: r.product,
            revenue: Number(r.revenue),
            unitsSold: Number(r.units_sold),
            transactions: Number(r.transactions),
          })
        )
      );
    } else {
      // Default: top categories by revenue
      const query = `
        SELECT
          COALESCE(item.item_category, '(Uncategorized)')            AS category,
          ROUND(SUM(item.price_in_usd * item.quantity), 2)          AS revenue,
          SUM(item.quantity)                                         AS units_sold,
          COUNT(DISTINCT ecommerce.transaction_id)                   AS transactions
        FROM \`${BQ_TABLE}\`,
        UNNEST(items) AS item
        WHERE ${dateFilter(startDate, endDate)}
          AND event_name = 'purchase'${whereExtra}
        GROUP BY category
        ORDER BY revenue DESC
        LIMIT 10
      `;
      const [rows] = await getBigQuery().query({ query });
      return NextResponse.json(
        rows.map(
          (r: { category: string; revenue: unknown; units_sold: unknown; transactions: unknown }) => ({
            category: r.category,
            revenue: Number(r.revenue),
            unitsSold: Number(r.units_sold),
            transactions: Number(r.transactions),
          })
        )
      );
    }
  } catch (err) {
    console.error("Products query failed:", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
