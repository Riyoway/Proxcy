import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface ProxyStatRecord {
  id: string;
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
  checked_at: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type WindowWithSupabase = Window & { __supabaseClient?: SupabaseClient };
type GlobalWithSupabase = typeof globalThis & { __supabaseClient?: SupabaseClient };

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  if (typeof window !== "undefined") {
    const clientStore = window as WindowWithSupabase;
    if (!clientStore.__supabaseClient) {
      clientStore.__supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    }
    return clientStore.__supabaseClient;
  }

  const clientStore = globalThis as GlobalWithSupabase;
  if (!clientStore.__supabaseClient) {
    clientStore.__supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return clientStore.__supabaseClient;
};

/**
 * Fetch all proxies using chunked pagination to bypass the 1000-row Supabase limit.
 * Deduplicates by ID to protect against concurrent writes during fetching.
 */
export async function fetchAllProxies(maxRows = 50000): Promise<ProxyStatRecord[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase environment variables are missing.");
  }

  const dedupMap = new Map<string, ProxyStatRecord>();
  const step = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("proxies")
      .select("id, ip, port, protocol, speed_ms, is_valid, is_google, country_code, country_name, asn, organization, checked_at")
      .order("checked_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + step - 1);

    if (error) throw error;

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    data.forEach((row) => dedupMap.set(row.id, row as ProxyStatRecord));

    if (data.length < step) {
      hasMore = false;
    } else {
      from += step;
    }

    if (dedupMap.size >= maxRows) break;
  }

  return Array.from(dedupMap.values());
}

export interface ProxyHistoryRecord {
  id: number;
  created_at: string;
  total_valid: number;
  total_google: number;
}

export async function fetchProxyHistory(hours = 12): Promise<ProxyHistoryRecord[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase environment variables are missing.");
  }

  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("proxy_history")
    .select("*")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

