import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name}`,
    short_name: siteConfig.name,
    description: siteConfig.description,

    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",

    background_color: siteConfig.backgroundColor,
    theme_color: siteConfig.themeColor,

    categories: ["developer", "productivity", "utilities"],
    lang: siteConfig.language,

    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],

    shortcuts: [
      {
        name: "Open Dashboard",
        short_name: "Dashboard",
        url: "/",
      },
    ],
  };
}
