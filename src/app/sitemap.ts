import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-config";

const routes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/dashboard", changeFrequency: "hourly", priority: 0.9 },
  { path: "/api", changeFrequency: "monthly", priority: 0.8 },
  { path: "/use-cases", changeFrequency: "monthly", priority: 0.8 },
  { path: "/stats", changeFrequency: "hourly", priority: 0.7 },
  { path: "/status", changeFrequency: "hourly", priority: 0.6 },
  { path: "/docs", changeFrequency: "monthly", priority: 0.6 },
  { path: "/about", changeFrequency: "yearly", priority: 0.5 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.4 },
  { path: "/legal/terms", changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/disclaimer", changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/cookies", changeFrequency: "yearly", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }));
}
