import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

// ============================================================
// Proxy Test URLs - Python-style: try sequentially, accept any
// ============================================================
export const TEST_URLS = [
  "http://httpbin.org/ip",
  "http://ipinfo.io/ip",
  "http://checkip.amazonaws.com",
];

export const GOOGLE_TEST_URL = "https://www.google.com/generate_204";

// ============================================================
// Timeouts (Python-aligned for max detection rate)
// ============================================================
export const URL_TIMEOUT_MS = 8000; // Per-URL axios timeout (Python: 10s total)
export const GOOGLE_TIMEOUT_MS = 6000; // Google check is non-critical
export const PER_PROXY_HARD_LIMIT_MS = 30000; // Absolute upper bound at runner level
export const SOURCE_FETCH_TIMEOUT_MS = 15000;

// ============================================================
// Concurrency
// ============================================================
export const CONCURRENCY = 500; // Match Python's max_concurrent
export const SOURCE_FETCH_CONCURRENCY = 15;
export const GEO_LOOKUP_CONCURRENCY = 4;

// ============================================================
// Upload
// ============================================================
export const UPLOAD_BATCH_SIZE = 50;

// ============================================================
// Cycle
// ============================================================
export const CONTINUOUS_MODE = process.env.CHECKER_CONTINUOUS === "true";
export const CYCLE_INTERVAL_MS = 3 * 60 * 1000; // 3 min between cycles

// ============================================================
// Supabase
// ============================================================
export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) environment variables.",
  );
  process.exit(1);
}
