import type { Metadata } from "next";
import Link from "next/link";
import {
  Bot,
  Globe2,
  TerminalSquare,
  Search,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaqSection } from "@/components/site/faq-section";
import { siteConfig, absoluteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Use Cases — Proxy filtering for scraping, bots, and AI agents",
  description:
    "How developers use Proxcy: web scraping, automation, geo-restriction checks, AI agents, monitoring, and development workflows. Filter proxies by country, latency, and protocol via the raw API.",
  alternates: { canonical: "/use-cases" },
  openGraph: {
    title: "Use Cases — Proxcy",
    description:
      "Web scraping, automation, geo-restriction checks, AI agents, monitoring, and development workflows.",
    url: absoluteUrl("/use-cases"),
    type: "article",
  },
};

const useCases = [
  {
    icon: Search,
    slug: "web-scraping",
    title: "Web scraping",
    summary:
      "Rotate exit IPs to bypass per-IP rate limits while harvesting public data at scale.",
    details: [
      "Pull a country-specific batch from /api/raw and pipe it into your scraper.",
      "Filter by SOCKS5 for tools that prefer non-HTTP tunnels.",
      "Refresh the proxy pool every 3 minutes to swap out dead nodes.",
    ],
  },
  {
    icon: Bot,
    slug: "automation-and-bots",
    title: "Automation & bots",
    summary:
      "Distribute traffic across regions for headless workflows, schedulers, and scripted tasks.",
    details: [
      "Combine google=true with a country filter to get proxies that can reach Google services.",
      "Pin a single ASN by reading the dashboard table and copying the organization filter.",
      "Pair with a queue worker to recycle proxies automatically.",
    ],
  },
  {
    icon: TerminalSquare,
    slug: "development-and-testing",
    title: "Development & testing",
    summary:
      "Reproduce country-specific bugs, test rate limits, and verify geo-aware features.",
    details: [
      "Use protocol=http for plain HTTP proxies in local debugging tools.",
      "Switch country codes between requests to validate geo logic.",
      "Skip stale dumps by reading directly from the live raw endpoint.",
    ],
  },
  {
    icon: Globe2,
    slug: "geo-restriction-checks",
    title: "Geo-restriction checks",
    summary:
      "Verify how a page renders from each country code without spinning up dedicated VPNs.",
    details: [
      "Quickly enumerate countries with available proxies in the dashboard.",
      "Run synthetic checks from each region to detect regional content drift.",
      "Confirm GDPR / consent banners trigger only in the expected geographies.",
    ],
  },
  {
    icon: Bot,
    slug: "ai-agents",
    title: "AI agents",
    summary:
      "Give crawling agents a fresh proxy pool that matches their target region.",
    details: [
      "Rotate exit nodes per task to mimic different users.",
      "Filter by latency to keep agent reasoning loops responsive.",
      "Return a raw list directly to a tool-calling agent without JSON parsing.",
    ],
  },
  {
    icon: Activity,
    slug: "monitoring-and-verification",
    title: "Monitoring & verification",
    summary:
      "Probe public endpoints from multiple vantage points to detect outages and routing anomalies.",
    details: [
      "Run health checks through proxies in different countries.",
      "Detect ISP-level filtering by comparing reachability across ASNs.",
      "Combine with the /status page to correlate Proxcy-side issues.",
    ],
  },
  {
    icon: ShieldCheck,
    slug: "ad-and-content-verification",
    title: "Ad & content verification",
    summary:
      "Confirm campaigns, search results, and content variants render correctly per region.",
    details: [
      "Check which ads appear from each country without third-party services.",
      "Validate localized SEO metadata as it appears to regional crawlers.",
      "Audit pricing pages for unintended geo-discrimination.",
    ],
  },
];

const faqs = [
  {
    question: "Which use case should I start with?",
    answer:
      "If you are scraping public data, start with web scraping and the SOCKS5 filter. If you are testing localized features, start with geo-restriction checks and rotate country codes per request.",
  },
  {
    question: "Are these proxies suitable for production traffic?",
    answer:
      "Free proxies are best suited for ad-hoc scraping, testing, and verification. For sustained production traffic, combine Proxcy with a paid provider and use Proxcy as a reference set.",
  },
  {
    question: "How do I keep my proxy pool fresh?",
    answer:
      "Re-fetch /api/raw on a 60-second interval (matching the dashboard refresh) and replace any proxy that fails twice in a row.",
  },
];

export default function UseCasesPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Use Cases",
        item: absoluteUrl("/use-cases"),
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-[90vw] space-y-16 px-0 py-16">
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          Use cases
        </p>
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
          What people build with {siteConfig.name}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {siteConfig.name} powers proxy-driven workflows across scraping,
          automation, AI, and monitoring. Each scenario below maps to a concrete
          query against the raw API.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {useCases.map((uc) => (
          <article
            key={uc.slug}
            id={uc.slug}
            className="rounded-2xl border border-border/50 bg-card/60 p-6"
          >
            <uc.icon className="h-5 w-5 text-primary" />
            <h2 className="mt-3 text-lg font-semibold">{uc.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {uc.summary}
            </p>
            <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
              {uc.details.map((d) => (
                <li
                  key={d}
                  className="flex gap-2"
                >
                  <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <FaqSection
        id="use-cases-faq"
        title="Use case FAQ"
        faqs={faqs}
      />

      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center md:p-12">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          Pick a use case and try it
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Open the dashboard, apply a filter, and copy the matching API URL.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard">
            <Button size="lg">Open Dashboard</Button>
          </Link>
          <Link href="/api">
            <Button
              size="lg"
              variant="outline"
            >
              Read API spec
            </Button>
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </div>
  );
}
