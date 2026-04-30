import type { Metadata } from "next";
import { siteConfig, absoluteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: `${siteConfig.name} disclaimer. The proxy list is informational only and provided without warranty.`,
  alternates: { canonical: "/legal/disclaimer" },
  openGraph: {
    title: `Disclaimer — ${siteConfig.name}`,
    url: absoluteUrl("/legal/disclaimer"),
    type: "article",
  },
};

export default function DisclaimerPage() {
  return (
    <article className="prose-page mx-auto w-full max-w-3xl space-y-6 px-4 py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Disclaimer
        </h1>
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date().toISOString().slice(0, 10)}
        </p>
      </header>

      <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          The proxy entries published on {siteConfig.name} are aggregated from
          public sources and validated automatically. They are provided as
          informational data only.
        </p>
        <p>
          {siteConfig.operator} does not operate the listed proxy servers, does
          not guarantee their availability, performance, or trustworthiness, and
          does not endorse any specific use of them. You are solely responsible
          for complying with the terms of service of any third-party service
          you access through a proxy.
        </p>
        <p>
          Use of any proxy entry is at your own risk. Sensitive credentials
          should never be transmitted through untrusted intermediaries.
        </p>
      </section>
    </article>
  );
}
