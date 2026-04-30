import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

/**
 * Allow major search and AI crawlers explicitly so Proxcy is citation-ready
 * for ChatGPT, Perplexity, Google AI Overview, Bing Copilot, and Claude.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/raw", "/api/download/"],
      },
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "Bingbot", allow: "/" },
      { userAgent: "DuckDuckBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "Applebot", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
