import { REPO_RAW } from "@/lib/proxy-fetcher";

/**
 * Same-origin proxy for the public proxy dataset. It just forwards the GitHub
 * raw `data.json` so the dashboard (and any third-party client) hits one stable,
 * CORS-enabled endpoint instead of the source repo directly.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const upstream = await fetch(`${REPO_RAW}/data.json`, { cache: "no-store" });
    if (!upstream.ok) {
      return Response.json({ error: "Upstream data unavailable" }, { status: 502 });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return Response.json({ error: "Failed to reach upstream data" }, { status: 502 });
  }
}
