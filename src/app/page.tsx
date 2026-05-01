import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Cable,
  Globe2,
  Gauge,
  Code2,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FaqSection } from "@/components/site/faq-section";
import { HeroTerminal } from "@/components/site/hero-terminal";
import { ScrollReveal, StaggerContainer } from "@/components/site/scroll-reveal";
import { siteConfig, absoluteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `${siteConfig.name} — Proxy filtering API and live proxy list`,
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${siteConfig.name} — Proxy filtering API and live proxy list`,
    description: siteConfig.description,
    url: absoluteUrl("/"),
    type: "website",
  },
};

const features = [
  {
    icon: Cable,
    title: "Multi-protocol coverage",
    body: "HTTP, HTTPS, SOCKS4, and SOCKS5 in one stream. Filter by protocol with a single query parameter.",
  },
  {
    icon: Globe2,
    title: "Country & ASN filtering",
    body: "Drill down by ISO country code or organization. Geolocation is enriched per IP and cached for low-latency reads.",
  },
  {
    icon: Gauge,
    title: "Latency-tested proxies",
    body: "Every entry ships with a measured speed in milliseconds. Sort by latency and skip dead nodes.",
  },
  {
    icon: Code2,
    title: "Raw API, not JSON wrappers",
    body: "Endpoints return plain ip:port lines. Pipe directly into curl, requests, or any HTTP client without parsing overhead.",
  },
  {
    icon: Shield,
    title: "Google reachability flag",
    body: "Every proxy carries a Google-reachability flag. Filter google=true to surface only proxies that can reach the open web.",
  },
  {
    icon: Zap,
    title: "Live data, no stale dumps",
    body: "The list is refreshed continuously. The dashboard auto-refreshes every 60 seconds.",
  },
];

const useCasesPreview = [
  {
    title: "Web scraping",
    body: "Rotate IPs to bypass per-IP rate limits while harvesting public data.",
  },
  {
    title: "Automation & bots",
    body: "Distribute traffic across regions for headless workflows and scheduled jobs.",
  },
  {
    title: "Geo-restriction checks",
    body: "Verify how a page renders from each country code without spinning up VPNs.",
  },
  {
    title: "AI agents",
    body: "Give crawling agents a fresh proxy pool that matches their target region.",
  },
];

const faqs = [
  {
    question: "What is Proxcy?",
    answer:
      "Proxcy is a proxy filtering and listing platform with a real-time raw API. It exposes free HTTP, HTTPS, SOCKS4, and SOCKS5 proxies that have been verified for latency and Google reachability.",
  },
  {
    question: "Is Proxcy free to use?",
    answer:
      "Yes. The dashboard, statistics, and the raw API are all free. The list is generated from public sources and validated continuously.",
  },
  {
    question: "Why does the API return raw text instead of JSON?",
    answer:
      "Most proxy consumers (curl, requests, scrapers) want a flat ip:port stream. Returning raw lines avoids JSON parsing and keeps the response under a few kilobytes.",
  },
  {
    question: "How fresh is the data?",
    answer:
      "The proxy list is refreshed continuously, and the dashboard auto-refreshes every 60 seconds. Older entries are rotated out as fresh ones come in.",
  },
  {
    question: "Which filters does the API support?",
    answer:
      "country, protocol, and google. They can be combined as comma-separated values, e.g. /api/raw?protocol=socks5&country=us,jp&google=true.",
  },
  {
    question: "Can AI agents use Proxcy?",
    answer:
      "Yes. The raw endpoint is designed for programmatic consumers, including AI agents and headless browsers that need to rotate exit nodes.",
  },
];

const softwareApplicationLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  url: siteConfig.url,
  description: siteConfig.description,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Live proxy list",
    "HTTP / HTTPS / SOCKS4 / SOCKS5 filtering",
    "Country and ASN filtering",
    "Latency measurement",
    "Google reachability check",
    "Raw text API",
  ],
  publisher: { "@type": "Organization", name: siteConfig.name },
};

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-[90vw] space-y-20 px-0 py-16">
      <section
        aria-labelledby="hero-heading"
        className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12"
      >
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
            Proxy filtering platform
          </p>
          <h1
            id="hero-heading"
            className="text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl"
          >
            Filter live proxies by country, latency, and protocol.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {siteConfig.shortDescription} Query the raw API to retrieve a
            verified stream of HTTP, HTTPS, SOCKS4, and SOCKS5 proxies. Every
            entry is latency-tested and geo-tagged.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard">
              <Button size="lg">
                Open Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/api">
              <Button
                size="lg"
                variant="outline"
              >
                View API
              </Button>
            </Link>
            <Link href="/use-cases">
              <Button
                size="lg"
                variant="ghost"
              >
                Use cases
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroTerminal />
        </div>
      </section>

      <ScrollReveal direction="up" delay={100}>
        <section
          aria-labelledby="features-heading"
          className="space-y-8"
        >
          <div className="space-y-2">
            <h2
              id="features-heading"
              className="text-2xl font-bold tracking-tight md:text-3xl"
            >
              Why Proxcy
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Built for developers, scrapers, and AI agents that need a precise
              proxy filter rather than a static list.
            </p>
          </div>
          <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" staggerDelay={100}>
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-border/50 bg-card/60 transition-colors hover:border-border"
              >
                <CardContent className="space-y-3 p-5">
                  <feature.icon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </StaggerContainer>
        </section>
      </ScrollReveal>

      <ScrollReveal direction="up" delay={100}>
        <section
          aria-labelledby="usecases-heading"
          className="space-y-6"
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2
                id="usecases-heading"
                className="text-2xl font-bold tracking-tight md:text-3xl"
              >
                What teams build with Proxcy
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Common scenarios where filtered, fresh proxies matter.
              </p>
            </div>
            <Link
              href="/use-cases"
              className="text-xs font-medium text-primary hover:underline"
            >
              See all use cases →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {useCasesPreview.map((uc) => (
              <div
                key={uc.title}
                className="rounded-xl border border-border/50 bg-card/40 p-4"
              >
                <h3 className="text-sm font-semibold">{uc.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {uc.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal direction="up" delay={100}>
        <section
          aria-labelledby="performance-heading"
          className="rounded-2xl border border-border/50 bg-card/60 p-8 md:p-10"
        >
          <h2
            id="performance-heading"
            className="text-2xl font-bold tracking-tight md:text-3xl"
          >
            Performance you can pipe
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every entry in the list is latency-tested before it ships. The
            dashboard auto-refreshes on a fixed interval so you can rely on the
            data without polling logs.
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Latency-tested
              </dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight">100%</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Auto-refresh
              </dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight">60s</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Output
              </dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight">Raw text</dd>
            </div>
          </dl>
        </section>
      </ScrollReveal>

      <ScrollReveal direction="up" delay={100}>
        <FaqSection
          intro={`Quick answers about ${siteConfig.name}, the raw API, and how the data is collected.`}
          faqs={faqs}
        />
      </ScrollReveal>

      <ScrollReveal direction="up" delay={100}>
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center md:p-12">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Start filtering proxies in seconds
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            No signup. No JSON envelope. Just a raw, filtered proxy stream.
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
      </ScrollReveal>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationLd),
        }}
      />
    </div>
  );
}
