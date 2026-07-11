import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { siteConfig, absoluteUrl } from "@/lib/site-config";
import { useCases, useCaseSlugs, getUseCase } from "@/lib/use-cases";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return useCaseSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const useCase = getUseCase(slug);
  if (!useCase) return {};

  const url = absoluteUrl(`/use-cases/${useCase.slug}`);
  return {
    title: useCase.metaTitle,
    description: useCase.metaDescription,
    keywords: useCase.keywords,
    alternates: { canonical: `/use-cases/${useCase.slug}` },
    openGraph: {
      type: "article",
      url,
      title: `${useCase.metaTitle} — ${siteConfig.name}`,
      description: useCase.metaDescription,
      images: [{ url: "/icon-512.png", width: 512, height: 512, alt: siteConfig.name }],
    },
    twitter: {
      card: "summary",
      title: `${useCase.metaTitle} — ${siteConfig.name}`,
      description: useCase.metaDescription,
      images: ["/icon-512.png"],
    },
  };
}

export default async function UseCasePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const useCase = getUseCase(slug);
  if (!useCase) notFound();

  const url = absoluteUrl(`/use-cases/${useCase.slug}`);
  const related = useCase.related
    .map((s) => useCases.find((u) => u.slug === s))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Use cases", item: absoluteUrl("/use-cases") },
      { "@type": "ListItem", position: 3, name: useCase.label, item: url },
    ],
  };

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: useCase.title,
    description: useCase.metaDescription,
    url,
    inLanguage: siteConfig.language,
    author: { "@type": "Person", name: siteConfig.operator },
    publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    mainEntityOfPage: url,
    about: useCase.keywords,
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: useCase.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 md:py-16">
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
        <Link href="/use-cases" className="transition-colors hover:text-foreground">
          Use cases
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{useCase.label}</span>
      </nav>

      <header>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{useCase.title}</h1>
        {/* Answer-first: direct definition up top for featured snippets and AI citation. */}
        <p className="mt-4 text-lg text-muted-foreground">{useCase.intro}</p>
      </header>

      <section aria-label="Key statistics" className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {useCase.stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/70">
            <CardContent className="p-4">
              <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="mt-10 space-y-8">
        {useCase.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-semibold tracking-tight">{section.heading}</h2>
            <div className="mt-3 space-y-3">
              {section.body.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-10 rounded-2xl border border-border/50 bg-card/60 px-5 py-6">
        <h2 className="text-xl font-semibold tracking-tight">How to filter proxies in Proxcy</h2>
        <ul className="mt-4 space-y-2.5">
          {useCase.filterTips.map((tip) => (
            <li key={tip} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Open the dashboard
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Frequently asked questions</h2>
        <div className="mt-4 divide-y divide-border/50">
          {useCase.faqs.map((faq) => (
            <details key={faq.question} className="group py-4">
              <summary className="cursor-pointer list-none text-sm font-medium marker:content-none">
                <span className="flex items-center justify-between gap-4">
                  {faq.question}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Related use cases</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {related.map((u) => (
              <Link key={u.slug} href={`/use-cases/${u.slug}`} className="group">
                <Card className="h-full border-border/50 bg-card/70 transition-colors duration-200 hover:border-border">
                  <CardContent className="flex h-full flex-col gap-2 p-4">
                    <CardTitle className="text-base">{u.label}</CardTitle>
                    <CardDescription className="text-xs">{u.tagline}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-12">
        <Link
          href="/use-cases"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All use cases
        </Link>
      </div>
    </article>
  );
}
