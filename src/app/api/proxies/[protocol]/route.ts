import { REPO_RAW } from "@/lib/proxy-fetcher";

/**
 * Raw plain-text proxy lists per protocol. Just forwards the GitHub raw
 * `<protocol>.txt` files (one `ip:port` per line) with CORS enabled, so clients
 * that want a flat list instead of the /api/proxies JSON can consume them directly.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const FILES: Record<string, string> = {
  http: "http.txt",
  socks4: "socks4.txt",
  socks5: "socks5.txt",
  all: "all.txt",
};

export function generateStaticParams() {
  return Object.keys(FILES).map((protocol) => ({ protocol }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ protocol: string }> }) {
  const { protocol } = await params;
  const file = FILES[protocol.toLowerCase()];
  if (!file) {
    return new Response("Unknown protocol. Use http, socks4, socks5, or all.", { status: 404 });
  }
  try {
    const upstream = await fetch(`${REPO_RAW}/${file}`, { cache: "no-store" });
    if (!upstream.ok) {
      return new Response("Upstream data unavailable", { status: 502 });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response("Failed to reach upstream data", { status: 502 });
  }
}
