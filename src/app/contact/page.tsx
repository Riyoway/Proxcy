import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { siteConfig, absoluteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact the ${siteConfig.name} team. Email ${siteConfig.contactEmail} for questions, partnerships, or operational inquiries.`,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: `Contact ${siteConfig.name}`,
    description: `Email ${siteConfig.contactEmail}.`,
    url: absoluteUrl("/contact"),
    type: "article",
  },
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-[90vw] space-y-10 px-0 py-16">
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          Contact
        </p>
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          Get in touch
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          For questions, partnerships, or operational inquiries, email the
          address below. Responses are best-effort.
        </p>
      </section>

      <section className="rounded-2xl border border-border/50 bg-card/60 p-6">
        <a
          href={`mailto:${siteConfig.contactEmail}`}
          className="inline-flex items-center gap-3 text-base font-semibold text-foreground transition-colors hover:text-primary"
        >
          <Mail className="h-4 w-4" />
          {siteConfig.contactEmail}
        </a>
        <p className="mt-3 text-xs text-muted-foreground">
          Operated by {siteConfig.operator}.
        </p>
      </section>
    </div>
  );
}
