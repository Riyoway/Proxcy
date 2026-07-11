import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig, absoluteUrl } from "@/lib/site-config";

const endpoint = absoluteUrl("/api/proxies");

const title = "Proxcy API";
const description =
  "Free, no-auth JSON API for live proxies. GET /api/proxies returns every checked HTTP, SOCKS4, and SOCKS5 proxy with country, latency, protocol, anonymity, and Google reachability.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "free proxy api",
    "proxy list json api",
    "proxy list api",
    "socks5 proxy api",
    "http proxy api",
    "public proxy api no auth",
  ],
  alternates: { canonical: "/api" },
  openGraph: {
    type: "article",
    url: absoluteUrl("/api"),
    title: `${title} — Free Proxy List JSON API`,
    description,
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: siteConfig.name }],
  },
  twitter: {
    card: "summary",
    title: `${title} — Free Proxy List JSON API`,
    description,
    images: ["/icon-512.png"],
  },
};

const fields: Array<{ name: string; type: string; desc: string }> = [
  { name: "ip", type: "string", desc: "Proxy IP address." },
  { name: "port", type: "number", desc: "Proxy port." },
  { name: "protocol", type: "string", desc: "http, socks4, or socks5." },
  { name: "speed_ms", type: "number", desc: "Measured latency in milliseconds." },
  { name: "is_valid", type: "boolean", desc: "Whether the proxy passed the last check." },
  { name: "is_google", type: "boolean", desc: "Whether the proxy can reach Google." },
  { name: "anonymity_level", type: "string | null", desc: "transparent, anonymous, or elite." },
  { name: "country_code", type: "string | null", desc: "ISO 3166-1 alpha-2 code." },
  { name: "country_name", type: "string | null", desc: "Country name." },
  { name: "asn", type: "string | null", desc: "Autonomous System Number." },
  { name: "organization", type: "string | null", desc: "Network / hosting organization." },
  { name: "checked_at", type: "string", desc: "ISO 8601 timestamp of the last check." },
];

const faqs = [
  {
    question: "Is the Proxcy API free?",
    answer:
      "Yes. The API is free and requires no API key or authentication. Send a GET request to /api/proxies and you get the full dataset as JSON.",
  },
  {
    question: "Can I call the API from a browser?",
    answer:
      "Yes. The endpoint sends Access-Control-Allow-Origin: *, so it works in client-side JavaScript from any origin without a CORS proxy.",
  },
  {
    question: "How fresh is the data?",
    answer:
      "The endpoint mirrors the live dataset and is cached for about 60 seconds with stale-while-revalidate, so responses are fast and never more than roughly a minute behind the source.",
  },
  {
    question: "What proxy protocols are included?",
    answer:
      "HTTP, SOCKS4, and SOCKS5. Each record includes the protocol, latency, country, anonymity level, and whether the proxy can reach Google.",
  },
];

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
    { "@type": "ListItem", position: 2, name: title, item: absoluteUrl("/api") },
  ],
};

const articleLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: `${title} — Free Proxy List JSON API`,
  description,
  url: absoluteUrl("/api"),
  inLanguage: siteConfig.language,
  author: { "@type": "Person", name: siteConfig.operator },
  publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
  mainEntityOfPage: absoluteUrl("/api"),
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

const curlExample = `curl ${endpoint}`;
const fetchExample = `const res = await fetch("${endpoint}");
const { proxies } = await res.json();
// proxies: Array<{ ip, port, protocol, speed_ms, ... }>`;
const responseExample = `{
  "proxies": [
    {
      "ip": "8.211.194.78",
      "port": 31433,
      "protocol": "socks5",
      "speed_ms": 6500,
      "is_valid": true,
      "is_google": false,
      "anonymity_level": "elite",
      "country_code": "GB",
      "country_name": "United Kingdom",
      "asn": "AS45102",
      "organization": "Alibaba Cloud",
      "checked_at": "2026-07-10T12:00:00Z"
    }
  ]
}`;

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-zinc-950/70">
      <pre className="p-4 text-xs leading-relaxed text-zinc-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">API</span>
      </nav>

      <header>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Proxcy API</h1>
        {/* Answer-first for featured snippets and AI citation. */}
        <p className="mt-4 text-lg text-muted-foreground">
          The Proxcy API is a free, no-authentication JSON endpoint that returns the same live proxy
          dataset the dashboard uses. Send a <code className="rounded bg-muted px-1 py-0.5 text-sm">GET</code>{" "}
          request to <code className="rounded bg-muted px-1 py-0.5 text-sm">/api/proxies</code> and you
          get every checked HTTP, SOCKS4, and SOCKS5 proxy — each with country, latency,
          protocol, anonymity level, and Google reachability.
        </p>
      </header>

      <section className="mt-8">
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/70 px-4 py-3">
          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
            GET
          </span>
          <code className="truncate text-sm text-foreground">{endpoint}</code>
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          <li className="rounded-lg border border-border/50 bg-card/50 px-3 py-2">
            <span className="text-foreground">No auth</span> — no API key needed
          </li>
          <li className="rounded-lg border border-border/50 bg-card/50 px-3 py-2">
            <span className="text-foreground">CORS enabled</span> — call from the browser
          </li>
          <li className="rounded-lg border border-border/50 bg-card/50 px-3 py-2">
            <span className="text-foreground">~60s cache</span> — fast, near-live data
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Terminal className="h-4 w-4" />
          Quick start
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">Fetch the full dataset with curl:</p>
        <div className="mt-2">
          <CodeBlock code={curlExample} />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Or from JavaScript in the browser:</p>
        <div className="mt-2">
          <CodeBlock code={fetchExample} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Raw lists (per protocol)</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Prefer a flat text list over JSON? These endpoints return one{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-sm">ip:port</code> per line as{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-sm">text/plain</code>, also CORS-enabled and cached.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Endpoint</th>
                <th className="px-3 py-2 font-medium">Returns</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[
                ["/api/proxies/http", "HTTP proxies"],
                ["/api/proxies/socks4", "SOCKS4 proxies"],
                ["/api/proxies/socks5", "SOCKS5 proxies"],
                ["/api/proxies/all", "All valid proxies (protocol://ip:port)"],
              ].map(([path, desc]) => (
                <tr key={path}>
                  <td className="px-3 py-2 font-mono text-xs text-foreground">{path}</td>
                  <td className="px-3 py-2 text-muted-foreground">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <CodeBlock code={`curl ${absoluteUrl("/api/proxies/socks5")}`} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Response</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          A JSON object with a <code className="rounded bg-muted px-1 py-0.5 text-sm">proxies</code>{" "}
          array. Each item has the following fields:
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {fields.map((field) => (
                <tr key={field.name}>
                  <td className="px-3 py-2 font-mono text-xs text-foreground">{field.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{field.type}</td>
                  <td className="px-3 py-2 text-muted-foreground">{field.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Example response:</p>
        <div className="mt-2">
          <CodeBlock code={responseExample} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Frequently asked questions</h2>
        <div className="mt-4 divide-y divide-border/50">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-4">
              <summary className="cursor-pointer list-none text-sm font-medium marker:content-none">
                <span className="flex items-center justify-between gap-4">
                  {faq.question}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-12 flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/60 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Explore the data visually</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter the same proxies by country, latency, and protocol in the dashboard, or see common{" "}
            <Link href="/use-cases" className="underline underline-offset-2 hover:text-foreground">
              proxy use cases
            </Link>
            .
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Open dashboard
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </div>
  );
}
