import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-config";
import { useCaseSlugs } from "@/lib/use-cases";

export const dynamic = "force-static";

const routes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "hourly", priority: 1.0 },
  { path: "/api", changeFrequency: "monthly", priority: 0.8 },
  { path: "/use-cases", changeFrequency: "monthly", priority: 0.8 },
  ...useCaseSlugs.map((slug) => ({
    path: `/use-cases/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  })),
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
