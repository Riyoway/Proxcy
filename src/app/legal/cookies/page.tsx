import type { Metadata } from "next";
import { siteConfig, absoluteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: `${siteConfig.name} cookie policy. Which cookies are used and how to control them.`,
  alternates: { canonical: "/legal/cookies" },
  openGraph: {
    title: `Cookie Policy — ${siteConfig.name}`,
    url: absoluteUrl("/legal/cookies"),
    type: "article",
  },
};

export default function CookiesPage() {
  return (
    <article className="prose-page mx-auto w-full max-w-3xl space-y-6 px-4 py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Cookie Policy
        </h1>
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date().toISOString().slice(0, 10)}
        </p>
      </header>

      <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          {siteConfig.name} does not use advertising or analytics cookies.
          Strictly necessary cookies may be set by the hosting platform for
          security and session integrity.
        </p>
        <h2 className="text-base font-semibold text-foreground">Categories</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Strictly necessary:</strong>{" "}
            required for the site to function. Cannot be disabled.
          </li>
          <li>
            <strong className="text-foreground">Functional / Analytics / Marketing:</strong>{" "}
            not used by {siteConfig.name} at this time.
          </li>
        </ul>
        <h2 className="text-base font-semibold text-foreground">Cookie settings</h2>
        <p>
          Because no non-essential cookies are set, no opt-in or opt-out
          control is required. If this changes, a Cookie Settings dialog will
          be added here.
        </p>
        <h2 className="text-base font-semibold text-foreground">Contact</h2>
        <p>
          Questions can be sent to{" "}
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
