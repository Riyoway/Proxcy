import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./config.js";
import type { ProxyRecord } from "./types.js";

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

/**
 * Get current row count of the proxies table.
 * Used to detect "first cycle" (empty DB) vs subsequent cycles.
 */
export async function getProxyCount(): Promise<number> {
  const { count, error } = await supabase
    .from("proxies")
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error("Error counting proxies:", error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Delete the oldest N rows by `checked_at` ascending.
 * Postgrest doesn't support LIMIT on delete, so we select IDs first.
 */
async function deleteOldestN(n: number): Promise<void> {
  if (n <= 0) return;
  const { data, error: selectErr } = await supabase
    .from("proxies")
    .select("id")
    .order("checked_at", { ascending: true })
    .limit(n);
  if (selectErr || !data || data.length === 0) return;
  const ids = data.map((r) => r.id);
  const { error: delErr } = await supabase
    .from("proxies")
    .delete()
    .in("id", ids);
  if (delErr) console.error("Error deleting oldest rows:", delErr.message);
}

/**
 * Upsert a batch of proxies (deduped by id).
 * If `rolling` is true, deletes the oldest N rows before insert
 * to keep DB size roughly stable (FIFO window).
 */
export async function uploadBatch(
  chunk: ProxyRecord[],
  rolling = false,
): Promise<void> {
  if (chunk.length === 0) return;
  const unique = Array.from(
    new Map(chunk.map((item) => [item.id, item])).values(),
  );

  if (rolling) {
    await deleteOldestN(unique.length);
  }

  try {
    const { error } = await supabase
      .from("proxies")
      .upsert(unique, { onConflict: "id" });
    if (error) {
      console.error("Error upserting batch:", error.message);
    }
  } catch (err) {
    console.error("Unexpected error during upsert:", err);
  }
}

/**
 * Save cycle stats to proxy_history.
 */
export async function saveCycleHistory(
  totalValid: number,
  totalGoogle: number,
): Promise<void> {
  const { error } = await supabase
    .from("proxy_history")
    .insert([{ total_valid: totalValid, total_google: totalGoogle }]);
  if (error) {
    console.error("Error saving proxy history:", error.message);
  } else {
    console.log("History saved successfully.");
  }
}
