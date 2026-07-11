import { REPO_RAW } from "@/lib/proxy-fetcher";

/**
 * Same-origin proxy for the public proxy dataset. It just forwards the GitHub
 * raw `data.json` so the dashboard (and any third-party client) hits one stable,
 * CORS-enabled endpoint instead of the source repo directly.
 */
export const revalidate = 60;

export async function GET() {
  try {
    const upstream = await fetch(`${REPO_RAW}/data.json`, { next: { revalidate: 60 } });
    if (!upstream.ok) {
      return Response.json({ error: "Upstream data unavailable" }, { status: 502 });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return Response.json({ error: "Failed to reach upstream data" }, { status: 502 });
  }
}
