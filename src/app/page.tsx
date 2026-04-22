"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { formatDistanceToNow } from "date-fns";
import { Search, Download, ChevronDown, ChevronUp, ChevronsUpDown, Filter, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Globe, Cable, MapPinned, ShieldCheck, Gauge, Clock3, Fingerprint, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { normalizeCountryName } from "@/lib/country";

const ProxyMapView = dynamic(() => import("@/components/proxy-map-view").then((module) => module.ProxyMapView), {
  ssr: false,
  loading: () => (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="space-y-4 p-6">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </CardContent>
    </Card>
  ),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
type AppSupabaseClient = SupabaseClient;
type WindowWithSupabase = Window & { __supabaseClient?: AppSupabaseClient };
type GlobalWithSupabase = typeof globalThis & { __supabaseClient?: AppSupabaseClient };

// Singleton pattern to prevent "Multiple GoTrueClient instances" warnings during HMR
const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  if (typeof window !== "undefined") {
    // Client-side singleton
    const clientStore = window as WindowWithSupabase;
    if (!clientStore.__supabaseClient) {
      clientStore.__supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    }
    return clientStore.__supabaseClient;
  } else {
    // Server-side
    const clientStore = globalThis as GlobalWithSupabase;
    if (!clientStore.__supabaseClient) {
      clientStore.__supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    }
    return clientStore.__supabaseClient;
  }
};

const supabase = getSupabaseClient();

interface ProxyRecord {
  id: string;
  ip: string;
  port: number;
  protocol: string;
  speed_ms: number;
  is_valid: boolean;
  is_google: boolean;
  country_code: string | null;
  country_name: string | null;
  asn: string | null;
  organization: string | null;
  geo_status: "resolving" | "resolved" | "unavailable";
  checked_at: string;
}

type SortField = "ip" | "port" | "country_name" | "protocol" | "organization" | "speed_ms" | "is_google" | "checked_at";
type SortDirection = "asc" | "desc";
type ViewMode = "list" | "map";
const emojiFontFamily = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';

function getCountryFlagEmoji(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) {
    return "🌐";
  }

  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function getCountryFlagAssetUrl(countryCode: string | null): string | null {
  if (!countryCode || countryCode.length !== 2) {
    return null;
  }

  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => (127397 + char.charCodeAt(0)).toString(16));

  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${codePoints.join("-")}.svg`;
}

const GoogleMonoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 512 512"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M32.582 370.734C15.127 336.291 5.12 297.425 5.12 256c0-41.426 10.007-80.291 27.462-114.735C74.705 57.484 161.047 0 261.12 0c69.12 0 126.836 25.367 171.287 66.793l-73.31 73.309c-26.763-25.135-60.276-38.168-97.977-38.168-66.56 0-123.113 44.917-143.36 105.426-5.12 15.36-8.146 31.65-8.146 48.64 0 16.989 3.026 33.28 8.146 48.64l-.303.232h.303c20.247 60.51 76.8 105.426 143.36 105.426 34.443 0 63.534-9.31 86.341-24.67 27.23-18.152 45.382-45.148 51.433-77.032H261.12v-99.142h241.105c3.025 16.757 4.654 34.211 4.654 52.364 0 77.963-27.927 143.592-76.334 188.276-42.356 39.098-100.305 61.905-169.425 61.905-100.073 0-186.415-57.483-228.538-141.032v-.233z" />
  </svg>
);

const SpeedIndicator: React.FC<{ speed: number }> = ({ speed }) => {
  const getSpeedColor = (speed: number): string => {
    if (speed < 1000) return "bg-green-500";
    if (speed < 3000) return "bg-yellow-500";
    if (speed < 8000) return "bg-orange-500";
    return "bg-red-500";
  };

  const getBars = (speed: number): number => {
    if (speed < 500) return 5;
    if (speed < 1000) return 4;
    if (speed < 3000) return 3;
    if (speed < 8000) return 2;
    return 1;
  };

  const filledBars = getBars(speed);
  const colorClass = getSpeedColor(speed);

  return (
    <div className="flex items-center gap-2 group/speed">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((bar) => (
          <div
            key={bar}
            className={`w-1 h-3 rounded-sm transition-all duration-300 ${bar <= filledBars ? `${colorClass} ${bar === filledBars && speed < 1000 ? "animate-pulse" : ""}` : "bg-muted"} group-hover/speed:scale-y-110`}
          />
        ))}
      </div>
      <span className="text-xs font-mono tabular-nums text-muted-foreground w-12 text-right transition-colors group-hover/speed:text-foreground">{speed}ms</span>
    </div>
  );
};

const TableSkeleton: React.FC = () => (
  <>
    {[...Array(10)].map((_, i) => (
      <TableRow key={i}>
        <TableCell>
          <Skeleton className="h-4 w-28" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-14" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-24" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-5 w-16 rounded-full" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-32" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-24" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-6 w-18 rounded-full" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-20" />
        </TableCell>
      </TableRow>
    ))}
  </>
);

const ProxyDashboard: React.FC = () => {
  const [data, setData] = useState<ProxyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("checked_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [protocolFilters, setProtocolFilters] = useState<Set<string>>(new Set());
  const [googleAccessFilter, setGoogleAccessFilter] = useState<"all" | "yes" | "no">("all");
  const [countryFilters, setCountryFilters] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const selectedCountryKey = useMemo(() => {
    return countryFilters.size === 1 ? Array.from(countryFilters)[0] : null;
  }, [countryFilters]);

  const fetchProxies = useCallback(async () => {
    setIsLoading(true);

    if (!supabase) {
      setLoadError("Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY on Vercel.");
      setIsLoading(false);
      return;
    }

    try {
      const allProxiesMap = new Map<string, ProxyRecord>();
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: chunk, error } = await supabase
          .from("proxies")
          .select("*")
          .order("checked_at", { ascending: false })
          .order("id", { ascending: false }) // 安定したソート順を保証
          .range(from, from + step - 1);

        if (error) {
          throw error;
        }

        if (chunk && chunk.length > 0) {
          // IDをキーにしてMapに格納することで重複を自動排除
          chunk.forEach((p) => allProxiesMap.set(p.id, p as ProxyRecord));
          
          if (chunk.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
        
        if (allProxiesMap.size >= 50000) break;
      }

      setLoadError(null);
      setData(Array.from(allProxiesMap.values()));
      setLastRefreshed(new Date());
    } catch (err) {
      setLoadError("Unexpected error while loading proxy records. Check the browser console and Supabase configuration.");
      console.error("Unexpected error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProxies();
    const intervalId = setInterval(() => {
      fetchProxies();
    }, 60000); // 60 seconds auto-refresh

    return () => clearInterval(intervalId);
  }, [fetchProxies]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("desc");
      }
    },
    [sortField],
  );

  const baseFilteredData = useMemo(() => {
    return data.filter((item) => {
      const normalizedQuery = searchQuery.toLowerCase();
      const matchesSearch = [item.id, item.ip, String(item.port), item.country_name ?? "", item.country_code ?? "", item.organization ?? "", item.asn ?? ""].some((value) => value.toLowerCase().includes(normalizedQuery));
      const protocolUpper = item.protocol.toUpperCase();
      const matchesProtocol = protocolFilters.size === 0 || protocolFilters.has(protocolUpper);
      const matchesGoogle = googleAccessFilter === "all" || (googleAccessFilter === "yes" && item.is_google) || (googleAccessFilter === "no" && !item.is_google);

      return matchesSearch && matchesProtocol && matchesGoogle;
    });
  }, [data, searchQuery, protocolFilters, googleAccessFilter]);

  const filteredAndSortedData = useMemo(() => {
    const filtered = baseFilteredData.filter((item) => {
      return countryFilters.size === 0 || countryFilters.has(normalizeCountryName(item.country_name) ?? "");
    });

    filtered.sort((a, b) => {
      if (sortField === "checked_at") {
        const aVal = new Date(a.checked_at).getTime();
        const bVal = new Date(b.checked_at).getTime();

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      if (sortField === "port" || sortField === "speed_ms") {
        const aVal = a[sortField] ?? 0;
        const bVal = b[sortField] ?? 0;

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      if (sortField === "is_google") {
        const aVal = Number(a.is_google);
        const bVal = Number(b.is_google);

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      if (sortField === "organization") {
        const aVal = `${a.organization ?? ""} ${a.asn ?? ""}`.trim().toLowerCase();
        const bVal = `${b.organization ?? ""} ${b.asn ?? ""}`.trim().toLowerCase();

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      const aVal = (a[sortField] ?? "").toString().toLowerCase();
      const bVal = (b[sortField] ?? "").toString().toLowerCase();

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [baseFilteredData, sortField, sortDirection, countryFilters]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedData.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);

  const handleExport = useCallback(
    (format: "csv" | "txt", onlyGoogle: boolean) => {
      const targetData = onlyGoogle ? filteredAndSortedData.filter((p) => p.is_google) : filteredAndSortedData;

      let content = "";
      let filename = "";
      let type = "";

      if (format === "csv") {
        const csvRows = [["IP", "Port", "Country", "Protocol", "ASN", "Organization", "Speed (ms)", "Google Access", "Checked At"], ...targetData.map((item) => [item.ip, item.port.toString(), item.country_code ?? item.country_name ?? "", item.protocol.toUpperCase(), item.asn ?? "", item.organization ?? "", item.speed_ms.toString(), item.is_google ? "Yes" : "No", new Date(item.checked_at).toISOString()])];
        content = csvRows.map((row) => row.join(",")).join("\n");
        filename = `proxies${onlyGoogle ? "-google" : ""}-${Date.now()}.csv`;
        type = "text/csv";
      } else {
        content = targetData.map((item) => item.id).join("\n");
        filename = `proxies${onlyGoogle ? "-google" : ""}-${Date.now()}.txt`;
        type = "text/plain";
      }

      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [filteredAndSortedData],
  );

  const toggleProtocolFilter = useCallback((protocol: string) => {
    setProtocolFilters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(protocol)) {
        newSet.delete(protocol);
      } else {
        newSet.add(protocol);
      }
      return newSet;
    });
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setProtocolFilters(new Set());
    setGoogleAccessFilter("all");
    setCountryFilters(new Set());
    setSearchQuery("");
    setCurrentPage(1);
  }, []);

  const toggleCountryFilter = useCallback((countryKey: string) => {
    setCountryFilters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(countryKey)) {
        newSet.delete(countryKey);
      } else {
        newSet.add(countryKey);
      }
      return newSet;
    });
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = protocolFilters.size > 0 || googleAccessFilter !== "all" || countryFilters.size > 0 || searchQuery !== "";

  const rawApiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (countryFilters.size > 0) {
      params.set("country", Array.from(countryFilters).join(","));
    }
    if (protocolFilters.size > 0) {
      params.set("protocol", Array.from(protocolFilters).join(","));
    }
    if (googleAccessFilter === "yes") {
      params.set("google", "true");
    } else if (googleAccessFilter === "no") {
      params.set("google", "false");
    }
    const q = params.toString();
    return `/api/raw${q ? "?" + q : ""}`;
  }, [countryFilters, protocolFilters, googleAccessFilter]);

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown className={getSortIconClassName(field)} />;
    return sortDirection === "asc" ? <ChevronUp className={getSortIconClassName(field)} /> : <ChevronDown className={getSortIconClassName(field)} />;
  };

  const toolbarSurfaceClassName = "p-0";
  const filterTriggerClassName = "inline-flex h-9 min-w-[80px] items-center justify-center gap-2 rounded-md border-0 bg-transparent px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-0 data-[popup-open]:bg-muted/50 data-[popup-open]:text-foreground";
  const exportTriggerClassName = "inline-flex h-9 min-w-[80px] items-center justify-center gap-2 rounded-md border-0 bg-transparent px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-0 data-[popup-open]:bg-muted/50 data-[popup-open]:text-foreground";
  const searchInputClassName = "pl-9 h-9 rounded-md border-0 bg-muted/35 text-sm shadow-none transition-colors placeholder:text-muted-foreground/80 focus-visible:border-transparent focus-visible:ring-0 font-mono";
  const sortButtonClassName = "group flex h-8 w-full items-center gap-2 rounded-none border-0 bg-transparent p-0 text-left text-xs font-semibold text-muted-foreground shadow-none outline-none transition-colors hover:bg-transparent hover:text-foreground focus-visible:outline-none focus-visible:ring-0";
  const sectionMotionClassName = "";
  const cardMotionClassName = "";
  const isRefreshing = isLoading && data.length > 0;

  const validCount = data.filter((p) => p.is_valid).length;
  const googleCount = data.filter((p) => p.is_google).length;
  const countryStats = useMemo(() => {
    const grouped = new Map<
      string,
      {
        countryCode: string | null;
        displayName: string;
        fastestSpeedMs: number;
        googleCount: number;
        key: string;
        latestCheckedAt: string;
        protocolCounts: Map<string, number>;
        proxyCount: number;
        speedTotalMs: number;
      }
    >();

    for (const item of baseFilteredData) {
      const key = normalizeCountryName(item.country_name);

      if (!key) {
        continue;
      }

      const existing = grouped.get(key);

      if (existing) {
        existing.proxyCount += 1;
        existing.googleCount += item.is_google ? 1 : 0;
        existing.speedTotalMs += item.speed_ms;
        existing.fastestSpeedMs = Math.min(existing.fastestSpeedMs, item.speed_ms);
        existing.protocolCounts.set(item.protocol.toUpperCase(), (existing.protocolCounts.get(item.protocol.toUpperCase()) ?? 0) + 1);

        if (!existing.countryCode && item.country_code) {
          existing.countryCode = item.country_code;
        }

        if (new Date(item.checked_at).getTime() > new Date(existing.latestCheckedAt).getTime()) {
          existing.latestCheckedAt = item.checked_at;
        }

        continue;
      }

      grouped.set(key, {
        key,
        displayName: key,
        countryCode: item.country_code,
        fastestSpeedMs: item.speed_ms,
        googleCount: item.is_google ? 1 : 0,
        latestCheckedAt: item.checked_at,
        protocolCounts: new Map([[item.protocol.toUpperCase(), 1]]),
        proxyCount: 1,
        speedTotalMs: item.speed_ms,
      });
    }

    return Array.from(grouped.values())
      .map((item) => ({
        averageSpeedMs: Math.round(item.speedTotalMs / Math.max(item.proxyCount, 1)),
        countryCode: item.countryCode,
        displayName: item.displayName,
        fastestSpeedMs: item.fastestSpeedMs,
        googleCount: item.googleCount,
        key: item.key,
        latestCheckedAt: formatDistanceToNow(new Date(item.latestCheckedAt), { addSuffix: true }),
        protocolCounts: Array.from(item.protocolCounts.entries())
          .map(([protocol, count]) => ({ protocol, count }))
          .sort((a, b) => b.count - a.count),
        proxyCount: item.proxyCount,
      }))
      .sort((a, b) => b.proxyCount - a.proxyCount);
  }, [baseFilteredData]);
  const mapRecords = useMemo(() => {
    return baseFilteredData
      .map((item) => {
        const countryKey = normalizeCountryName(item.country_name);

        if (!countryKey) {
          return null;
        }

        return {
          asn: item.asn,
          checkedAt: item.checked_at,
          countryCode: item.country_code,
          countryKey,
          countryName: item.country_name,
          id: item.id,
          ip: item.ip,
          isGoogle: item.is_google,
          organization: item.organization,
          port: item.port,
          protocol: item.protocol,
          speedMs: item.speed_ms,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [baseFilteredData]);
  const selectedCountryStat = useMemo(() => {
    return selectedCountryKey ? (countryStats.find((item) => item.key === selectedCountryKey) ?? null) : null;
  }, [selectedCountryKey, countryStats]);
  const getSortLabelClassName = (field: SortField) => cn("transition-colors group-hover:text-foreground", sortField === field ? "text-foreground underline underline-offset-4 decoration-1" : "text-muted-foreground");
  const getSortIconClassName = (field: SortField) => cn("ml-2 h-3 w-3 transition-opacity", sortField === field ? "opacity-100 text-foreground" : "opacity-45 group-hover:opacity-70");

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 font-sans text-foreground selection:bg-primary/20">
      <div className="w-full max-w-[90vw] mx-auto space-y-6">
        {/* Header Section */}
        <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8", sectionMotionClassName)}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">Free Proxy Checker</h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-[600px]">Check free proxies by speed, location, and Google access.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              Last sync: {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
              {isRefreshing && <span className="ui-pulse-dot inline-flex h-1.5 w-1.5 rounded-full bg-primary" />}
            </span>
            <Link href="/stats">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs transition-colors hover:bg-muted font-medium"
              >
                <BarChart3 className="h-3.5 w-3.5 mr-2" />
                Statistics
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs transition-colors hover:bg-muted font-medium"
              onClick={fetchProxies}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {loadError && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-start gap-3 px-4 py-3 text-sm text-destructive">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{loadError}</div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            className={cn("bg-card/70 border-border/50 transition-colors duration-200 hover:border-border", cardMotionClassName)}
            style={{ animationDelay: "80ms" }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Valid Proxies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{validCount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">Working proxies</div>
            </CardContent>
          </Card>
          <Card
            className={cn("bg-card/70 border-border/50 transition-colors duration-200 hover:border-border", cardMotionClassName)}
            style={{ animationDelay: "140ms" }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Google Accessible</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-4 h-4 opacity-80"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{googleCount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">Can reach Google</div>
            </CardContent>
          </Card>
          <Card
            className={cn("bg-card/70 border-border/50 transition-colors duration-200 hover:border-border", cardMotionClassName)}
            style={{ animationDelay: "200ms" }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">System Status</CardTitle>
              <div className="inline-flex h-3 w-3 rounded-full bg-green-500/90 ring-2 ring-green-500/20"></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-foreground">Online</div>
              <div className="text-xs text-muted-foreground mt-1">Background checks are running</div>
            </CardContent>
          </Card>
        </div>

        <div
          className={sectionMotionClassName}
          style={{ animationDelay: "230ms" }}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-2xl border border-border/50 bg-card/80 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-foreground">Browse Results</div>
              <div className="text-xs text-muted-foreground">View checked proxies in a table or on the map.</div>
            </div>
            <div className="inline-flex items-center rounded-lg border border-border/50 bg-background/60 p-1">
              <Button
                type="button"
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className={cn("h-8 rounded-md px-3 text-xs", viewMode === "list" ? "shadow-none" : "text-muted-foreground")}
                onClick={() => setViewMode("list")}
              >
                Table
              </Button>
              <Button
                type="button"
                variant={viewMode === "map" ? "secondary" : "ghost"}
                size="sm"
                className={cn("h-8 rounded-md px-3 text-xs", viewMode === "map" ? "shadow-none" : "text-muted-foreground")}
                onClick={() => setViewMode("map")}
              >
                Map
              </Button>
            </div>
          </div>
        </div>

        {viewMode === "map" ? (
          <div
            className={sectionMotionClassName}
            style={{ animationDelay: "240ms" }}
          >
            <ProxyMapView
              countryStats={countryStats}
              records={mapRecords}
              selectedCountryKey={selectedCountryKey}
              onSelectCountry={(countryKey: string | null) => {
                if (countryKey) {
                  toggleCountryFilter(countryKey);
                } else {
                  setCountryFilters(new Set());
                }
              }}
            />
          </div>
        ) : null}

        {/* Main Table Card */}
        {viewMode === "list" ? (
          <Card
            className={cn("relative border-border/50 bg-card/85", cardMotionClassName)}
            style={{ animationDelay: "260ms" }}
          >
            <div className={cn("pointer-events-none absolute inset-x-4 top-0 h-px overflow-hidden rounded-full opacity-0 transition-opacity duration-300", isRefreshing && "opacity-100")}>
              <div className="ui-loading-bar h-full w-full" />
            </div>
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold tracking-tight">Records</CardTitle>
                </div>
                <Badge
                  variant="secondary"
                  className="font-sans px-2.5 py-0.5"
                >
                  {filteredAndSortedData.length} visible results
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {/* Filters & Search */}
                <div className={toolbarSurfaceClassName}>
                  <div className="flex flex-col md:flex-row md:items-center gap-1.5">
                    <div className="relative flex-1 min-w-0 md:min-w-[320px]">
                      <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search IP, Port, Country, ASN..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        className={searchInputClassName}
                        aria-label="Search proxies"
                      />
                    </div>

                    {/* Protocol Filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger className={filterTriggerClassName}>
                        <Filter className="h-3.5 w-3.5" />
                        Protocol
                        {protocolFilters.size > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-1.5 h-4 w-4 rounded-sm p-0 flex items-center justify-center"
                          >
                            {protocolFilters.size}
                          </Badge>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-40"
                      >
                        {["HTTP", "HTTPS", "SOCKS4", "SOCKS5"].map((protocol) => (
                          <DropdownMenuCheckboxItem
                            key={protocol}
                            checked={protocolFilters.has(protocol)}
                            onCheckedChange={() => toggleProtocolFilter(protocol)}
                            className="text-xs font-medium"
                          >
                            {protocol}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Google Access Filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(filterTriggerClassName, "min-w-[110px]")}>
                        <Globe className="h-3.5 w-3.5" />
                        Google Access
                        {googleAccessFilter !== "all" && (
                          <Badge
                            variant="secondary"
                            className="ml-1.5 h-4 w-4 rounded-sm p-0 flex items-center justify-center"
                          >
                            1
                          </Badge>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-40"
                      >
                        <DropdownMenuCheckboxItem
                          checked={googleAccessFilter === "all"}
                          onCheckedChange={() => {
                            setGoogleAccessFilter("all");
                            setCurrentPage(1);
                          }}
                          className="text-xs font-medium"
                        >
                          All
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={googleAccessFilter === "yes"}
                          onCheckedChange={() => {
                            setGoogleAccessFilter("yes");
                            setCurrentPage(1);
                          }}
                          className="text-xs font-medium"
                        >
                          Accessible
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={googleAccessFilter === "no"}
                          onCheckedChange={() => {
                            setGoogleAccessFilter("no");
                            setCurrentPage(1);
                          }}
                          className="text-xs font-medium"
                        >
                          Block
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Country Filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(filterTriggerClassName, "min-w-[84px]")}>
                        <MapPinned className="h-3.5 w-3.5" />
                        Country
                        {countryFilters.size > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-1.5 h-4 w-4 rounded-sm p-0 flex items-center justify-center"
                          >
                            {countryFilters.size}
                          </Badge>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56 max-h-[300px] overflow-y-auto scrollbar-hide"
                      >
                        <DropdownMenuItem
                          onClick={() => {
                            setCountryFilters(new Set());
                            setCurrentPage(1);
                          }}
                          className="text-xs font-medium cursor-pointer"
                        >
                          All Countries
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {countryStats.map((stat) => (
                          <DropdownMenuCheckboxItem
                            key={stat.key}
                            checked={countryFilters.has(stat.key)}
                            onCheckedChange={() => toggleCountryFilter(stat.key)}
                            className="text-xs font-medium"
                          >
                            <span className="flex items-center gap-2 w-full">
                              <div className="shrink-0 w-4 h-3 relative">
                                {getCountryFlagAssetUrl(stat.countryCode) ? (
                                  <Image
                                    src={getCountryFlagAssetUrl(stat.countryCode)!}
                                    alt={stat.countryCode || ""}
                                    fill
                                    className="object-contain"
                                  />
                                ) : (
                                  <span className="text-[10px]">🌐</span>
                                )}
                              </div>
                              <div className="flex-1 flex items-center justify-between min-w-0">
                                <span className="truncate text-xs font-medium">{stat.displayName}</span>
                                <span className="text-[10px] text-muted-foreground font-mono ml-2">
                                  {stat.proxyCount}
                                </span>
                              </div>
                            </span>
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {selectedCountryStat && !hasActiveFilters && (
                      <Badge
                        variant="outline"
                        className="inline-flex h-9 items-center gap-2 rounded-md border-zinc-700/70 bg-zinc-900/70 px-3 text-xs font-medium text-zinc-200"
                      >
                        <MapPinned className="h-3.5 w-3.5" />
                        {selectedCountryStat.displayName}
                      </Badge>
                    )}

                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="gap-1 h-9 rounded-md border-0 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-0"
                        aria-label="Clear all filters"
                      >
                        <X className="h-3.5 w-3.5" />
                        Clear
                      </Button>
                    )}

                    {/* Export Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(exportTriggerClassName, "md:ml-auto")}>
                        <Download className="h-3.5 w-3.5" />
                        <span>Export</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56"
                      >
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtered View (Current)</div>
                        <DropdownMenuItem
                          onClick={() => handleExport("csv", false)}
                          className="text-xs cursor-pointer font-medium"
                        >
                          Export as CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleExport("txt", false)}
                          className="text-xs cursor-pointer font-medium"
                        >
                          Export as TXT (IP:Port)
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Raw API Endpoint</div>
                        <DropdownMenuItem
                          onClick={() => window.open(rawApiUrl, "_blank", "noreferrer")}
                          className="text-xs cursor-pointer font-medium"
                        >
                          Open Filtered API URL
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.origin + rawApiUrl);
                          }}
                          className="text-xs cursor-pointer font-medium"
                        >
                          Copy Filtered API URL
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="rounded-md border border-border/50 bg-background/50">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-transparent">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[140px]">
                            <button
                              type="button"
                              onClick={() => handleSort("ip")}
                              className={cn(sortButtonClassName, "justify-start")}
                            >
                              <span className={cn(getSortLabelClassName("ip"), "inline-flex items-center gap-1.5")}>
                                <Globe className="h-3.5 w-3.5 opacity-70" />
                                IP Address
                              </span>
                              <SortIcon field="ip" />
                            </button>
                          </TableHead>

                          <TableHead className="w-[80px]">
                            <button
                              type="button"
                              onClick={() => handleSort("port")}
                              className={cn(sortButtonClassName, "justify-start")}
                            >
                              <span className={cn(getSortLabelClassName("port"), "inline-flex items-center gap-1.5")}>
                                Port
                              </span>
                              <SortIcon field="port" />
                            </button>
                          </TableHead>

                          <TableHead className="w-[140px]">
                            <button
                              type="button"
                              onClick={() => handleSort("country_name")}
                              className={cn(sortButtonClassName, "justify-start")}
                            >
                              <span className={cn(getSortLabelClassName("country_name"), "inline-flex items-center gap-1.5")}>
                                <MapPinned className="h-3.5 w-3.5 opacity-70" />
                                Country
                              </span>
                              <SortIcon field="country_name" />
                            </button>
                          </TableHead>

                          <TableHead className="w-[120px]">
                            <button
                              type="button"
                              onClick={() => handleSort("protocol")}
                              className={cn(sortButtonClassName, "justify-start")}
                            >
                              <span className={cn(getSortLabelClassName("protocol"), "inline-flex items-center gap-1.5")}>
                                <Fingerprint className="h-3.5 w-3.5 opacity-70" />
                                Protocol
                              </span>
                              <SortIcon field="protocol" />
                            </button>
                          </TableHead>

                          {/* ORG & ASN (統一) */}
                          <TableHead className="">
                            <button
                              type="button"
                              onClick={() => handleSort("organization")}
                              className={cn(sortButtonClassName, "justify-start w-full")}
                            >
                              <span className={cn(getSortLabelClassName("organization"), "inline-flex items-center gap-1.5")}>
                                <ShieldCheck className="h-3.5 w-3.5 opacity-70 shrink-0" />
                                <span>ORG & ASN</span>
                              </span>
                              <SortIcon field="organization" />
                            </button>
                          </TableHead>

                          <TableHead className="w-[120px]">
                            <button
                              type="button"
                              onClick={() => handleSort("speed_ms")}
                              className={cn(sortButtonClassName, "justify-start")}
                            >
                              <span className={cn(getSortLabelClassName("speed_ms"), "inline-flex items-center gap-1.5")}>
                                <Gauge className="h-3.5 w-3.5 opacity-70" />
                                Speed
                              </span>
                              <SortIcon field="speed_ms" />
                            </button>
                          </TableHead>

                          {/* Google (統一) */}
                          <TableHead className="w-[110px]">
                            <button
                              type="button"
                              onClick={() => handleSort("is_google")}
                              className={cn(sortButtonClassName, "justify-start")}
                            >
                              <span className={cn(getSortLabelClassName("is_google"), "inline-flex items-center gap-1.5")}>
                                <GoogleMonoIcon className="h-3.5 w-3.5 opacity-70" />
                                Google
                              </span>
                              <SortIcon field="is_google" />
                            </button>
                          </TableHead>

                          <TableHead className="w-[120px] text-right">
                            <button
                              type="button"
                              onClick={() => handleSort("checked_at")}
                              className={cn(sortButtonClassName, "justify-end")}
                            >
                              <span className={cn(getSortLabelClassName("checked_at"), "inline-flex items-center gap-1.5")}>
                                <Clock3 className="h-3.5 w-3.5 opacity-70" />
                                Updated
                              </span>
                              <SortIcon field="checked_at" />
                            </button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {isLoading && data.length === 0 ? (
                          <TableSkeleton />
                        ) : paginatedData.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="h-32 text-center text-sm text-muted-foreground"
                            >
                              No proxies found matching your criteria.
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedData.map((proxy) => (
                            <TableRow
                              key={proxy.id}
                              className="group transition-all duration-200 hover:bg-muted/40 cursor-default"
                            >
                              <TableCell className="w-[140px] font-mono tabular-nums text-sm font-medium text-foreground">{proxy.ip}</TableCell>

                              <TableCell className="w-[80px] font-mono tabular-nums text-xs text-muted-foreground">{proxy.port}</TableCell>

                              <TableCell className="w-[140px]">
                                <div className="flex items-center gap-2 min-w-0">
                                  {getCountryFlagAssetUrl(proxy.country_code) ? (
                                    <Image
                                      src={getCountryFlagAssetUrl(proxy.country_code) ?? ""}
                                      alt={proxy.country_name ?? proxy.country_code ?? "Unknown country"}
                                      width={16}
                                      height={16}
                                      className="h-4 w-4 shrink-0 rounded-[2px]"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span
                                      className="text-base leading-none"
                                      style={{ fontFamily: emojiFontFamily }}
                                      role="img"
                                      aria-label={proxy.country_name ?? proxy.country_code ?? "Unknown country"}
                                    >
                                      {getCountryFlagEmoji(proxy.country_code)}
                                    </span>
                                  )}

                                  <div className="min-w-0">
                                    <div className="text-xs font-medium text-foreground truncate">{normalizeCountryName(proxy.country_name) ?? "Unknown"}</div>
                                    <div className="text-[11px] text-muted-foreground truncate">{proxy.country_code ?? "N/A"}</div>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="w-[120px]">
                                <Badge
                                  variant="outline"
                                  className="font-medium text-[10.5px] py-0 px-2 uppercase bg-background transition-colors group-hover:bg-muted"
                                >
                                  {proxy.protocol}
                                </Badge>
                              </TableCell>

                              <TableCell className="">
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-foreground truncate">{proxy.organization ?? "Unknown network"}</div>
                                  <div className="text-[11px] text-muted-foreground truncate">{proxy.asn ?? "ASN unavailable"}</div>
                                </div>
                              </TableCell>

                              <TableCell>
                                <SpeedIndicator speed={proxy.speed_ms} />
                              </TableCell>

                              <TableCell>
                                {proxy.is_google ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 border-emerald-500/15 text-[10px] py-0 px-1.5 shadow-sm shadow-emerald-500/5 group-hover:bg-emerald-500/14 transition-colors font-medium"
                                  >
                                    <ShieldCheck className="w-3 h-3 mr-1" />
                                    Accessible
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] py-0 px-1.5 shadow-sm shadow-destructive/10 group-hover:bg-destructive/20 transition-colors font-medium"
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Blocked
                                  </Badge>
                                )}
                              </TableCell>

                              <TableCell className="w-[120px] text-xs text-muted-foreground text-right group-hover:text-foreground transition-colors">
                                {formatDistanceToNow(new Date(proxy.checked_at), {
                                  addSuffix: true,
                                })}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <div className="text-xs text-muted-foreground font-medium">
                    Showing {paginatedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredAndSortedData.length)} of <span className="text-foreground">{filteredAndSortedData.length}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 transition-colors hover:bg-muted"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 transition-colors hover:bg-muted"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "ghost"}
                            size="icon"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`h-8 w-8 text-xs font-medium ${currentPage === pageNum ? "shadow-sm" : "hover:bg-muted"}`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 transition-colors hover:bg-muted"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 transition-colors hover:bg-muted"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default ProxyDashboard;
