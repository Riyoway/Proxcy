import axios from "axios";
import pLimit from "p-limit";
import { SOURCES } from "./sources.js";
import { scrapeAllProxies } from "./scraper/index.js";
import {
  SOURCE_FETCH_CONCURRENCY,
  SOURCE_FETCH_TIMEOUT_MS,
} from "./config.js";
import {
  extractProxies,
  isPublicIp,
  normalizeProxy,
  shuffleArray,
} from "./proxyUtils.js";

/**
 * Download proxies from text sources + custom scrapers.
 * Dedupes by IP, returns shuffled list.
 */
export async function downloadProxies(): Promise<string[]> {
  const proxySet = new Set<string>();
  const seenIps = new Set<string>();
  const limit = pLimit(SOURCE_FETCH_CONCURRENCY);

  const tasks = SOURCES.map((url: string) =>
    limit(async () => {
      try {
        const response = await axios.get(url, {
          timeout: SOURCE_FETCH_TIMEOUT_MS,
        });
        const data = response.data;
        const text = typeof data === "string" ? data : JSON.stringify(data);
        extractProxies(text, proxySet, seenIps);
      } catch {
        // ignore failed sources
      }
    }),
  );

  await Promise.all(tasks);

  // Custom scrapers (HTML parsers etc.)
  try {
    const scraped = await scrapeAllProxies();
    for (const proxy of scraped) {
      const normalized = normalizeProxy(proxy);
      try {
        const u = new URL(normalized);
        const ip = u.hostname;
        if (isPublicIp(ip) && !seenIps.has(ip)) {
          seenIps.add(ip);
          proxySet.add(normalized);
        }
      } catch {
        // skip
      }
    }
  } catch (err) {
    console.error("Error during custom scraping:", err);
  }

  return shuffleArray(Array.from(proxySet));
}
