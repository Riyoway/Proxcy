import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import {
  GOOGLE_TEST_URL,
  GOOGLE_TIMEOUT_MS,
  TEST_URLS,
  URL_TIMEOUT_MS,
} from "./config.js";
import { normalizeProxy } from "./proxyUtils.js";
import type { ProxyRecord } from "./types.js";

type ProxyAgent = SocksProxyAgent | HttpsProxyAgent<string>;

/**
 * Build axios config for proxy requests.
 */
function buildRequestConfig(agent: ProxyAgent, timeoutMs: number) {
  return {
    httpAgent: agent,
    httpsAgent: agent,
    timeout: timeoutMs,
    validateStatus: () => true,
  };
}

/**
 * Test a single proxy.
 *
 * Python-compatible logic (proven to find ~1400 valid proxies):
 *   - Try each TEST_URL sequentially
 *   - First success wins, break loop
 *   - On error, continue to next URL silently
 *   - Only return null if ALL urls failed
 *
 * Speed comes from concurrency at the runner level, not from
 * parallel checks within a single proxy.
 */
export async function testProxy(
  proxyStr: string,
): Promise<ProxyRecord | null> {
  const normalized = normalizeProxy(proxyStr);
  let urlObj: URL;
  try {
    urlObj = new URL(normalized);
  } catch {
    return null;
  }

  const ip = urlObj.hostname.toLowerCase();
  const port = parseInt(urlObj.port) || 80;
  const protocol = urlObj.protocol.replace(":", "").toLowerCase();
  const id = `${protocol}://${ip}:${port}`;

  let agent: ProxyAgent;
  if (protocol.startsWith("socks")) {
    agent = new SocksProxyAgent(normalized);
  } else {
    agent = new HttpsProxyAgent(normalized);
  }

  const startTime = Date.now();
  let isValid = false;
  let isGoogle = false;
  let speedMs = 0;

  try {
    // ---- Validity check: sequential URL try (Python-style) ----
    for (const testUrl of TEST_URLS) {
      try {
        const res = await axios.get(
          testUrl,
          buildRequestConfig(agent, URL_TIMEOUT_MS),
        );
        if (res.status === 200) {
          isValid = true;
          speedMs = Date.now() - startTime;
          break;
        }
      } catch {
        // try next URL
      }
    }

    if (!isValid) return null;

    // ---- Google check (non-blocking on failure) ----
    try {
      const gRes = await axios.get(
        GOOGLE_TEST_URL,
        buildRequestConfig(agent, GOOGLE_TIMEOUT_MS),
      );
      if (gRes.status === 204 || gRes.status === 200) {
        isGoogle = true;
      }
    } catch {
      // many valid proxies fail Google - that's OK
    }
  } finally {
    agent.destroy?.();
  }

  return {
    id,
    ip,
    port,
    protocol,
    speed_ms: speedMs,
    is_valid: isValid,
    is_google: isGoogle,
    country_code: null,
    country_name: null,
    asn: null,
    organization: null,
    geo_status: "unavailable",
    checked_at: new Date().toISOString(),
  };
}
