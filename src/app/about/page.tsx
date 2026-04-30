import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig, absoluteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About — A free proxy filtering platform",
  description: `${siteConfig.name} is a free proxy filtering and listing platform operated by ${siteConfig.operator}. Designed for developers, scrapers, and AI agents that need a precise proxy filter rather than a static list.`,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About ${siteConfig.name}`,
    description: `${siteConfig.name} is a free proxy filtering and listing platform.`,
    url: absoluteUrl("/about"),
    type: "article",
  },
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-[90vw] space-y-12 px-0 py-16">
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          About
        </p>
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          A free proxy filtering platform
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          {siteConfig.name} is a free proxy filtering and listing platform with
          a real-time raw API. It is designed for developers, scrapers, and AI
          agents that need a precise proxy filter rather than a static list.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">Concept</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Most public proxy lists are stale, unfiltered, or wrapped in JSON
          envelopes. {siteConfig.name} flips that around: continuously
          validated proxies, exposed as raw text, queryable by country,
          protocol, and Google reachability.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">Operator</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {siteConfig.name} is operated by {siteConfig.operator} as a free,
          ad-free service. The platform is intentionally minimal: a dashboard,
          a raw API, and the data behind them.
        </p>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/contact">
          <Button size="default">Contact</Button>
        </Link>
        <Link href="/dashboard">
          <Button
            size="default"
            variant="outline"
          >
            Open Dashboard
          </Button>
        </Link>
      </section>
    </div>
  );
}
