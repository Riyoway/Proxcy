interface Faq {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  id?: string;
  title?: string;
  intro?: string;
  faqs: Faq[];
}

/**
 * Renders a FAQ section together with a JSON-LD FAQPage block.
 * FAQPage schema lifts AI-search citation rate by ~+40% (Princeton GEO research).
 */
export const FaqSection: React.FC<FaqSectionProps> = ({
  id = "faq",
  title = "Frequently Asked Questions",
  intro,
  faqs,
}) => {
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h2
          id={`${id}-heading`}
          className="text-2xl font-bold tracking-tight md:text-3xl"
        >
          {title}
        </h2>
        {intro ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{intro}</p>
        ) : null}
      </div>
      <ul className="space-y-4">
        {faqs.map((faq) => (
          <li
            key={faq.question}
            className="rounded-xl border border-border/50 bg-card/60 p-5"
          >
            <h3 className="text-sm font-semibold text-foreground">
              {faq.question}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {faq.answer}
            </p>
          </li>
        ))}
      </ul>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
    </section>
  );
};
