import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig, absoluteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Docs — How Proxcy works",
  description:
    "Lightweight Proxcy documentation. Learn what the proxy list contains, how to filter it, and how to consume the raw API.",
  alternates: { canonical: "/docs" },
  openGraph: {
    title: "Proxcy Docs",
    description: "What Proxcy provides and how to use the raw API.",
    url: absoluteUrl("/docs"),
    type: "article",
  },
};

const sections = [
  {
    title: "What the list contains",
    body: "Each entry is a public HTTP, HTTPS, SOCKS4, or SOCKS5 proxy with a measured latency, a country code, an organization (ASN), and a Google-reachability flag. Dead and unreachable entries are removed.",
  },
  {
    title: "Filters",
    body: "Combine protocol, country, and google through query parameters on /api/raw. Multiple values are comma-separated. The dashboard exposes the same filters with a visual UI.",
  },
  {
    title: "Output format",
    body: "The default output is one ip:port per line. Pass format=protocol_ip_port to get protocol://ip:port. Responses are plain text so you can pipe them directly into curl, requests, or any HTTP client.",
  },
  {
    title: "Freshness",
    body: "The list is refreshed continuously and the dashboard auto-refreshes every 3 minutes. The /status page reports the freshness of the most recent update.",
  },
  {
    title: "Reliability",
    body: "Free proxies are inherently unstable. Treat each entry as a hint, verify reachability from your client, and rotate to the next entry on failure.",
  },
  {
    title: "Limits",
    body: "Up to 10,000 of the most recent proxies are returned per request. There is no enforced per-IP rate limit; please cache responses for at least 30 seconds.",
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto w-full max-w-[90vw] space-y-12 px-0 py-16">
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          Documentation
        </p>
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          {siteConfig.name} essentials
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
          The shortest path from &quot;I need a proxy&quot; to a working
          request. What the list provides, how to filter it, and how to handle
          edge cases.
        </p>
      </section>

      <section className="space-y-6">
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-xl border border-border/50 bg-card/60 p-6"
          >
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {section.body}
            </p>
          </article>
        ))}
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/api">
          <Button size="lg">Read API spec</Button>
        </Link>
        <Link href="/use-cases">
          <Button
            size="lg"
            variant="outline"
          >
            See use cases
          </Button>
        </Link>
      </section>
    </div>
  );
}
