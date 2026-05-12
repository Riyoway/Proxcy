"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, BarChart3, Gauge, Globe, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchAllProxies, fetchProxyHistory, type ProxyHistoryRecord, type ProxyStatRecord } from "@/lib/proxy-fetcher";
import {
  bucketBySpeed,
  computeAverageSpeed,
  computeFastestProxy,
  computeGoogleAccess,
  groupByCountry,
  aggregateHistoryByHour,
  groupByHour,
  groupByOrganization,
  groupByProtocol,
} from "@/lib/proxy-stats-data";
import { StatCard } from "@/components/stats/stat-card";
import { ProtocolChart } from "@/components/stats/protocol-chart";
import { CountryChart } from "@/components/stats/country-chart";
import { SpeedDistributionChart } from "@/components/stats/speed-distribution-chart";
import { TimeSeriesChart } from "@/components/stats/timeseries-chart";
import { GoogleAccessChart } from "@/components/stats/google-access-chart";
import { OrganizationChart } from "@/components/stats/organization-chart";

const StatsPage: React.FC = () => {
  const [records, setRecords] = useState<ProxyStatRecord[]>([]);
  const [historyRecords, setHistoryRecords] = useState<ProxyHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, historyData] = await Promise.all([fetchAllProxies(), fetchProxyHistory()]);
      setRecords(data);
      setHistoryRecords(historyData);
      setLoadError(null);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to load stats:", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load proxy records.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const intervalId = setInterval(load, 180000);
    return () => clearInterval(intervalId);
  }, [load]);

  const stats = useMemo(() => {
    return {
      total: records.length,
      google: records.filter((r) => r.is_google).length,
      avgSpeed: computeAverageSpeed(records),
      fastest: computeFastestProxy(records),
      countries: new Set(records.map((r) => r.country_code).filter(Boolean)).size,
    };
  }, [records]);

  const protocolData = useMemo(() => groupByProtocol(records), [records]);
  const countryData = useMemo(() => groupByCountry(records, 10), [records]);
  const speedData = useMemo(() => bucketBySpeed(records), [records]);
  const timeseriesData = useMemo(() => {
    if (historyRecords.length > 0) {
      return aggregateHistoryByHour(historyRecords, 12);
    }
    return groupByHour(records, 12);
  }, [historyRecords, records]);
  const googleAccessData = useMemo(() => computeGoogleAccess(records), [records]);
  const orgData = useMemo(() => groupByOrganization(records, 8), [records]);

  const googleRate = stats.total > 0 ? Math.round((stats.google / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 font-sans text-foreground selection:bg-primary/20">
      <div className="w-full max-w-[90vw] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Proxy Statistics</h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-[600px]">
              Visualized insights across protocols, countries, speed, and Google accessibility.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Last sync: {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
            </span>
            <Link href="/">
              <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-medium">
                <ArrowLeft className="h-3.5 w-3.5 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs font-medium"
              onClick={load}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {loadError ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-start gap-3 px-4 py-3 text-sm text-destructive">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{loadError}</div>
            </CardContent>
          </Card>
        ) : null}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard icon={<Globe className="h-4 w-4" />} label="Total Valid" value={stats.total.toLocaleString()} loading={isLoading && records.length === 0} />
          <SummaryCard icon={<ShieldCheck className="h-4 w-4" />} label="Google Access" value={`${stats.google.toLocaleString()}`} sub={`${googleRate}% of total`} loading={isLoading && records.length === 0} />
          <SummaryCard icon={<Gauge className="h-4 w-4" />} label="Avg Speed" value={stats.avgSpeed > 0 ? `${stats.avgSpeed} ms` : "-"} loading={isLoading && records.length === 0} />
          <SummaryCard icon={<Zap className="h-4 w-4" />} label="Fastest" value={stats.fastest ? `${stats.fastest.speed_ms} ms` : "-"} sub={stats.fastest?.ip ?? ""} loading={isLoading && records.length === 0} />
          <SummaryCard icon={<Globe className="h-4 w-4" />} label="Countries" value={stats.countries.toLocaleString()} loading={isLoading && records.length === 0} />
        </div>

        {/* Primary charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StatCard title="Protocol Distribution" description="Proxies grouped by protocol">
            {isLoading && records.length === 0 ? <Skeleton className="h-[260px] w-full rounded-md" /> : <ProtocolChart data={protocolData} />}
          </StatCard>
          <StatCard title="Google Accessibility" description="Access status across all valid proxies">
            {isLoading && records.length === 0 ? <Skeleton className="h-[260px] w-full rounded-md" /> : <GoogleAccessChart data={googleAccessData} />}
          </StatCard>
          <StatCard title="Speed Distribution" description="Response-time buckets (ms)">
            {isLoading && records.length === 0 ? <Skeleton className="h-[260px] w-full rounded-md" /> : <SpeedDistributionChart data={speedData} />}
          </StatCard>
        </div>

        {/* Time series */}
        <StatCard title="Checks Over Last 12h" description="Hourly validated proxies including Google-accessible share">
          {isLoading && records.length === 0 ? <Skeleton className="h-[260px] w-full rounded-md" /> : <TimeSeriesChart data={timeseriesData} />}
        </StatCard>

        {/* Countries & Organizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatCard title="Top 10 Countries" description="Total proxies with Google-accessible share">
            {isLoading && records.length === 0 ? <Skeleton className="h-[320px] w-full rounded-md" /> : <CountryChart data={countryData} />}
          </StatCard>
          <StatCard title="Top 8 Organizations" description="Most common ISPs / ASNs hosting proxies">
            {isLoading && records.length === 0 ? <Skeleton className="h-[320px] w-full rounded-md" /> : <OrganizationChart data={orgData} />}
          </StatCard>
        </div>
      </div>
    </div>
  );
};

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, label, value, sub, loading }) => (
  <Card className="bg-card/70 border-border/50">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</CardTitle>
      <span className="text-muted-foreground">{icon}</span>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {sub ? <div className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</div> : null}
        </>
      )}
    </CardContent>
  </Card>
);

export default StatsPage;
