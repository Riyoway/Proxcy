import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Stats — Global proxy statistics",
  description: `Live ${siteConfig.name} statistics: country distribution, latency buckets, protocol breakdown, organization mix, and Google reachability across the live proxy pool.`,
  alternates: { canonical: "/stats" },
};

export default function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
