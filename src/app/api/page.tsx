import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FaqSection } from "@/components/site/faq-section";
import { siteConfig, absoluteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "API — Raw proxy filtering endpoint",
  description:
    "Proxcy raw API specification. Filter live HTTP, HTTPS, SOCKS4, and SOCKS5 proxies by country, protocol, and Google reachability. Returns plain ip:port lines, not JSON.",
  alternates: { canonical: "/api" },
  openGraph: {
    title: "Proxcy API — raw proxy filtering endpoint",
    description:
      "GET /api/raw returns plain ip:port lines. Filter by protocol, country, and Google reachability.",
    url: absoluteUrl("/api"),
    type: "article",
  },
};

const params = [
  {
    name: "protocol",
    type: "string",
    required: false,
    notes:
      "Comma-separated. Allowed values: http, https, socks4, socks5. Case-insensitive.",
    example: "protocol=socks5,socks4",
  },
  {
    name: "country",
    type: "string",
    required: false,
    notes:
      "Comma-separated ISO-3166 alpha-2 codes (e.g. us, jp, de). Case-insensitive.",
    example: "country=us,jp",
  },
  {
    name: "google",
    type: "boolean",
    required: false,
    notes:
      "true to return only proxies that successfully reached https://www.google.com/generate_204. false for proxies that failed the Google check.",
    example: "google=true",
  },
  {
    name: "format",
    type: "string",
    required: false,
    notes:
      "Output shape. ip_port (default) emits ip:port. protocol_ip_port emits protocol://ip:port.",
    example: "format=protocol_ip_port",
  },
];

const faqs = [
  {
    question: "Why is the response not JSON?",
    answer:
      "Most proxy consumers want a flat ip:port list. Returning raw lines avoids JSON parsing and keeps the response small enough to pipe directly into curl, requests, or wget.",
  },
  {
    question: "Is there authentication?",
    answer:
      "No. The endpoint is public and read-only. Apply your own caching layer if you call it frequently.",
  },
  {
    question: "What is the response size limit?",
    answer:
      "Up to 10,000 of the most recent proxies are returned per request, ordered by checked_at descending.",
  },
  {
    question: "Are there rate limits?",
    answer:
      "There is no enforced per-IP limit at this time. Please cache responses for at least 30 seconds and avoid burst loops.",
  },
  {
    question: "How should I handle failed proxies?",
    answer:
      "Treat each entry as a hint. Always verify reachability from your own client and rotate the proxy on the first connection error.",
  },
];

export default function ApiPage() {
  const apiBase = absoluteUrl("/api/raw");

  return (
    <div className="mx-auto w-full max-w-[90vw] space-y-12 px-0 py-16">
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          API specification
        </p>
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
          Raw proxy filtering API
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {siteConfig.name} exposes a single read-only endpoint that returns
          live, filtered proxies as plain text. Compose filters with query
          parameters; the response is a newline-delimited stream of ip:port (or
          protocol://ip:port) entries.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Endpoint</h2>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className="font-mono"
          >
            GET
          </Badge>
          <code className="break-all rounded-md bg-muted/40 px-2 py-1 font-mono text-sm">
            {apiBase}
          </code>
        </div>
        <p className="text-xs text-muted-foreground">
          Content-Type: <code className="font-mono">text/plain</code>. No
          authentication required.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Query parameters</h2>
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Required</th>
                <th className="px-3 py-2 font-semibold">Notes</th>
                <th className="px-3 py-2 font-semibold">Example</th>
              </tr>
            </thead>
            <tbody>
              {params.map((p) => (
                <tr
                  key={p.name}
                  className="border-t border-border/40 align-top"
                >
                  <td className="px-3 py-2 font-mono">{p.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.type}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {p.required ? "yes" : "no"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{p.notes}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">
                    {p.example}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Examples</h2>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              All SOCKS5 proxies that can reach Google
            </p>
            <pre className="overflow-x-auto rounded-xl border border-border/50 bg-card/60 p-4 text-xs leading-relaxed">
              <code className="font-mono">
                curl &quot;{apiBase}?protocol=socks5&amp;google=true&quot;
              </code>
            </pre>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              US or Japan proxies in protocol://ip:port form
            </p>
            <pre className="overflow-x-auto rounded-xl border border-border/50 bg-card/60 p-4 text-xs leading-relaxed">
              <code className="font-mono">
                curl &quot;{apiBase}?country=us,jp&amp;format=protocol_ip_port&quot;
              </code>
            </pre>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              Sample response (text/plain)
            </p>
            <pre className="overflow-x-auto rounded-xl border border-border/50 bg-card/60 p-4 text-xs leading-relaxed text-muted-foreground">
              <code className="font-mono">
                {`192.0.2.1:1080
198.51.100.42:8080
203.0.113.99:443`}
              </code>
            </pre>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Errors</h2>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li>
            <code className="font-mono">500 Database configuration missing</code>
            {" — "}server is misconfigured. Try again later.
          </li>
          <li>
            <code className="font-mono">500 Failed to fetch proxies</code>
            {" — "}upstream database error. Retry with exponential backoff.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Rate limits</h2>
        <p className="text-sm text-muted-foreground">
          There is no hard rate limit today. Please cache responses for at least
          30 seconds and back off on errors. Excessive abuse may be filtered at
          the edge.
        </p>
      </section>

      <FaqSection
        id="api-faq"
        title="API FAQ"
        faqs={faqs}
      />

      <section className="flex flex-wrap gap-3">
        <Link href="/dashboard">
          <Button size="lg">Build a query in the Dashboard</Button>
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "API", item: absoluteUrl("/api") },
            ],
          }),
        }}
      />
    </div>
  );
}
