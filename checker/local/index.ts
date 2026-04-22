import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { createClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';
import geoip from 'geoip-lite';
import { SOURCES } from './sources.js';
import { config } from 'dotenv';
import type { Agent as HttpAgent } from 'http';
import type { Agent as HttpsAgent } from 'https';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Constants
const TEST_URL = 'https://api.ipify.org';
const GOOGLE_TEST_URL = 'https://www.google.com/generate_204';
const TIMEOUT_MS = 3000;
const CONCURRENCY = 1000;
const UPLOAD_BATCH_SIZE = 20; // Lowered from 100 to update Web UI more frequently
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
};

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
    // country_name is not directly available in simple form in geoip-lite, 
    // but country code is usually sufficient. 
    // We can map common ones or leave as null/code.
    country_name: geo.country, 
    geo_status: 'resolved'
  };
}

function createProxyRequestConfig(agent: ProxyAgent): NodeAxiosConfig {
  return {
    httpAgent: agent,
    httpsAgent: agent,
    timeout: TIMEOUT_MS,
    validateStatus: () => true, // Don't throw on 4xx/5xx for speed
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
 * Downloads proxy lists from all sources and returns unique strings
 */
async function downloadProxies(): Promise<string[]> {
  const proxySet = new Set<string>();
  const seenIps = new Set<string>();
  const limit = pLimit(15); // Slightly higher concurrency for downloading

  const tasks = SOURCES.map((url: string) => limit(async () => {
    try {
      const response = await axios.get(url, { timeout: 15000 });
      const text = response.data;
      if (typeof text === 'string') {
        const lines = text.split(/\r?\n/);
        for (let line of lines) {
          line = line.trim();
          if (line) {
            const normalized = normalizeProxy(line);
            try {
              const url = new URL(normalized);
              const ip = url.hostname.toLowerCase();
              if (!seenIps.has(ip)) {
                seenIps.add(ip);
                proxySet.add(normalized);
              }
            } catch {
              // Ignore invalid lines
            }
          }
        }
      }
    } catch {
      // console.warn(`Failed to fetch from ${url}`);
    }
  }));

  await Promise.all(tasks);
  return shuffleArray(Array.from(proxySet));
}

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
  
  try {
    const res = await axios.get(`https://ipwho.is/${ip}?fields=success,country,country_code,connection`, { timeout: 10000 });
    const payload = res.data;
    if (payload?.success) {
      const data = {
        country_code: payload.country_code || null,
        country_name: payload.country || null,
        asn: payload.connection?.asn ? `AS${payload.connection.asn}` : null,
        organization: payload.connection?.org || null,
        geo_status: 'resolved'
      };
      geoCache.set(ip, data);
      // Wait a bit to respect rate limits
      await new Promise(r => setTimeout(r, 1000));
      return data;
    }
  } catch { /* ignore */ }
  
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

  try {
    // Run both tests in parallel to save time
    const [res, gRes] = await Promise.allSettled([
      axios.get(TEST_URL, createProxyRequestConfig(agent)),
      axios.get(GOOGLE_TEST_URL, createProxyRequestConfig(agent))
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
    agent.destroy();
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
  const geoLimit = pLimit(2); // Low concurrency for rich geo data API
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

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
