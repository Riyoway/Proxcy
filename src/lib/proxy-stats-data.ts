import type { ProxyHistoryRecord, ProxyStatRecord } from "./proxy-fetcher";

export interface ProtocolDatum {
  name: string;
  count: number;
}

export interface CountryDatum {
  country: string;
  code: string | null;
  total: number;
  google: number;
}

export interface SpeedBucketDatum {
  label: string;
  range: string;
  count: number;
}

export interface TimeSeriesDatum {
  hour: string;
  count: number;
  google: number;
}

export interface GoogleAccessDatum {
  name: string;
  value: number;
}

export interface OrganizationDatum {
  organization: string;
  count: number;
}

export function groupByProtocol(records: ProxyStatRecord[]): ProtocolDatum[] {
  const map = new Map<string, number>();
  for (const record of records) {
    const key = record.protocol.toUpperCase();
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function groupByCountry(records: ProxyStatRecord[], limit = 10): CountryDatum[] {
  const map = new Map<string, CountryDatum>();
  for (const record of records) {
    const key = record.country_name ?? record.country_code ?? "Unknown";
    const existing = map.get(key);
    if (existing) {
      existing.total += 1;
      existing.google += record.is_google ? 1 : 0;
      if (!existing.code && record.country_code) {
        existing.code = record.country_code;
      }
    } else {
      map.set(key, {
        country: key,
        code: record.country_code,
        total: 1,
        google: record.is_google ? 1 : 0,
      });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function bucketBySpeed(records: ProxyStatRecord[]): SpeedBucketDatum[] {
  const buckets: SpeedBucketDatum[] = [
    { label: "<200ms", range: "0-200", count: 0 },
    { label: "200-500ms", range: "200-500", count: 0 },
    { label: "500ms-1s", range: "500-1000", count: 0 },
    { label: "1-2s", range: "1000-2000", count: 0 },
    { label: "2-5s", range: "2000-5000", count: 0 },
    { label: ">5s", range: "5000+", count: 0 },
  ];

  for (const record of records) {
    const speed = record.speed_ms;
    if (speed < 200) buckets[0].count += 1;
    else if (speed < 500) buckets[1].count += 1;
    else if (speed < 1000) buckets[2].count += 1;
    else if (speed < 2000) buckets[3].count += 1;
    else if (speed < 5000) buckets[4].count += 1;
    else buckets[5].count += 1;
  }
  return buckets;
}

export function groupByHour(records: ProxyStatRecord[], hours = 24): TimeSeriesDatum[] {
  const now = Date.now();
  const buckets = new Map<number, TimeSeriesDatum>();

  for (let i = hours - 1; i >= 0; i--) {
    const date = new Date(now - i * 60 * 60 * 1000);
    date.setMinutes(0, 0, 0);
    const key = date.getTime();
    const hourLabel = `${String(date.getHours()).padStart(2, "0")}:00`;
    buckets.set(key, { hour: hourLabel, count: 0, google: 0 });
  }

  const cutoff = now - hours * 60 * 60 * 1000;

  for (const record of records) {
    const ts = new Date(record.checked_at).getTime();
    if (ts < cutoff) continue;
    const bucketDate = new Date(ts);
    bucketDate.setMinutes(0, 0, 0);
    const bucket = buckets.get(bucketDate.getTime());
    if (bucket) {
      bucket.count += 1;
      if (record.is_google) bucket.google += 1;
    }
  }

  return Array.from(buckets.values());
}

export function aggregateHistoryByHour(records: ProxyHistoryRecord[], hours = 24): TimeSeriesDatum[] {
  const now = Date.now();
  const buckets = new Map<number, TimeSeriesDatum>();

  for (let i = hours - 1; i >= 0; i--) {
    const date = new Date(now - i * 60 * 60 * 1000);
    date.setMinutes(0, 0, 0);
    const key = date.getTime();
    const hourLabel = `${String(date.getHours()).padStart(2, "0")}:00`;
    buckets.set(key, { hour: hourLabel, count: 0, google: 0 });
  }

  const cutoff = now - hours * 60 * 60 * 1000;

  for (const record of records) {
    const ts = new Date(record.created_at).getTime();
    if (ts < cutoff) continue;
    const bucketDate = new Date(ts);
    bucketDate.setMinutes(0, 0, 0);
    const bucket = buckets.get(bucketDate.getTime());
    if (bucket) {
      bucket.count = Math.max(bucket.count, record.total_valid);
      bucket.google = Math.max(bucket.google, record.total_google);
    }
  }

  return Array.from(buckets.values());
}

export function computeGoogleAccess(records: ProxyStatRecord[]): GoogleAccessDatum[] {
  const accessible = records.filter((r) => r.is_google).length;
  const blocked = records.length - accessible;
  return [
    { name: "Accessible", value: accessible },
    { name: "Blocked", value: blocked },
  ];
}

export function groupByOrganization(records: ProxyStatRecord[], limit = 8): OrganizationDatum[] {
  const map = new Map<string, number>();
  for (const record of records) {
    const key = record.organization ?? "Unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([organization, count]) => ({ organization, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function computeAverageSpeed(records: ProxyStatRecord[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((acc, r) => acc + r.speed_ms, 0);
  return Math.round(total / records.length);
}

export function computeFastestProxy(records: ProxyStatRecord[]): ProxyStatRecord | null {
  if (records.length === 0) return null;
  return records.reduce((fastest, current) => (current.speed_ms < fastest.speed_ms ? current : fastest));
}
