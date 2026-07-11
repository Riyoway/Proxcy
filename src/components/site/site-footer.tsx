import Image from "next/image";
import Link from "next/link";
import { Globe } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.3-.54-1.53.12-3.19 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.89.12 3.19.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
  </svg>
);

const linkClass = "text-sm text-muted-foreground transition-colors hover:text-foreground";

export const SiteFooter: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border/50 bg-background/60">
      <div className="mx-auto w-full max-w-[90vw] py-10">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <Image src="/icon-512.png" alt="" width={28} height={28} className="h-7 w-7 rounded-md" />
              <span className="text-base font-semibold tracking-tight">{siteConfig.name}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{siteConfig.shortDescription}</p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">Product</h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/" className={linkClass}>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/use-cases" className={linkClass}>
                    Use cases
                  </Link>
                </li>
                <li>
                  <Link href="/api" className={linkClass}>
                    API
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">Resources</h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <a href={siteConfig.social.code} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    GitHub
                  </a>
                </li>
                <li>
                  <a href={siteConfig.social.website} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    Creator
                  </a>
                </li>
              </ul>
            </div>

          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border/40 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {year} {siteConfig.operator}. Free &amp; open-source.
          </p>
          <div className="flex items-center gap-3">
            <a
              href={siteConfig.social.code}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <GithubIcon />
            </a>
            <a
              href={siteConfig.social.website}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${siteConfig.operator}'s website`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Globe className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
