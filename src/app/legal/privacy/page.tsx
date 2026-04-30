import type { Metadata } from "next";
import { siteConfig, absoluteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `${siteConfig.name} privacy policy. What data is collected, how it is processed, and how to contact the operator about privacy concerns.`,
  alternates: { canonical: "/legal/privacy" },
  openGraph: {
    title: `Privacy Policy — ${siteConfig.name}`,
    url: absoluteUrl("/legal/privacy"),
    type: "article",
  },
};

export default function PrivacyPage() {
  return (
    <article className="prose-page mx-auto w-full max-w-3xl space-y-6 px-4 py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Privacy Policy
        </h1>
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date().toISOString().slice(0, 10)}
        </p>
      </header>

      <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">Data we collect</h2>
        <p>
          {siteConfig.name} does not require an account and does not collect
          personally identifiable information. The platform stores public proxy
          metadata (ip:port, protocol, country, latency, ASN) gathered from
          public sources, not from end users of this site.
        </p>

        <h2 className="text-base font-semibold text-foreground">Server logs</h2>
        <p>
          Standard server logs (IP, user agent, timestamp, request path) may be
          retained by the hosting providers (Vercel, Supabase) for operational
          and security purposes. These logs are not sold or used for tracking.
        </p>

        <h2 className="text-base font-semibold text-foreground">Cookies</h2>
        <p>
          {siteConfig.name} does not set tracking cookies. Strictly necessary
          cookies may be used for session integrity. See the{" "}
          <a
            href="/legal/cookies"
            className="text-foreground hover:underline"
          >
            Cookie Policy
          </a>{" "}
          for details.
        </p>

        <h2 className="text-base font-semibold text-foreground">Third parties</h2>
        <p>
          The site is hosted on Vercel and uses Supabase as its database.
          Country and ASN enrichment is performed against public IP-to-country
          mappings.
        </p>

        <h2 className="text-base font-semibold text-foreground">Contact</h2>
        <p>
          Privacy questions can be sent to{" "}
          <a
            href={`mailto:${siteConfig.contactEmail}`}
            className="text-foreground hover:underline"
          >
            {siteConfig.contactEmail}
          </a>
          .
        </p>
      </section>
    </article>
  );
}
