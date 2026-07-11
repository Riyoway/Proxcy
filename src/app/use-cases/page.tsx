import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { siteConfig, absoluteUrl } from "@/lib/site-config";
import { useCases } from "@/lib/use-cases";

const title = "Proxy Use Cases";
const description =
  "Real-world ways to use proxies: web scraping, SEO rank tracking, price monitoring, ad verification, geo-testing, and multi-account management. Filter live proxies for each in Proxcy.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "proxy use cases",
    "what are proxies used for",
    "web scraping proxies",
    "seo proxies",
    "ad verification proxies",
    "geo testing proxies",
  ],
  alternates: { canonical: "/use-cases" },
  openGraph: {
    type: "website",
    url: absoluteUrl("/use-cases"),
    title: `${title} — ${siteConfig.name}`,
    description,
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: siteConfig.name }],
  },
  twitter: {
    card: "summary",
    title: `${title} — ${siteConfig.name}`,
    description,
    images: ["/icon-512.png"],
  },
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
    { "@type": "ListItem", position: 2, name: title, item: absoluteUrl("/use-cases") },
  ],
};

const collectionLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: `${title} — ${siteConfig.name}`,
  url: absoluteUrl("/use-cases"),
  description,
  hasPart: useCases.map((u) => ({
    "@type": "WebPage",
    name: u.title,
    url: absoluteUrl(`/use-cases/${u.slug}`),
    description: u.tagline,
  })),
};

export default function UseCasesPage() {
  return (
    <div className="mx-auto w-full max-w-[90vw] px-4 py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Use cases</span>
      </nav>

      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Proxy Use Cases</h1>
        <p className="mt-4 text-base text-muted-foreground">
          Proxies route your traffic through a different IP address. That single capability powers a
          surprising range of work — from collecting public data at scale to seeing exactly what
          users in another country experience. Below are the most common use cases, each with the
          proxy criteria that matter and how to filter for them in Proxcy.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {useCases.map((u) => (
          <Link key={u.slug} href={`/use-cases/${u.slug}`} className="group">
            <Card className="h-full border-border/50 bg-card/70 transition-colors duration-200 hover:border-border">
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <CardTitle className="text-lg">{u.title}</CardTitle>
                <CardDescription className="flex-1 text-sm">{u.tagline}</CardDescription>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                  Read guide
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border/50 bg-card/60 px-5 py-6">
        <h2 className="text-lg font-semibold">Find proxies for your use case</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every guide points back to the same tool: the Proxcy dashboard, where you can filter live
          HTTP, SOCKS4, and SOCKS5 proxies by country, latency, protocol, anonymity, and
          Google reachability.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Open the dashboard
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
