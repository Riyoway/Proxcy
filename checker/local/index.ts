import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { createClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';
import geoip from 'geoip-lite';
import { SOURCES } from './sources.js';
import { scrapeAllProxies } from './scraper/index.js';
import { config } from 'dotenv';
import type { Agent as HttpAgent } from 'http';
import type { Agent as HttpsAgent } from 'https';
import type { CancelToken } from 'axios';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Constants
const TEST_URL = 'https://api.ipify.org';
const GOOGLE_TEST_URL = 'https://www.google.com/generate_204';
const TIMEOUT_MS = 7000;
const CONCURRENCY = 1000;
const UPLOAD_BATCH_SIZE = 20;
const CONTINUOUS_MODE = process.env.CHECKER_CONTINUOUS === 'true';

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ProxyRecord {
  id: string; // protocol://ip:port
  ip: string;
  port: number;
  protocol: string;
  speed_ms: number;
  is_valid: boolean;
  is_google: boolean;
  country_code: string | null;
  country_name: string | null;
  asn: string | null;
  organization: string | null;
  geo_status: 'resolved' | 'unavailable';
  checked_at: string;
}

type ProxyAgent = HttpAgent | HttpsAgent;
type NodeAxiosConfig = NonNullable<Parameters<typeof axios.get>[1]> & {
  httpAgent?: ProxyAgent;
  httpsAgent?: ProxyAgent;
  cancelToken?: CancelToken;
};

/**
 * Check if an IP is a valid public IP (not private/reserved/bogon)
 */
function isPublicIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return false;

  const [a, b] = parts;
  // Private ranges
  if (a === 10) return false;                           // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return false;    // 172.16.0.0/12
  if (a === 192 && b === 168) return false;              // 192.168.0.0/16
  // Loopback
  if (a === 127) return false;                           // 127.0.0.0/8
  // Link-local
  if (a === 169 && b === 254) return false;              // 169.254.0.0/16
  // Reserved/special
  if (a === 0) return false;                             // 0.0.0.0/8
  if (a >= 224) return false;                            // 224+ (multicast/reserved)
  if (a === 100 && b >= 64 && b <= 127) return false;    // 100.64.0.0/10 (CGNAT)

  return true;
}

/**
 * Gets GeoIP metadata using local geoip-lite library
 */
function getLocalGeoMetadata(ip: string): Partial<ProxyRecord> {
  const geo = geoip.lookup(ip);
  if (!geo) {
    return {
      country_code: null,
      country_name: null,
      geo_status: 'unavailable'
    };
  }

  return {
    country_code: geo.country,
    country_name: geo.country, 
    geo_status: 'resolved'
  };
}

function createProxyRequestConfig(agent: ProxyAgent, cancelToken?: CancelToken): NodeAxiosConfig {
  return {
    httpAgent: agent,
    httpsAgent: agent,
    timeout: TIMEOUT_MS,
    cancelToken,
    validateStatus: () => true,
  };
}

/**
 * Fisher-Yates shuffle algorithm to randomize array elements
 */
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Normalize a proxy string to protocol://ip:port format
 */
function normalizeProxy(proxyStr: string): string {
  let normalized = proxyStr.trim();
  if (!normalized.includes("://")) {
    normalized = "http://" + normalized;
  }
  try {
    const url = new URL(normalized);
    return `${url.protocol.toLowerCase()}//${url.hostname.toLowerCase()}${url.port ? ':' + url.port : ''}`;
  } catch {
    return normalized;
  }
}

/**
 * Extract IP:PORT from any text using regex and add to set
 */
function extractProxies(text: string, proxySet: Set<string>, seenIps: Set<string>) {
  const proxyRegex = /(?:(?:https?|socks[45]):\/\/)?\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}/gi;
  const matches = text.match(proxyRegex);
  
  if (matches) {
    for (const match of matches) {
      const normalized = normalizeProxy(match);
      try {
        const urlObj = new URL(normalized);
        const ip = urlObj.hostname;
        const port = parseInt(urlObj.port);

        // Filter out invalid IPs and ports
        if (!isPublicIp(ip)) continue;
        if (port < 1 || port > 65535) continue;

        if (!seenIps.has(ip)) {
          seenIps.add(ip);
          proxySet.add(normalized);
        }
      } catch {
        // Ignore
      }
    }
  }
}

/**
 * Downloads proxy lists from all sources and returns unique strings
 */
async function downloadProxies(): Promise<string[]> {
  const proxySet = new Set<string>();
  const seenIps = new Set<string>();
  const limit = pLimit(15);

  const tasks = SOURCES.map((url: string) => limit(async () => {
    try {
      const response = await axios.get(url, { timeout: 15000 });
      const data = response.data;
      const text = typeof data === 'string' ? data : JSON.stringify(data);
      extractProxies(text, proxySet, seenIps);
    } catch {
      // Ignore failed sources
    }
  }));

  await Promise.all(tasks);

  // Custom scrapers
  try {
    const scrapedProxies = await scrapeAllProxies();
    for (const proxy of scrapedProxies) {
      const normalized = normalizeProxy(proxy);
      try {
        const urlObj = new URL(normalized);
        const ip = urlObj.hostname;
        if (isPublicIp(ip) && !seenIps.has(ip)) {
          seenIps.add(ip);
          proxySet.add(normalized);
        }
      } catch {
        // Ignore
      }
    }
  } catch (err) {
    console.error('Error during custom scraping:', err);
  }

  return shuffleArray(Array.from(proxySet));
}

const geoCache = new Map<string, any>();

async function seedGeoCacheFromSupabase(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('proxies')
      .select('ip,country_code,country_name,asn,organization,geo_status')
      .eq('geo_status', 'resolved');

    if (error) return;
    for (const row of data ?? []) {
      if (!geoCache.has(row.ip)) {
        geoCache.set(row.ip, {
          country_code: row.country_code,
          country_name: row.country_name,
          asn: row.asn,
          organization: row.organization,
          geo_status: 'resolved'
        });
      }
    }
    if (geoCache.size > 0) console.log(`Loaded ${geoCache.size} geo-records from cache.`);
  } catch { /* ignore */ }
}

async function fetchRichGeoMetadata(ip: string): Promise<any> {
  if (geoCache.has(ip)) return geoCache.get(ip);
  
  // 1. Try ipwho.is
  try {
    const res = await axios.get(`https://ipwho.is/${ip}?fields=success,country,country_code,connection`, { timeout: 10000 });
    const payload = res.data as any;
    if (payload?.success) {
      const data = {
        country_code: payload.country_code || null,
        country_name: payload.country || null,
        asn: payload.connection?.asn ? `AS${payload.connection.asn}` : null,
        organization: payload.connection?.org || null,
        geo_status: 'resolved'
      };
      geoCache.set(ip, data);
      await new Promise(r => setTimeout(r, 1000));
      return data;
    }
  } catch { /* ignore */ }

  // 2. Try ip-api.com as fallback for ASN/ORG
  try {
    const res = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,org,as,isp`, { timeout: 10000 });
    const payload = res.data as any;
    if (payload?.status === "success") {
      const asnStr = payload.as ? payload.as.split(' ')[0] : null;
      const data = {
        country_code: payload.countryCode || null,
        country_name: payload.country || null,
        asn: asnStr,
        organization: payload.org || payload.isp || null,
        geo_status: 'resolved'
      };
      geoCache.set(ip, data);
      await new Promise(r => setTimeout(r, 1400));
      return data;
    }
  } catch { /* ignore */ }
  
  // 3. Fallback to local geoip-lite (no ASN/ORG)
  return getLocalGeoMetadata(ip);
}

/**
 * Tests a single proxy
 */
async function testProxy(proxyStr: string): Promise<ProxyRecord | null> {
  const normalized = normalizeProxy(proxyStr);
  let urlObj: URL;

  try {
    urlObj = new URL(normalized);
  } catch {
    return null;
  }

  const ip = urlObj.hostname.toLowerCase();
  const port = parseInt(urlObj.port) || 80;
  const protocol = urlObj.protocol.replace(':', '').toLowerCase();
  const id = `${protocol}://${ip}:${port}`;

  let agent;
  if (protocol.startsWith('socks')) {
    agent = new SocksProxyAgent(normalized);
  } else {
    agent = new HttpsProxyAgent(normalized);
  }

  const startTime = Date.now();
  let isValid = false;
  let isGoogle = false;
  let speedMs = 0;

  // Safety net: force-cancel after 15 seconds (slightly above TIMEOUT_MS * 2)
  const source = axios.CancelToken.source();
  const safetyTimer = setTimeout(() => {
    source.cancel('Hard timeout');
    try { agent.destroy(); } catch { }
  }, 15000);

  try {
    // Run both tests in parallel
    const [res, gRes] = await Promise.allSettled([
      axios.get(TEST_URL, createProxyRequestConfig(agent, source.token)),
      axios.get(GOOGLE_TEST_URL, createProxyRequestConfig(agent, source.token))
    ]);

    if (res.status === 'fulfilled' && res.value.status === 200) {
      isValid = true;
      speedMs = Date.now() - startTime;
    }

    if (gRes.status === 'fulfilled' && (gRes.value.status === 204 || gRes.value.status === 200)) {
      isGoogle = true;
    }

    if (!isValid) return null;
  } finally {
    clearTimeout(safetyTimer);
    try { agent.destroy(); } catch { }
  }

  const geoData = getLocalGeoMetadata(ip);

  return {
    id,
    ip,
    port,
    protocol,
    speed_ms: speedMs,
    is_valid: isValid,
    is_google: isGoogle,
    country_code: geoData.country_code ?? null,
    country_name: geoData.country_name ?? null,
    asn: null,
    organization: null,
    geo_status: 'resolved',
    checked_at: new Date().toISOString()
  };
}

async function runCycle() {
  const cycleStartTime = new Date().toISOString();
  console.log(`\n=== Starting FAST proxy check cycle at ${new Date().toLocaleString()} ===`);

  await seedGeoCacheFromSupabase();

  console.log("Downloading proxy lists...");
  const rawProxies = await downloadProxies();
  console.log(`Downloaded ${rawProxies.length} unique proxies.`);

  const limit = pLimit(CONCURRENCY);
  const geoLimit = pLimit(2);
  let checkedCount = 0;
  let validCount = 0;
  let googleCount = 0;

  console.log(`Starting proxy checks with concurrency: ${CONCURRENCY}`);

  const liveUploadBuffer: ProxyRecord[] = [];
  let uploadQueue = Promise.resolve();

  const uploadBatch = async (chunk: ProxyRecord[]) => {
    try {
      if (chunk.length === 0) return;
      const { error } = await supabase
        .from('proxies')
        .upsert(chunk, { onConflict: 'id' });

      if (error) console.error('Error upserting batch:', error.message);
    } catch (err) {
      console.error('Unexpected error during upsert:', err);
    }
  };

  const tasks = rawProxies.map(proxyStr => limit(async () => {
    try {
      const result = await testProxy(proxyStr);
      checkedCount++;

      if (result && result.is_valid) {
        // Enrich with rich geo data only for valid ones
        const richGeo = await geoLimit(() => fetchRichGeoMetadata(result.ip));
        const finalResult = { ...result, ...richGeo };

        validCount++;
        if (result.is_google) googleCount++;
        liveUploadBuffer.push(finalResult);
        
        if (liveUploadBuffer.length >= UPLOAD_BATCH_SIZE) {
          const chunk = liveUploadBuffer.splice(0, UPLOAD_BATCH_SIZE);
          uploadQueue = uploadQueue.then(() => uploadBatch(chunk));
        }
      }

      if (checkedCount % 500 === 0 || checkedCount === rawProxies.length) {
        console.log(`Progress: ${checkedCount}/${rawProxies.length} (Valid: ${validCount})`);
      }
    } catch {
      checkedCount++;
    }
  }));

  await Promise.all(tasks);

  // Flush remaining buffer
  if (liveUploadBuffer.length > 0) {
    uploadQueue = uploadQueue.then(() => uploadBatch(liveUploadBuffer));
  }
  await uploadQueue;

  console.log(`Cleanup: Removing old proxies...`);
  await supabase.from('proxies').delete().lt('checked_at', cycleStartTime);

  console.log("Saving cycle stats to proxy_history...");
  const { error: histError } = await supabase
    .from('proxy_history')
    .insert([{ total_valid: validCount, total_google: googleCount }]);

  if (histError) {
    console.error("Error saving proxy history:", histError);
  } else {
    console.log("History saved successfully.");
  }

  console.log(`Cycle complete. Total valid: ${validCount}`);
}

async function main() {
  if (!CONTINUOUS_MODE) {
    await runCycle();
    process.exit(0);
  }

  while (true) {
    try {
      await runCycle();
    } catch (err) {
      console.error('Error in cycle:', err);
    }
    console.log('\nWaiting 3 minutes...');
    await new Promise(resolve => setTimeout(resolve, 3 * 60 * 1000));
  }
}

// Ignore orphaned socket errors from aborted proxy connections
process.on('uncaughtException', (err: any) => {
  if (err?.code === 'ECONNRESET' || err?.message?.includes('socket disconnected')) {
    return;
  }
  console.error('Unhandled exception:', err);
});

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
