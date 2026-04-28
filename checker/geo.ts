import axios from "axios";
import geoip from "geoip-lite";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./config.js";
import type { GeoMetadata } from "./types.js";

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const geoCache = new Map<string, GeoMetadata>();

/**
 * Preload geo cache from Supabase to avoid re-querying APIs.
 */
export async function seedGeoCacheFromSupabase(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("proxies")
      .select("ip,country_code,country_name,asn,organization,geo_status")
      .eq("geo_status", "resolved");
    if (error) return;
    for (const row of data ?? []) {
      if (row?.ip && !geoCache.has(row.ip)) {
        geoCache.set(row.ip, {
          country_code: row.country_code,
          country_name: row.country_name,
          asn: row.asn,
          organization: row.organization,
          geo_status: "resolved",
        });
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * Local geoip-lite fallback (no ASN/org).
 */
function getLocalGeoMetadata(ip: string): GeoMetadata {
  const geo = geoip.lookup(ip);
  if (!geo) {
    return {
      country_code: null,
      country_name: null,
      asn: null,
      organization: null,
      geo_status: "unavailable",
    };
  }
  return {
    country_code: geo.country,
    country_name: geo.country,
    asn: null,
    organization: null,
    geo_status: "resolved",
  };
}

/**
 * Enrich an IP with full geo data (country + ASN + org).
 * Uses ipwho.is, falls back to ip-api.com, then local geoip-lite.
 * Caches results to avoid hitting rate limits.
 */
export async function fetchRichGeoMetadata(ip: string): Promise<GeoMetadata> {
  const cached = geoCache.get(ip);
  if (cached) return cached;

  // 1. ipwho.is
  try {
    const res = await axios.get(
      `https://ipwho.is/${ip}?fields=success,country,country_code,connection`,
      { timeout: 10000 },
    );
    const payload = res.data;
    if (payload?.success) {
      const data: GeoMetadata = {
        country_code: payload.country_code || null,
        country_name: payload.country || null,
        asn: payload.connection?.asn ? `AS${payload.connection.asn}` : null,
        organization: payload.connection?.org || null,
        geo_status: "resolved",
      };
      geoCache.set(ip, data);
      await new Promise((r) => setTimeout(r, 1000));
      return data;
    }
  } catch {
    /* ignore */
  }

  // 2. ip-api.com
  try {
    const res = await axios.get(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,org,as,isp`,
      { timeout: 10000 },
    );
    const payload = res.data;
    if (payload?.status === "success") {
      const asnStr = payload.as ? payload.as.split(" ")[0] : null;
      const data: GeoMetadata = {
        country_code: payload.countryCode || null,
        country_name: payload.country || null,
        asn: asnStr,
        organization: payload.org || payload.isp || null,
        geo_status: "resolved",
      };
      geoCache.set(ip, data);
      await new Promise((r) => setTimeout(r, 1400));
      return data;
    }
  } catch {
    /* ignore */
  }

  // 3. Local fallback
  return getLocalGeoMetadata(ip);
}
