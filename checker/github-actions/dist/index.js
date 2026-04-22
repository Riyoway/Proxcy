import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { createClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';
import { SOURCES } from './sources.js';
import { config } from 'dotenv';
// Load environment variables from .env.local
config({ path: '.env.local' });
// Constants
const TEST_URL = 'https://api.ipify.org';
const GOOGLE_TEST_URL = 'https://www.google.com/generate_204';
const TIMEOUT_MS = 5000;
const CONCURRENCY = 300; // Lowered from 500 to prevent port/memory exhaustion
const GEO_LOOKUP_URL = 'https://ipwho.is';
const GEO_LOOKUP_DELAY_MS = 1100;
const GEO_LOOKUP_TIMEOUT_MS = 10000;
const GEO_LOOKUP_FIELDS = 'success,country,country_code,connection';
const UPLOAD_BATCH_SIZE = 50;
const CONTINUOUS_MODE = process.env.CHECKER_CONTINUOUS === 'true';
// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) environment variables.');
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);
const geoCache = new Map();
function emptyGeoMetadata() {
    return {
        country_code: null,
        country_name: null,
        asn: null,
        organization: null,
        geo_status: 'unavailable',
    };
}
function parseAsn(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return `AS${value}`;
    }
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    const [firstToken] = trimmed.split(/\s+/);
    return firstToken?.startsWith('AS') ? firstToken : trimmed;
}
function toGeoMetadata(record) {
    return {
        country_code: record.country_code,
        country_name: record.country_name,
        asn: record.asn,
        organization: record.organization,
        geo_status: record.geo_status === 'resolved' ? 'resolved' : 'unavailable',
    };
}
function applyCachedGeoMetadata(record) {
    const cachedMetadata = geoCache.get(record.ip);
    if (!cachedMetadata) {
        return record;
    }
    return {
        ...record,
        ...cachedMetadata,
    };
}
async function seedGeoCacheFromSupabase() {
    try {
        const { data, error } = await supabase
            .from('proxies')
            .select('ip,country_code,country_name,asn,organization,geo_status');
        if (error) {
            console.warn('Unable to preload geo cache from Supabase:', error.message);
            return;
        }
        let restoredCount = 0;
        for (const row of data ?? []) {
            if (!row?.ip || typeof row.ip !== 'string' || geoCache.has(row.ip)) {
                continue;
            }
            if (row.geo_status !== 'resolved') {
                continue;
            }
            geoCache.set(row.ip, toGeoMetadata(row));
            restoredCount++;
        }
        if (restoredCount > 0) {
            console.log(`Reused cached geo data for ${restoredCount} IPs from Supabase.`);
        }
    }
    catch (error) {
        console.warn('Unexpected error while preloading geo cache from Supabase:', error);
    }
}
async function wait(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
}
function createProxyRequestConfig(agent) {
    return {
        httpAgent: agent,
        httpsAgent: agent,
        timeout: TIMEOUT_MS,
    };
}
function isAxiosLikeError(error) {
    return typeof error === 'object' && error !== null && ('message' in error || 'response' in error);
}
function hasGeoLookupData(payload) {
    if (!payload) {
        return false;
    }
    return typeof payload.country === 'string'
        || typeof payload.country_code === 'string'
        || typeof payload.connection?.asn === 'number'
        || typeof payload.connection?.asn === 'string'
        || typeof payload.connection?.org === 'string';
}
async function fetchGeoMetadata(ip) {
    try {
        const response = await axios.get(`${GEO_LOOKUP_URL}/${ip}`, {
            params: {
                fields: GEO_LOOKUP_FIELDS,
            },
            timeout: GEO_LOOKUP_TIMEOUT_MS,
        });
        const payload = response.data;
        if (payload?.success === false) {
            return {
                status: 'not_found',
                message: payload?.message ?? 'Geo lookup returned success=false',
            };
        }
        if (!hasGeoLookupData(payload)) {
            return {
                status: 'not_found',
                message: payload?.message ?? 'Geo lookup returned no usable metadata',
            };
        }
        return {
            status: 'success',
            metadata: {
                country_code: typeof payload.country_code === 'string' ? payload.country_code : null,
                country_name: typeof payload.country === 'string' ? payload.country : null,
                asn: parseAsn(payload.connection?.asn),
                organization: typeof payload.connection?.org === 'string' && payload.connection.org.trim()
                    ? payload.connection.org
                    : null,
            },
        };
    }
    catch (error) {
        if (isAxiosLikeError(error)) {
            const retryAfterHeader = error.response?.headers?.['retry-after'];
            const retryAfterSeconds = Number(retryAfterHeader);
            const message = error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data
                ? String(error.response.data.message)
                : (typeof error.message === 'string' ? error.message : 'Unknown axios error');
            return {
                status: 'retryable_error',
                message,
                retryAfterMs: Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
                    ? retryAfterSeconds * 1000
                    : undefined,
            };
        }
        return {
            status: 'retryable_error',
            message: error instanceof Error ? error.message : 'Unknown geo lookup error',
        };
    }
}
async function enrichProxyMetadata(records) {
    const missingIps = Array.from(new Set(records.map(record => record.ip))).filter(ip => !geoCache.has(ip));
    let unavailableCount = 0;
    let retryFailureCount = 0;
    if (missingIps.length > 0) {
        console.log(`Enriching ${missingIps.length} IPs with geo metadata...`);
    }
    for (const ip of missingIps) {
        const firstAttempt = await fetchGeoMetadata(ip);
        if (firstAttempt.status === 'success') {
            geoCache.set(ip, {
                ...(firstAttempt.metadata ?? emptyGeoMetadata()),
                geo_status: 'resolved',
            });
        }
        else if (firstAttempt.status === 'not_found') {
            unavailableCount++;
            geoCache.set(ip, emptyGeoMetadata());
        }
        else {
            const retryDelay = firstAttempt.retryAfterMs ?? GEO_LOOKUP_DELAY_MS * 2;
            console.warn(`Geo metadata lookup failed for ${ip}: ${firstAttempt.message ?? 'Unknown error'}. Retrying in ${retryDelay}ms.`);
            await wait(retryDelay);
            const secondAttempt = await fetchGeoMetadata(ip);
            if (secondAttempt.status === 'success') {
                geoCache.set(ip, {
                    ...(secondAttempt.metadata ?? emptyGeoMetadata()),
                    geo_status: 'resolved',
                });
            }
            else if (secondAttempt.status === 'not_found') {
                unavailableCount++;
                geoCache.set(ip, emptyGeoMetadata());
            }
            else {
                retryFailureCount++;
                console.warn(`Geo metadata lookup skipped for ${ip} after retry failure: ${secondAttempt.message ?? 'Unknown error'}`);
                geoCache.set(ip, emptyGeoMetadata());
            }
        }
        await wait(GEO_LOOKUP_DELAY_MS);
    }
    if (unavailableCount > 0) {
        console.log(`Geo metadata unavailable for ${unavailableCount} IPs.`);
    }
    if (retryFailureCount > 0) {
        console.log(`Geo metadata skipped for ${retryFailureCount} IPs after retry failures.`);
    }
    return records.map(record => ({
        ...record,
        ...(geoCache.get(record.ip) ?? {}),
    }));
}
/**
 * Downloads proxy lists from all sources and returns unique strings
 */
async function downloadProxies() {
    const proxySet = new Set();
    const limit = pLimit(10); // Fetch up to 10 sources concurrently
    const tasks = SOURCES.map((url) => limit(async () => {
        try {
            const response = await axios.get(url, { timeout: 10000 });
            const text = response.data;
            if (typeof text === 'string') {
                const lines = text.split(/\r?\n/);
                for (let line of lines) {
                    line = line.trim();
                    if (line)
                        proxySet.add(line);
                }
            }
        }
        catch {
            console.warn(`Failed to fetch from ${url}`);
        }
    }));
    await Promise.all(tasks);
    return Array.from(proxySet);
}
function normalizeProxy(proxyStr) {
    if (!proxyStr.includes("://")) {
        return "http://" + proxyStr;
    }
    return proxyStr;
}
/**
 * Tests a single proxy
 */
async function testProxy(proxyStr) {
    const normalized = normalizeProxy(proxyStr);
    let urlObj;
    try {
        urlObj = new URL(normalized);
    }
    catch {
        return null;
    }
    const ip = urlObj.hostname;
    const port = parseInt(urlObj.port) || 80;
    const protocol = urlObj.protocol.replace(':', '');
    const id = `${ip}:${port}`;
    let agent;
    if (protocol.startsWith('socks')) {
        agent = new SocksProxyAgent(normalized);
    }
    else {
        // for http/https proxies
        agent = new HttpsProxyAgent(normalized);
    }
    const startTime = Date.now();
    let isValid = false;
    let isGoogle = false;
    let speedMs = 0;
    try {
        try {
            const res = await axios.get(TEST_URL, createProxyRequestConfig(agent));
            if (res.status === 200) {
                isValid = true;
                speedMs = Date.now() - startTime;
            }
        }
        catch {
            return null; // Immediately return null if the first check fails
        }
        // Only check google if the first test passed
        if (isValid) {
            try {
                const gRes = await axios.get(GOOGLE_TEST_URL, createProxyRequestConfig(agent));
                if (gRes.status === 204) {
                    isGoogle = true;
                }
            }
            catch {
                // Ignore google fail
            }
        }
    }
    finally {
        agent.destroy();
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
        geo_status: 'resolving',
        checked_at: new Date().toISOString()
    };
}
async function runCycle() {
    const cycleStartTime = new Date().toISOString();
    console.log(`\n=== Starting new proxy check cycle at ${new Date().toLocaleString()} ===`);
    await seedGeoCacheFromSupabase();
    console.log("Downloading proxy lists...");
    const rawProxies = await downloadProxies();
    console.log(`Downloaded ${rawProxies.length} unique proxies.`);
    const limit = pLimit(CONCURRENCY);
    let checkedCount = 0;
    let validCount = 0;
    console.log(`Starting proxy checks with concurrency: ${CONCURRENCY}`);
    const validProxies = new Map();
    const liveUploadBuffer = [];
    let uploadQueue = Promise.resolve();
    const uploadBatch = async (chunk, phase) => {
        try {
            const uniqueChunk = Array.from(new Map(chunk.map(item => [item.id, item])).values());
            if (uniqueChunk.length === 0) {
                return;
            }
            const { error } = await supabase
                .from('proxies')
                .upsert(uniqueChunk, { onConflict: 'id' });
            if (error) {
                console.error(`Error upserting ${phase} batch to Supabase:`, error);
            }
        }
        catch (err) {
            console.error(`Unexpected error upserting ${phase} batch:`, err);
        }
    };
    const queueUpload = (chunk, phase) => {
        if (chunk.length === 0) {
            return;
        }
        uploadQueue = uploadQueue.then(() => uploadBatch(chunk, phase));
    };
    const flushLiveUploadBuffer = (force = false) => {
        if (!force && liveUploadBuffer.length < UPLOAD_BATCH_SIZE) {
            return;
        }
        const chunk = liveUploadBuffer.splice(0, liveUploadBuffer.length);
        queueUpload(chunk, 'live');
    };
    const withTimeout = (promise, ms) => {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Hard timeout')), ms);
        });
        return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
    };
    const tasks = rawProxies.map(proxyStr => limit(async () => {
        let result = null;
        try {
            result = await withTimeout(testProxy(proxyStr), TIMEOUT_MS * 2);
        }
        catch {
            // Ignored
        }
        checkedCount++;
        if (checkedCount % 1000 === 0 || checkedCount === rawProxies.length) {
            console.log(`Checked ${checkedCount}/${rawProxies.length} ... Found valid: ${validCount}`);
        }
        if (result && result.is_valid) {
            const liveRecord = applyCachedGeoMetadata(result);
            validProxies.set(liveRecord.id, liveRecord);
            validCount = validProxies.size;
            liveUploadBuffer.push(liveRecord);
            flushLiveUploadBuffer();
        }
    }));
    await Promise.all(tasks);
    flushLiveUploadBuffer(true);
    await uploadQueue;
    const uniqueValidProxies = Array.from(validProxies.values());
    console.log(`Initial upload complete. Uploaded ${uniqueValidProxies.length} unique valid proxies to Supabase before geo enrichment.`);
    console.log("Cleaning up old proxies that didn't pass this check...");
    const { error: delError } = await supabase
        .from('proxies')
        .delete()
        .lt('checked_at', cycleStartTime);
    if (delError) {
        console.error("Error deleting old proxies:", delError);
    }
    else {
        console.log("Cleanup complete. Removed invalid/dead proxies successfully.");
    }
    const enrichedValidProxies = await enrichProxyMetadata(uniqueValidProxies);
    for (let index = 0; index < enrichedValidProxies.length; index += UPLOAD_BATCH_SIZE) {
        await uploadBatch(enrichedValidProxies.slice(index, index + UPLOAD_BATCH_SIZE), 'geo');
    }
    console.log(`Geo enrichment upload complete. Total unique valid proxies found: ${enrichedValidProxies.length}`);
}
async function main() {
    if (!CONTINUOUS_MODE) {
        await runCycle();
        process.exit(0);
    }
    while (true) {
        try {
            await runCycle();
        }
        catch (err) {
            console.error('Error during check cycle:', err);
        }
        console.log('\nWaiting 3 minutes before starting the next cycle...');
        await new Promise(resolve => setTimeout(resolve, 3 * 60 * 1000));
    }
}
main().catch(err => {
    console.error("Fatal error in checker:", err);
    process.exit(1);
});
