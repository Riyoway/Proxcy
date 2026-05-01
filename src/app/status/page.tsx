import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig, absoluteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Status — Live operational status",
  description: `Operational status for ${siteConfig.name}: dashboard, raw API, live data freshness, and storage. See how recently the proxy list was updated.`,
  alternates: { canonical: "/status" },
  openGraph: {
    title: `${siteConfig.name} Status`,
    description: `Real-time operational status for the ${siteConfig.name} platform.`,
    url: absoluteUrl("/status"),
    type: "website",
  },
};

// Force dynamic so the user always sees the freshest status reading.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const FRESHNESS_THRESHOLD_MS = 15 * 60 * 1000; // 15 min

type ServiceState = "operational" | "degraded" | "down" | "unknown";

interface StatusSnapshot {
  state: ServiceState;
  latestCycleAt: string | null;
  validCount: number | null;
  googleCount: number | null;
  freshnessMs: number | null;
  errorMessage: string | null;
}

async function loadStatus(): Promise<StatusSnapshot> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      state: "unknown",
      latestCycleAt: null,
      validCount: null,
      googleCount: null,
      freshnessMs: null,
      errorMessage: "Database configuration missing.",
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase
      .from("proxy_history")
      .select("created_at, total_valid, total_google")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        state: "unknown",
        latestCycleAt: null,
        validCount: null,
        googleCount: null,
        freshnessMs: null,
        errorMessage: error.message,
      };
    }

    if (!data) {
      return {
        state: "unknown",
        latestCycleAt: null,
        validCount: null,
        googleCount: null,
        freshnessMs: null,
        errorMessage: "No cycle history recorded yet.",
      };
    }

    const latestAt = new Date(data.created_at).getTime();
    const freshnessMs = Date.now() - latestAt;
    const state: ServiceState =
      freshnessMs < FRESHNESS_THRESHOLD_MS
        ? "operational"
        : freshnessMs < FRESHNESS_THRESHOLD_MS * 4
          ? "degraded"
          : "down";

    return {
      state,
      latestCycleAt: data.created_at,
      validCount: data.total_valid ?? null,
      googleCount: data.total_google ?? null,
      freshnessMs,
      errorMessage: null,
    };
  } catch (err) {
    return {
      state: "unknown",
      latestCycleAt: null,
      validCount: null,
      googleCount: null,
      freshnessMs: null,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

const stateLabel: Record<ServiceState, string> = {
  operational: "All systems operational",
  degraded: "Degraded performance",
  down: "Service disruption",
  unknown: "Status unavailable",
};

const stateClassName: Record<ServiceState, string> = {
  operational: "text-emerald-400",
  degraded: "text-amber-400",
  down: "text-red-400",
  unknown: "text-muted-foreground",
};

const StateIcon: React.FC<{ state: ServiceState; className?: string }> = ({
  state,
  className,
}) => {
  if (state === "operational")
    return <CheckCircle2 className={className} />;
  if (state === "down") return <AlertTriangle className={className} />;
  return <Activity className={className} />;
};

function formatFreshness(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return `${Math.round(ms / 3_600_000)}h ago`;
}

export default async function StatusPage() {
  const status = await loadStatus();

  const components: Array<{ name: string; description: string; state: ServiceState }> = [
    {
      name: "Dashboard",
      description: "Web UI",
      state: "operational",
    },
    {
      name: "Raw API",
      description: "GET /api/raw, /api/download/*",
      state: status.state === "down" ? "degraded" : "operational",
    },
    {
      name: "Live data",
      description: "Freshness of the proxy list",
      state: status.state,
    },
    {
      name: "Storage",
      description: "Persistent data layer",
      state: status.errorMessage ? "degraded" : "operational",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[90vw] space-y-12 px-0 py-16">
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          Status
        </p>
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          Operational status
        </h1>
        <div
          className={`flex items-center gap-3 ${stateClassName[status.state]}`}
        >
          <StateIcon
            state={status.state}
            className="h-5 w-5"
          />
          <span className="text-base font-semibold">
            {stateLabel[status.state]}
          </span>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The list is considered fresh when it was updated within the last 15
          minutes. Older updates are reported as degraded; updates older than
          one hour mark live data as down.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border/50 bg-card/60 p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Last update
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight">
            {formatFreshness(status.freshnessMs)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {status.latestCycleAt
              ? new Date(status.latestCycleAt).toUTCString()
              : "No data"}
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/60 p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Valid proxies (latest update)
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight">
            {status.validCount?.toLocaleString() ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/60 p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Google reachable (latest update)
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight">
            {status.googleCount?.toLocaleString() ?? "—"}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">Components</h2>
        <ul className="divide-y divide-border/40 rounded-xl border border-border/50">
          {components.map((c) => (
            <li
              key={c.name}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </div>
              <div
                className={`flex items-center gap-2 text-xs font-medium ${stateClassName[c.state]}`}
              >
                <StateIcon
                  state={c.state}
                  className="h-3.5 w-3.5"
                />
                <span className="capitalize">{c.state}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {status.errorMessage ? (
        <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Live status is temporarily unavailable.
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-bold tracking-tight">Maintenance & incidents</h2>
        <p className="text-sm text-muted-foreground">
          No active incidents. Maintenance windows, when scheduled, are
          announced on this page at least 24 hours in advance.
        </p>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/dashboard">
          <Button size="lg">Open Dashboard</Button>
        </Link>
        <Link href="/stats">
          <Button
            size="lg"
            variant="outline"
          >
            View Stats
          </Button>
        </Link>
      </section>
    </div>
  );
}
