import { BigQuery } from "@google-cloud/bigquery";

/**
 * Shared BigQuery client — credentials read from environment variables.
 * Never import this in client components; only use in API routes (server-side).
 *
 * Required env vars (set in .env.local for dev, Vercel dashboard for prod):
 *   GOOGLE_PROJECT_ID      — GCP project that will be billed for queries
 *   GOOGLE_CLIENT_EMAIL    — Service account email
 *   GOOGLE_PRIVATE_KEY     — Service account private key (newlines as \n)
 */

function createBigQueryClient(): BigQuery {
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing BigQuery credentials. " +
        "Set GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, and GOOGLE_PRIVATE_KEY in .env.local"
    );
  }

  return new BigQuery({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
}

// Lazy singleton — only created on first request, not at build time
const globalForBQ = globalThis as unknown as { bigquery: BigQuery | undefined };

export function getBigQuery(): BigQuery {
  if (!globalForBQ.bigquery) {
    globalForBQ.bigquery = createBigQueryClient();
  }
  return globalForBQ.bigquery;
}

/* ─── Constants ─────────────────────────────────────────────── */

export const BQ_TABLE =
  "bigquery-public-data.ga4_obfuscated_sample_ecommerce.events_*";

export const DEFAULT_START = "2020-11-01";
export const DEFAULT_END   = "2021-01-31";

/**
 * Converts a YYYY-MM-DD date string to the YYYYMMDD suffix format
 * used by _TABLE_SUFFIX filters on GA4 partitioned tables.
 */
export function toSuffix(date: string): string {
  return date.replace(/-/g, "");
}

/**
 * Builds the standard WHERE clause for date range filtering.
 * Always pair with _TABLE_SUFFIX in the FROM clause.
 */
export function dateFilter(startDate: string, endDate: string): string {
  return `_TABLE_SUFFIX BETWEEN '${toSuffix(startDate)}' AND '${toSuffix(endDate)}'`;
}

/**
 * Parses filter query params from a Next.js Request URL.
 * Returns typed, validated filter values with defaults.
 *
 * Arrays (country, source, region) are encoded as comma-joined single params
 * by the FilterBar (e.g. ?source=organic,cpc), so we split on "," here.
 */
export function parseFilters(url: string): {
  startDate: string;
  endDate: string;
  countries: string[];
  sources: string[];
  regions: string[];
  device: string;
} {
  const { searchParams } = new URL(url);

  const startDate = searchParams.get("startDate") ?? DEFAULT_START;
  const endDate   = searchParams.get("endDate")   ?? DEFAULT_END;
  const countries = (searchParams.get("country") ?? "").split(",").filter(Boolean);
  const sources   = (searchParams.get("source")  ?? "").split(",").filter(Boolean);
  const regions   = (searchParams.get("region")  ?? "").split(",").filter(Boolean);
  const device    = searchParams.get("device")   ?? "all";

  return { startDate, endDate, countries, sources, regions, device };
}

/**
 * Builds additional SQL WHERE fragments for optional filters.
 * Returns an array of clauses to join with AND.
 */
export function buildFilterClauses(
  countries: string[],
  sources: string[],
  device: string,
  regions: string[] = []
): string[] {
  const clauses: string[] = [];

  if (countries.length > 0) {
    const quoted = countries.map((c) => `'${c.replace(/'/g, "\\'")}'`).join(", ");
    clauses.push(`geo.country IN (${quoted})`);
  }

  if (regions.length > 0) {
    const quoted = regions.map((r) => `'${r.replace(/'/g, "\\'")}'`).join(", ");
    clauses.push(`geo.continent IN (${quoted})`);
  }

  if (sources.length > 0) {
    // In GA4, direct traffic is stored as '' (empty string), displayed as '(none)'.
    // Both the 'direct' and '(none)' chips map to that empty-string value in BigQuery.
    const conditions: string[] = [];
    const literalSources: string[] = [];
    for (const s of sources) {
      if (s === "direct" || s === "(none)") {
        conditions.push(`COALESCE(traffic_source.medium, '') = ''`);
      } else {
        literalSources.push(`'${s.replace(/'/g, "\\'")}'`);
      }
    }
    if (literalSources.length > 0) {
      conditions.push(`traffic_source.medium IN (${literalSources.join(", ")})`);
    }
    clauses.push(`(${conditions.join(" OR ")})`);
  }

  if (device !== "all" && device !== "") {
    clauses.push(`device.category = '${device.replace(/'/g, "\\'")}'`);
  }

  return clauses;
}
