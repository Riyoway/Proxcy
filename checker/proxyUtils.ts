/**
 * Pure utilities for proxy strings (no I/O).
 */

/**
 * Check if an IP is a valid public IP (not private/reserved/bogon).
 */
export function isPublicIp(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10) return false; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12
  if (a === 192 && b === 168) return false; // 192.168.0.0/16
  if (a === 127) return false; // loopback
  if (a === 169 && b === 254) return false; // link-local
  if (a === 0) return false; // 0.0.0.0/8
  if (a >= 224) return false; // multicast/reserved
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  return true;
}

/**
 * Normalize a proxy string to `protocol://ip:port` format.
 */
export function normalizeProxy(proxyStr: string): string {
  let normalized = proxyStr.trim();
  if (!normalized.includes("://")) {
    normalized = "http://" + normalized;
  }
  try {
    const url = new URL(normalized);
    const port = url.port ? `:${url.port}` : "";
    return `${url.protocol.toLowerCase()}//${url.hostname.toLowerCase()}${port}`;
  } catch {
    return normalized;
  }
}

/**
 * Fisher-Yates shuffle (immutable).
 */
export function shuffleArray<T>(array: T[]): T[] {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Extract IP:PORT patterns from text and add to dedupe sets.
 * Dedupes by IP (keeps only first occurrence per unique IP).
 */
export function extractProxies(
  text: string,
  proxySet: Set<string>,
  seenIps: Set<string>,
): void {
  const proxyRegex =
    /(?:(?:https?|socks[45]):\/\/)?\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}/gi;
  const matches = text.match(proxyRegex);
  if (!matches) return;

  for (const match of matches) {
    const normalized = normalizeProxy(match);
    try {
      const u = new URL(normalized);
      const ip = u.hostname;
      const port = parseInt(u.port);
      if (!isPublicIp(ip)) continue;
      if (port < 1 || port > 65535) continue;
      if (seenIps.has(ip)) continue;
      seenIps.add(ip);
      proxySet.add(normalized);
    } catch {
      // skip
    }
  }
}
