import { REPO_RAW } from "@/lib/proxy-fetcher";

/**
 * Compatibility endpoint for clients that still use the old same-origin URL.
 * Keep the large dataset off Vercel; GitHub Raw serves the response instead.
 */
export const revalidate = 3600;

export async function GET() {
  return new Response("Redirecting to the GitHub Raw dataset.", {
    status: 307,
    headers: {
      Location: `${REPO_RAW}/data.json`,
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      "CDN-Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Vercel-CDN-Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
