/**
 * Centralized site-wide constants for SEO, GEO, OG, JSON-LD, and PWA.
 * Override the production URL via NEXT_PUBLIC_SITE_URL when deploying to a different domain.
 */

const DEFAULT_URL = "https://proxcy.riyo.me";

export const siteConfig = {
  name: "Proxcy",
  legalName: "Proxcy",
  operator: "Riyo",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_URL,
  shortDescription:
    "Proxcy is a real-time proxy filtering dashboard.",
  description:
    "Proxcy is a free proxy filtering dashboard. Filter live HTTP, SOCKS4, and SOCKS5 proxies by country, latency, protocol, and Google reachability.",
  keywords: [
    "proxy list",
    "proxy filtering dashboard",
    "free proxy",
    "fast proxy checker",
    "socks5 proxy list",
    "live proxy list",
    "geo filter proxy",
  ],
  locale: "en_US",
  language: "en",
  themeColor: "#0a0a0a",
  backgroundColor: "#0a0a0a",
  twitter: {
    handle: "@riyo_dev",
    site: "@riyo_dev",
  },
  social: {
    github: "https://github.com/Riyoway",
    repo: "https://github.com/Riyoway/proxies",
    code: "https://github.com/Riyoway/Proxcy",
    website: "https://riyo.me",
  },
} as const;

export type SiteConfig = typeof siteConfig;

export const absoluteUrl = (path: string = "/"): string => {
  const base = siteConfig.url.replace(/\/$/, "");
  if (!path.startsWith("/")) return `${base}/${path}`;
  return `${base}${path}`;
};
