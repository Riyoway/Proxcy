import Image from "next/image";
import Link from "next/link";
import { Globe } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.3-.54-1.53.12-3.19 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.89.12 3.19.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
  </svg>
);

export const SiteHeader: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-[90vw] items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
          aria-label={`${siteConfig.name} home`}
        >
          <Image
            src="/icon-512.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-md"
            priority
          />
          <span className="text-base">{siteConfig.name}</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/use-cases"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Use cases
          </Link>
          <Link
            href="/api"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            API
          </Link>
          <a
            href={siteConfig.social.repo}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <GithubIcon />
          </a>
          <a
            href={siteConfig.social.website}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${siteConfig.operator}'s website`}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Globe className="h-4 w-4" />
          </a>
        </nav>
      </div>
    </header>
  );
};
