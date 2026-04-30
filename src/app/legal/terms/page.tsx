import type { Metadata } from "next";
import { siteConfig, absoluteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `${siteConfig.name} terms of service. Read the conditions for using the dashboard, statistics, and raw API.`,
  alternates: { canonical: "/legal/terms" },
  openGraph: {
    title: `Terms of Service — ${siteConfig.name}`,
    url: absoluteUrl("/legal/terms"),
    type: "article",
  },
};

export default function TermsPage() {
  return (
    <article className="prose-page mx-auto w-full max-w-3xl space-y-6 px-4 py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Terms of Service
        </h1>
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date().toISOString().slice(0, 10)}
        </p>
      </header>

      <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          By accessing or using {siteConfig.name} (the &quot;Service&quot;) you
          agree to these Terms. The Service is operated by{" "}
          {siteConfig.operator} and provided free of charge on an as-is basis.
        </p>

        <h2 className="text-base font-semibold text-foreground">Acceptable use</h2>
        <p>
          You agree not to use the Service to violate any applicable law, to
          attack third-party systems, to evade rate limits in violation of a
          target&apos;s terms of service, or to facilitate fraud. The proxy data
          is provided as informational data only.
        </p>

        <h2 className="text-base font-semibold text-foreground">No warranty</h2>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available&quot;
          without warranties of any kind, express or implied. Proxy entries are
          generated from public sources and may be unreliable, slow, or
          unavailable at any time.
        </p>

        <h2 className="text-base font-semibold text-foreground">Limitation of liability</h2>
        <p>
          In no event shall {siteConfig.operator} or {siteConfig.name} be liable
          for any indirect, incidental, special, consequential, or punitive
          damages arising out of or related to your use of the Service.
        </p>

        <h2 className="text-base font-semibold text-foreground">Changes</h2>
        <p>
          These Terms may be updated at any time. Continued use of the Service
          after changes constitutes acceptance.
        </p>

        <h2 className="text-base font-semibold text-foreground">Contact</h2>
        <p>
          Questions about these Terms can be sent to{" "}
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
