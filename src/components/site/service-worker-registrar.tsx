"use client";

import { useEffect } from "react";

/**
 * Registers the service worker once on first client-side mount.
 * Skipped in dev to avoid HMR cache headaches.
 */
export const ServiceWorkerRegistrar: React.FC = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      const cleanupDevServiceWorkers = async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames
              .filter((name) => name.startsWith("proxcy-"))
              .map((name) => caches.delete(name)),
          );
        }
      };

      cleanupDevServiceWorkers().catch(() => undefined);
      return;
    }

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
