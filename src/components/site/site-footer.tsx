import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

const footerSections = [
  {
    title: "Product",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/api", label: "API" },
      { href: "/stats", label: "Stats" },
      { href: "/status", label: "Status" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/use-cases", label: "Use Cases" },
      { href: "/docs", label: "Docs" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/disclaimer", label: "Disclaimer" },
      { href: "/legal/cookies", label: "Cookie Policy" },
    ],
  },
];

export const SiteFooter: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/40 bg-background/60">
      <div className="mx-auto w-full max-w-[90vw] px-0 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 space-y-3 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-semibold"
            >
              <Image
                src="/icon-512.png"
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 rounded-md"
              />
              <span>{siteConfig.name}</span>
            </Link>
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
              {siteConfig.shortDescription}
            </p>
          </div>

          {footerSections.map((section) => (
            <div
              key={section.title}
              className="space-y-3"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                {section.title}
              </h3>
              <ul className="space-y-1.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-border/40 pt-6 md:flex-row md:items-center">
          <p className="text-xs text-muted-foreground">
            © {year} {siteConfig.legalName}. Operated by{" "}
            <a
              href="https://riyo.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
            >
              riyo.me
            </a>
            .
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="transition-colors hover:text-foreground"
            >
              {siteConfig.contactEmail}
            </a>
            <Link
              href="/sitemap.xml"
              className="transition-colors hover:text-foreground"
            >
              Sitemap
            </Link>
            <a
              href={siteConfig.social.github}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
