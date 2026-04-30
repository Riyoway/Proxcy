"use client";

import { useEffect } from "react";

/**
 * Registers the service worker once on first client-side mount.
 * Skipped in dev to avoid HMR cache headaches.
 */
export const ServiceWorkerRegistrar: React.FC = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
      } catch {
        // ignore — PWA install is a progressive enhancement
      }
    };

    void register();
  }, []);

  return null;
};
