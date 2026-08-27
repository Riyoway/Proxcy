import { REPO_RAW } from "@/lib/proxy-fetcher";

/**
 * Compatibility endpoints for the old same-origin raw lists.
 * Redirect the large response to GitHub Raw instead of relaying it through Vercel.
 */
export const revalidate = 3600;

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
  return new Response("Redirecting to the GitHub Raw dataset.", {
    status: 307,
    headers: {
      Location: `${REPO_RAW}/${file}`,
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      "CDN-Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Vercel-CDN-Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
