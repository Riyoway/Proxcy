import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Dashboard",
  description: `Live ${siteConfig.name} dashboard. Filter and inspect free HTTP, HTTPS, SOCKS4, and SOCKS5 proxies in real time, with country, latency, and Google reachability data.`,
  alternates: { canonical: "/dashboard" },
  robots: {
    index: true,
    follow: true,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
