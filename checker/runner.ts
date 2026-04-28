import pLimit from "p-limit";
import {
  CONCURRENCY,
  GEO_LOOKUP_CONCURRENCY,
  PER_PROXY_HARD_LIMIT_MS,
  UPLOAD_BATCH_SIZE,
} from "./config.js";
import { downloadProxies } from "./fetcher.js";
import { fetchRichGeoMetadata, seedGeoCacheFromSupabase } from "./geo.js";
import { testProxy } from "./tester.js";
import {
  getProxyCount,
  saveCycleHistory,
  uploadBatch,
} from "./uploader.js";
import type { ProxyRecord } from "./types.js";

/**
 * Race a promise against an absolute timeout.
 * Returns null if the promise didn't settle in time.
 * This is the safety net that prevents the "stuck at the end" hang.
 */
function withHardTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

/**
 * Run a single check cycle:
 *  1. Download fresh proxy list
 *  2. Test each proxy concurrently
 *  3. Enrich valid ones with geo data
 *  4. Upload in batches (rolling FIFO from cycle 2+; insert-only on first cycle)
 */
export async function runCycle(): Promise<void> {
  const cycleStartTime = new Date().toISOString();
  console.log(`\n=== Cycle started at ${cycleStartTime} ===`);

  console.log("Seeding geo cache from Supabase...");
  await seedGeoCacheFromSupabase();

  // First cycle = empty DB. Subsequent cycles use rolling FIFO delete.
  const initialRowCount = await getProxyCount();
  const isFirstCycle = initialRowCount === 0;
  console.log(
    `Initial DB rows: ${initialRowCount} (${isFirstCycle ? "FIRST cycle: insert-only" : "rolling: delete oldest N before insert"})`,
  );

  console.log("Downloading proxy lists...");
  const rawProxies = await downloadProxies();
  console.log(`Total unique proxies: ${rawProxies.length}`);

  const limit = pLimit(CONCURRENCY);
  const geoLimit = pLimit(GEO_LOOKUP_CONCURRENCY);

  let checkedCount = 0;
  let validCount = 0;
  let googleCount = 0;

  const liveBuffer: ProxyRecord[] = [];
  let uploadQueue: Promise<void> = Promise.resolve();

  const flushIfFull = () => {
    if (liveBuffer.length >= UPLOAD_BATCH_SIZE) {
      const chunk = liveBuffer.splice(0, UPLOAD_BATCH_SIZE);
      uploadQueue = uploadQueue.then(() => uploadBatch(chunk, !isFirstCycle));
    }
  };

  const tasks = rawProxies.map((proxyStr) =>
    limit(async () => {
      // Hard upper bound: prevents any single proxy from hanging the entire cycle
      const result = await withHardTimeout(
        testProxy(proxyStr),
        PER_PROXY_HARD_LIMIT_MS,
      );

      checkedCount++;

      if (result?.is_valid) {
        const richGeo = await geoLimit(() => fetchRichGeoMetadata(result.ip));
        const finalRecord: ProxyRecord = { ...result, ...richGeo };

        validCount++;
        if (result.is_google) googleCount++;
        liveBuffer.push(finalRecord);
        flushIfFull();
      }

      if (
        checkedCount % 500 === 0 ||
        checkedCount === rawProxies.length
      ) {
        console.log(
          `Progress: ${checkedCount}/${rawProxies.length} (Valid: ${validCount}, Google: ${googleCount})`,
        );
      }
    }),
  );

  await Promise.all(tasks);

  // Flush remaining buffer
  if (liveBuffer.length > 0) {
    const tail = liveBuffer.splice(0);
    uploadQueue = uploadQueue.then(() => uploadBatch(tail, !isFirstCycle));
  }
  await uploadQueue;

  console.log("Saving cycle stats...");
  await saveCycleHistory(validCount, googleCount);

  console.log(
    `Cycle complete. Valid: ${validCount}, Google OK: ${googleCount}`,
  );
}
