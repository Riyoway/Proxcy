import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

const navLinks = [
  { href: "/use-cases", label: "Use Cases" },
  { href: "/api", label: "API" },
  { href: "/docs", label: "Docs" },
  { href: "/stats", label: "Stats" },
  { href: "/status", label: "Status" },
];

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
            src="/icon.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-md"
            priority
          />
          <span className="text-base">{siteConfig.name}</span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 md:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button
              size="default"
              className="h-10 px-4 text-sm font-medium"
            >
              Open Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
