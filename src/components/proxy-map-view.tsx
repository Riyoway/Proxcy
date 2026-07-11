"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  geoCentroid,
  geoContains,
  geoDistance,
  geoGraticule10,
  geoInterpolate,
  geoMercator,
  geoOrthographic,
  geoPath,
  type GeoProjection,
} from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { Globe2, Map as MapIcon, Minus, Plus, RotateCcw } from "lucide-react";
import worldAtlas from "world-atlas/countries-110m.json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { normalizeCountryName } from "@/lib/country";

// One proxy record — the map derives every aggregate from these client-side,
// since the dataset has no lat/lng (proxies are placed at country centroids).
export interface MapProxy {
  id: string;
  ip: string;
  port: number;
  protocol: string;
  speed_ms: number;
  is_valid: boolean;
  is_google: boolean;
  anonymity_level: "transparent" | "anonymous" | "elite" | null;
  country_code: string | null;
  country_name: string | null;
  asn: string | null;
  organization: string | null;
  checked_at: string;
}

type ProxyMapViewProps = {
  records: MapProxy[];
  selectedCountryKey: string | null;
  onSelectCountry: (countryKey: string | null) => void;
  selectedProxy: MapProxy | null;
  onSelectProxy: (proxy: MapProxy | null) => void;
};

type MapMode = "2d" | "3d";
type CountryFeature = Feature<Geometry, { name?: string }>;
type LngLat = [number, number];

// Pacific-rim framing so both the Tokyo and US beacons are visible at once,
// with the cross-Pacific checker/google traffic flowing between them.
const INITIAL_ROTATION: [number, number, number] = [160, -18, 0];
const DRAG_SENSITIVITY = 0.25;
const TAP_MOVE_THRESHOLD = 6;
const PULSE_SPEED = 0.16; // fraction of the line traversed per second

// Everything on the map is monochrome; color is reserved exclusively for the
// animated request pulses, so the moving traffic is the only thing that pops.
const PULSE_CHECKER = "#38bdf8"; // cyan — checker flow (Tokyo → proxies)
const PULSE_GOOGLE = "#fbbf24"; // amber — Google-reachability flow (US → proxies)
const HUB_COLOR = "#e4e4e7"; // monochrome hub markers
const LAT_COLORS = ["#e4e4e7", "#a1a1aa", "#8b8b93", "#5c5c63"]; // fast → slow (brightness = speed)
const LAT_LABELS = ["≤500 ms", "≤1500 ms", "≤3000 ms", ">3000 ms"];
const SIZE_LABELS = ["1–10", "11–100", "101–500", "501–1000", "1000+"];
const SIZE_RADII = [4, 6.5, 9.5, 13, 17];

// --- Module-scope geometry (parsed once on the client) --------------------
const worldCollection = feature(
  worldAtlas as never,
  (worldAtlas as unknown as { objects: { countries: never } }).objects.countries,
) as unknown as FeatureCollection<Geometry, { name?: string }>;

const preparedFeatures = worldCollection.features.map((featureItem) => ({
  key: normalizeCountryName((featureItem as CountryFeature).properties?.name ?? null),
  feature: featureItem as CountryFeature,
}));

const featureByKey = new Map<string, CountryFeature>();
const centroidByKey = new Map<string, LngLat>();
for (const entry of preparedFeatures) {
  if (entry.key && !featureByKey.has(entry.key)) {
    featureByKey.set(entry.key, entry.feature);
    centroidByKey.set(entry.key, geoCentroid(entry.feature) as LngLat);
  }
}

const graticule = geoGraticule10();

// Checker runs from Tokyo; the Google-reachability probe runs from the US.
const CHECKER_COORD: LngLat = [139.69, 35.68]; // Tokyo
const GOOGLE_COORD: LngLat = centroidByKey.get("United States") ?? [-98, 39];

const mercatorFrame: Feature<Geometry> = {
  type: "Feature",
  properties: null,
  geometry: {
    type: "Polygon",
    coordinates: [[[-180, -60], [-180, 79], [180, 79], [180, -60], [-180, -60]]],
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashUnit(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return (hash % 10000) / 10000;
}

// 2D connection curve: a quadratic bezier between the two projected points that
// bulges toward the map center, so lines stay inside the flat map (no great-circle
// pole bulges or antimeridian streaks). Returns null for lines that wrap the edge.
function bezier2D(fromP: [number, number], hubP: [number, number], w: number, h: number): { cx: number; cy: number } | null {
  if (Math.abs(fromP[0] - hubP[0]) > w * 0.5) return null;
  const mx = (fromP[0] + hubP[0]) / 2;
  const my = (fromP[1] + hubP[1]) / 2;
  const dx = hubP[0] - fromP[0];
  const dy = hubP[1] - fromP[1];
  const dist = Math.hypot(dx, dy) || 1;
  const off = Math.min(dist * 0.2, 70);
  let px = -dy / dist;
  let py = dx / dist;
  if (px * (w / 2 - mx) + py * (h / 2 - my) < 0) {
    px = -px;
    py = -py;
  }
  return { cx: mx + px * off, cy: my + py * off };
}

function bezPoint(P0: [number, number], C: [number, number], P1: [number, number], t: number): [number, number] {
  const u = 1 - t;
  return [u * u * P0[0] + 2 * u * t * C[0] + t * t * P1[0], u * u * P0[1] + 2 * u * t * C[1] + t * t * P1[1]];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function latencyBand(ms: number): number {
  if (ms <= 500) return 0;
  if (ms <= 1500) return 1;
  if (ms <= 3000) return 2;
  return 3;
}

function countRadius(count: number): number {
  if (count <= 10) return SIZE_RADII[0];
  if (count <= 100) return SIZE_RADII[1];
  if (count <= 500) return SIZE_RADII[2];
  if (count <= 1000) return SIZE_RADII[3];
  return SIZE_RADII[4];
}

function getCountryFlagAssetUrl(countryCode: string | null): string | null {
  if (!countryCode || countryCode.length !== 2) return null;
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => (127397 + char.charCodeAt(0)).toString(16));
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${codePoints.join("-")}.svg`;
}

function formatUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

type CountryAgg = {
  key: string;
  displayName: string;
  countryCode: string | null;
  centroid: LngLat;
  count: number;
  validCount: number;
  googleCount: number;
  medianLatency: number;
  googleRate: number;
  latBand: number;
  representative: MapProxy;
  dots: Array<{ record: MapProxy; coord: LngLat }>;
};

export function ProxyMapView({ records, selectedCountryKey, onSelectCountry, selectedProxy, onSelectProxy }: ProxyMapViewProps) {
  const [mode, setMode] = useState<MapMode>("3d");
  const [size, setSize] = useState({ w: 0, h: 0 });

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseDirtyRef = useRef(true);
  const rotationRef = useRef<[number, number, number]>([...INITIAL_ROTATION]);
  const viewRef = useRef({ z: 1, tx: 0, ty: 0 });
  const pointerRef = useRef({ moved: false, lastX: 0, lastY: 0, button: 0 });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number } | null>(null);
  const zoomAtRef = useRef<(factor: number, fx: number, fy: number) => void>(() => {});

  // --- Aggregation ---------------------------------------------------------
  const { countries, topCountries, summary, lines } = useMemo(() => {
    const map = new Map<
      string,
      { key: string; displayName: string; countryCode: string | null; count: number; validCount: number; googleCount: number; speeds: number[]; sample: MapProxy[]; rep: MapProxy | null }
    >();
    const codes = new Set<string>();
    const allSpeeds: number[] = [];
    let valid = 0;
    let google = 0;
    let elite = 0;

    for (const r of records) {
      const key = normalizeCountryName(r.country_name);
      if (r.is_valid) valid += 1;
      if (r.is_google) google += 1;
      if (r.anonymity_level === "elite") elite += 1;
      if (r.country_code) codes.add(r.country_code.toUpperCase());
      allSpeeds.push(r.speed_ms);
      if (!key || !centroidByKey.has(key)) continue;

      let entry = map.get(key);
      if (!entry) {
        entry = { key, displayName: r.country_name ?? key, countryCode: r.country_code, count: 0, validCount: 0, googleCount: 0, speeds: [], sample: [], rep: null };
        map.set(key, entry);
      }
      entry.count += 1;
      if (r.is_valid) entry.validCount += 1;
      if (r.is_google) entry.googleCount += 1;
      entry.speeds.push(r.speed_ms);
      if (!entry.countryCode && r.country_code) entry.countryCode = r.country_code;
      if (entry.sample.length < 7) entry.sample.push(r);
      if (r.is_valid && (!entry.rep || r.speed_ms < entry.rep.speed_ms)) entry.rep = r;
    }

    const countries: CountryAgg[] = [];
    for (const entry of map.values()) {
      const centroid = centroidByKey.get(entry.key)!;
      const med = median(entry.speeds);
      const dots = entry.sample.map((record) => ({
        record,
        coord: [
          centroid[0] + (hashUnit(`${record.id}:x`) - 0.5) * 7,
          centroid[1] + (hashUnit(`${record.id}:y`) - 0.5) * 5,
        ] as LngLat,
      }));
      countries.push({
        key: entry.key,
        displayName: entry.displayName,
        countryCode: entry.countryCode,
        centroid,
        count: entry.count,
        validCount: entry.validCount,
        googleCount: entry.googleCount,
        medianLatency: med,
        googleRate: entry.validCount > 0 ? entry.googleCount / entry.validCount : 0,
        latBand: latencyBand(med),
        representative: entry.rep ?? entry.sample[0],
        dots,
      });
    }
    countries.sort((a, b) => b.count - a.count);

    // Connection lines: two disjoint samples of ~100 proxies, one flow each.
    const withCoord = records.filter((r) => {
      const k = normalizeCountryName(r.country_name);
      return k && centroidByKey.has(k);
    });
    const ranked = [...withCoord].sort((a, b) => hashUnit(a.id) - hashUnit(b.id));
    const buildLines = (subset: MapProxy[], hub: LngLat, kind: "checker" | "google") =>
      subset.map((r) => {
        const c = centroidByKey.get(normalizeCountryName(r.country_name)!)!;
        const from: LngLat = [c[0] + (hashUnit(`${r.id}:lx`) - 0.5) * 6, c[1] + (hashUnit(`${r.id}:ly`) - 0.5) * 4];
        return { from, hub, interp: geoInterpolate(from, hub), phase: hashUnit(`${r.id}:p`), kind };
      });
    const lines = [
      ...buildLines(ranked.slice(0, 100), CHECKER_COORD, "checker"),
      ...buildLines(ranked.slice(100, 200), GOOGLE_COORD, "google"),
    ];

    const summary = {
      countries: codes.size,
      valid,
      google,
      medianLatency: median(allSpeeds),
      elite,
    };

    return { countries, topCountries: countries.slice(0, 12), summary, lines };
  }, [records]);

  const countryByKey = useMemo(() => new Map(countries.map((c) => [c.key, c])), [countries]);
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const allDots = useMemo(() => countries.flatMap((c) => c.dots), [countries]);
  const maxTop = topCountries[0]?.count ?? 1;

  // --- Projection ----------------------------------------------------------
  const projection = useMemo<GeoProjection | null>(() => {
    if (size.w === 0 || size.h === 0) return null;
    if (mode === "3d") {
      const padded: [[number, number], [number, number]] = [[10, 10], [size.w - 10, size.h - 10]];
      return geoOrthographic().rotate(rotationRef.current).fitExtent(padded, { type: "Sphere" }).clipAngle(90);
    }
    const proj = geoMercator();
    proj.fitWidth(size.w, mercatorFrame);
    const wScale = proj.scale();
    proj.fitHeight(size.h, mercatorFrame);
    const hScale = proj.scale();
    proj.scale(Math.max(wScale, hScale)).translate([0, 0]);
    const [[bx0, by0], [bx1, by1]] = geoPath(proj).bounds(mercatorFrame);
    proj.translate([size.w / 2 - (bx0 + bx1) / 2, size.h / 2 - (by0 + by1) / 2]);
    return proj;
  }, [mode, size]);

  const applyTransform = useCallback(
    (ctx: CanvasRenderingContext2D, dpr: number) => {
      const v = viewRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.translate(v.tx, v.ty);
      ctx.scale(v.z, v.z);
    },
    [],
  );

  const visible = useCallback(
    (coord: LngLat) => {
      if (mode !== "3d") return true;
      const rot = rotationRef.current;
      return geoDistance(coord, [-rot[0], -rot[1]]) <= Math.PI / 2;
    },
    [mode],
  );

  // --- Static base layer (offscreen; rebuilt only on real changes) ---------
  const buildBaseRef = useRef<() => void>(() => {});
  buildBaseRef.current = () => {
    const proj = projection;
    if (!proj || size.w === 0) return;
    let base = baseCanvasRef.current;
    if (!base) {
      base = document.createElement("canvas");
      baseCanvasRef.current = base;
    }
    const dpr = window.devicePixelRatio || 1;
    if (base.width !== size.w * dpr || base.height !== size.h * dpr) {
      base.width = size.w * dpr;
      base.height = size.h * dpr;
    }
    const ctx = base.getContext("2d");
    if (!ctx) return;
    const v = viewRef.current;
    const iz = 1 / v.z;
    if (mode === "3d") proj.rotate(rotationRef.current);
    const path = geoPath(proj, ctx);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, base.width, base.height);
    if (mode === "2d") {
      ctx.scale(dpr, dpr);
      const bg = ctx.createLinearGradient(0, 0, 0, size.h);
      bg.addColorStop(0, "#0a0e14");
      bg.addColorStop(1, "#06080c");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size.w, size.h);
    } else {
      // 3D: deep-space backdrop (viewport-fixed, behind the globe)
      ctx.scale(dpr, dpr);
      const bg = ctx.createRadialGradient(size.w / 2, size.h * 0.42, 0, size.w / 2, size.h / 2, Math.max(size.w, size.h) * 0.72);
      bg.addColorStop(0, "#0b0d13");
      bg.addColorStop(1, "#050506");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size.w, size.h);
    }
    applyTransform(ctx, dpr);

    // Sphere (globe)
    if (mode === "3d") {
      ctx.beginPath();
      path({ type: "Sphere" });
      const [cx, cy] = proj.translate();
      const r = proj.scale();
      const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
      g.addColorStop(0, "#0c1826");
      g.addColorStop(1, "#04060a");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 0.7 * iz;
      ctx.strokeStyle = "rgba(148,163,184,0.16)";
      ctx.stroke();
    }

    // Graticule (subtle grid)
    ctx.beginPath();
    path(graticule);
    ctx.lineWidth = 0.4 * iz;
    ctx.strokeStyle = "rgba(148,163,184,0.05)";
    ctx.stroke();

    // Countries
    for (const { key, feature: f } of preparedFeatures) {
      const isSel = key !== null && key === selectedCountryKey;
      const hasData = key !== null && countryByKey.has(key);
      ctx.beginPath();
      path(f);
      ctx.fillStyle = isSel ? "rgba(228,228,231,0.12)" : hasData ? "rgba(148,163,184,0.09)" : "rgba(148,163,184,0.045)";
      ctx.fill();
      ctx.lineWidth = (isSel ? 0.8 : 0.4) * iz;
      ctx.strokeStyle = isSel ? "rgba(228,228,231,0.55)" : "rgba(148,163,184,0.14)";
      ctx.stroke();
    }

    // Faint connection arcs
    ctx.lineWidth = 0.5 * iz;
    ctx.strokeStyle = "rgba(148,163,184,0.09)";
    for (const line of lines) {
      if (mode === "2d") {
        const fromP = proj(line.from);
        const hubP = proj(line.hub);
        if (!fromP || !hubP) continue;
        const b = bezier2D(fromP, hubP, size.w, size.h);
        if (!b) continue;
        ctx.beginPath();
        ctx.moveTo(fromP[0], fromP[1]);
        ctx.quadraticCurveTo(b.cx, b.cy, hubP[0], hubP[1]);
        ctx.stroke();
        continue;
      }
      // 3D: great-circle arc, clipped to the visible hemisphere
      if (!visible(line.from) && !visible(line.hub)) continue;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= 16; i += 1) {
        const pt = line.interp(i / 16);
        if (!visible(pt)) {
          started = false;
          continue;
        }
        const p = proj(pt);
        if (!p) {
          started = false;
          continue;
        }
        if (!started) {
          ctx.moveTo(p[0], p[1]);
          started = true;
        } else {
          ctx.lineTo(p[0], p[1]);
        }
      }
      ctx.stroke();
    }

    // Small distribution dots
    for (const dot of allDots) {
      if (!visible(dot.coord)) continue;
      const p = proj(dot.coord);
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 1.1 * iz, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(226,232,240,0.55)";
      ctx.fill();
    }

    // Country markers: google-rate ring + latency-colored core with glow
    for (const c of countries) {
      if (!visible(c.centroid)) continue;
      const p = proj(c.centroid);
      if (!p) continue;
      const [x, y] = p;
      const radius = countRadius(c.count) * iz;
      const color = LAT_COLORS[c.latBand];
      const ringR = radius + 3 * iz;

      // ring track
      ctx.beginPath();
      ctx.arc(x, y, ringR, 0, Math.PI * 2);
      ctx.lineWidth = 1.5 * iz;
      ctx.strokeStyle = "rgba(148,163,184,0.22)";
      ctx.stroke();
      // google-rate arc
      if (c.googleRate > 0) {
        ctx.beginPath();
        ctx.arc(x, y, ringR, -Math.PI / 2, -Math.PI / 2 + c.googleRate * Math.PI * 2);
        ctx.lineWidth = 1.5 * iz;
        ctx.strokeStyle = "rgba(226,232,240,0.9)";
        ctx.stroke();
      }
      // glow core
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.82;
      ctx.fill();
      ctx.restore();
      if (c.key === selectedCountryKey) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 1.2 * iz, 0, Math.PI * 2);
        ctx.lineWidth = 1.4 * iz;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
      }
    }

    // Hub markers (checker / google)
    for (const hub of [{ coord: CHECKER_COORD, color: HUB_COLOR, label: "TOKYO · CHECKER" }, { coord: GOOGLE_COORD, color: HUB_COLOR, label: "US · GOOGLE" }]) {
      if (!visible(hub.coord)) continue;
      const p = proj(hub.coord);
      if (!p) continue;
      ctx.save();
      ctx.shadowColor = hub.color;
      ctx.shadowBlur = 9;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 2.6 * iz, 0, Math.PI * 2);
      ctx.fillStyle = hub.color;
      ctx.fill();
      ctx.restore();
      ctx.font = `${11 * iz}px ui-monospace, monospace`;
      ctx.fillStyle = "rgba(212,212,216,0.8)";
      ctx.fillText(hub.label, p[0] + 7 * iz, p[1] + 3.5 * iz);
    }
  };

  // --- Animated overlay (pulses travelling along the lines) ----------------
  const drawFrameRef = useRef<(t: number) => void>(() => {});
  drawFrameRef.current = (t: number) => {
    const canvas = canvasRef.current;
    const proj = projection;
    if (!canvas || !proj || size.w === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== size.w * dpr || canvas.height !== size.h * dpr) {
      canvas.width = size.w * dpr;
      canvas.height = size.h * dpr;
      baseDirtyRef.current = true;
    }
    if (baseDirtyRef.current) {
      buildBaseRef.current();
      baseDirtyRef.current = false;
    }
    const base = baseCanvasRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (base) ctx.drawImage(base, 0, 0);

    if (mode === "3d") proj.rotate(rotationRef.current);
    const v = viewRef.current;
    const iz = 1 / v.z;
    applyTransform(ctx, dpr);
    const seconds = reducedMotion ? 0 : t / 1000;

    // Ping ring on the selected country marker (selection feedback).
    if (selectedCountryKey) {
      const sc = countryByKey.get(selectedCountryKey);
      if (sc && visible(sc.centroid)) {
        const cp = proj(sc.centroid);
        if (cp) {
          const tRing = (seconds % 1.6) / 1.6;
          ctx.beginPath();
          ctx.arc(cp[0], cp[1], (countRadius(sc.count) + tRing * 15) * iz, 0, Math.PI * 2);
          ctx.lineWidth = 1.6 * iz;
          ctx.strokeStyle = "#ffffff";
          ctx.globalAlpha = (1 - tRing) * 0.75;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    // Beacon light pillars rising from the Tokyo (checker) and US (google) hubs.
    if (mode === "3d") {
      const [gcx, gcy] = proj.translate();
      const pulse = 0.55 + 0.45 * Math.sin(seconds * 3);
      for (const b of [{ coord: CHECKER_COORD, color: PULSE_CHECKER }, { coord: GOOGLE_COORD, color: PULSE_GOOGLE }]) {
        if (!visible(b.coord)) continue;
        const p = proj(b.coord);
        if (!p) continue;
        const dx = p[0] - gcx;
        const dy = p[1] - gcy;
        const len = Math.hypot(dx, dy) || 1;
        const beamLen = proj.scale() * 0.55;
        const tipX = p[0] + (dx / len) * beamLen;
        const tipY = p[1] + (dy / len) * beamLen;
        const grad = ctx.createLinearGradient(p[0], p[1], tipX, tipY);
        grad.addColorStop(0, b.color);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.lineCap = "round";
        ctx.strokeStyle = grad;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 14;
        ctx.lineWidth = 4.5 * iz;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1.4 * iz;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p[0], p[1], 3.5 * iz, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.restore();
      }
    }

    for (const line of lines) {
      const tp = (seconds * PULSE_SPEED + line.phase) % 1;
      const color = line.kind === "checker" ? PULSE_CHECKER : PULSE_GOOGLE;
      let p: [number, number] | null = null;
      let p2: [number, number] | null = null;

      if (mode === "2d") {
        const fromP = proj(line.from);
        const hubP = proj(line.hub);
        if (!fromP || !hubP) continue;
        const b = bezier2D(fromP, hubP, size.w, size.h);
        if (!b) continue;
        const C: [number, number] = [b.cx, b.cy];
        p = bezPoint(fromP, C, hubP, tp);
        p2 = bezPoint(fromP, C, hubP, Math.max(0, tp - 0.05));
      } else {
        const pt = line.interp(tp);
        if (!visible(pt)) continue;
        p = proj(pt);
        if (!p) continue;
        const tp2 = line.interp(Math.max(0, tp - 0.05));
        p2 = visible(tp2) ? proj(tp2) : null;
      }

      if (p2) {
        ctx.beginPath();
        ctx.moveTo(p2[0], p2[1]);
        ctx.lineTo(p[0], p[1]);
        ctx.lineWidth = 1.4 * iz;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.55;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 1.6 * iz, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }
  };

  // Sizing
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  // Rebuild the static base whenever inputs change
  useEffect(() => {
    baseDirtyRef.current = true;
  }, [projection, countries, selectedCountryKey, mode, size, lines, allDots, applyTransform, visible]);

  // Continuous animation loop
  useEffect(() => {
    let raf = 0;
    const tick = (t: number) => {
      drawFrameRef.current(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Zoom helper (reassigned each render for fresh size)
  zoomAtRef.current = (factor, fx, fy) => {
    const v = viewRef.current;
    const z2 = clamp(v.z * factor, mode === "3d" ? 0.45 : 1, 8);
    const wx = (fx - v.tx) / v.z;
    const wy = (fy - v.ty) / v.z;
    v.tx = fx - wx * z2;
    v.ty = fy - wy * z2;
    v.z = z2;
    const limX = (size.w * (v.z - 1)) / 2 + size.w * 0.45;
    const limY = (size.h * (v.z - 1)) / 2 + size.h * 0.45;
    v.tx = clamp(v.tx, -limX, limX);
    v.ty = clamp(v.ty, -limY, limY);
    baseDirtyRef.current = true;
  };

  // Wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAtRef.current(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - rect.left, e.clientY - rect.top);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    viewRef.current = { z: 1, tx: 0, ty: 0 };
    baseDirtyRef.current = true;
  }, [mode]);

  // --- Interaction ---------------------------------------------------------
  const hitTest = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const proj = projection;
      if (!canvas || !proj) return;
      const rect = canvas.getBoundingClientRect();
      const v = viewRef.current;
      const bx = (clientX - rect.left - v.tx) / v.z;
      const by = (clientY - rect.top - v.ty) / v.z;
      if (mode === "3d") proj.rotate(rotationRef.current);

      // nearest small dot (in base px)
      const threshold = 8 / v.z;
      let best: { record: MapProxy; d: number } | null = null;
      for (const dot of allDots) {
        if (!visible(dot.coord)) continue;
        const p = proj(dot.coord);
        if (!p) continue;
        const d = Math.hypot(p[0] - bx, p[1] - by);
        if (d < threshold && (!best || d < best.d)) best = { record: dot.record, d };
      }
      if (best) {
        onSelectProxy(best.record);
        onSelectCountry(normalizeCountryName(best.record.country_name));
        return;
      }

      const inverted = proj.invert?.([bx, by]);
      if (!inverted) return;
      for (const c of countries) {
        const f = featureByKey.get(c.key);
        if (f && geoContains(f, inverted)) {
          onSelectProxy(c.representative ?? null);
          onSelectCountry(c.key === selectedCountryKey ? null : c.key);
          return;
        }
      }
    },
    [allDots, countries, mode, onSelectCountry, onSelectProxy, projection, selectedCountryKey, visible],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 1) {
      pointerRef.current = { moved: false, lastX: e.clientX, lastY: e.clientY, button: e.button };
    } else if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
      pointerRef.current.moved = true;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const pointers = pointersRef.current;
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const canvas = canvasRef.current;
    if (pointers.size >= 2 && pinchRef.current && canvas) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = canvas.getBoundingClientRect();
      if (pinchRef.current.dist > 0) zoomAtRef.current(dist / pinchRef.current.dist, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
      pinchRef.current.dist = dist;
      return;
    }
    const p = pointerRef.current;
    const dx = e.clientX - p.lastX;
    const dy = e.clientY - p.lastY;
    if (Math.abs(dx) > TAP_MOVE_THRESHOLD || Math.abs(dy) > TAP_MOVE_THRESHOLD) p.moved = true;
    if (!p.moved) return;
    if (mode === "3d" && p.button !== 2) {
      rotationRef.current = [rotationRef.current[0] + dx * DRAG_SENSITIVITY, clamp(rotationRef.current[1] - dy * DRAG_SENSITIVITY, -90, 90), 0];
    } else {
      const v = viewRef.current;
      v.tx += dx;
      v.ty += dy;
      const limX = (size.w * (v.z - 1)) / 2 + size.w * 0.45;
      const limY = (size.h * (v.z - 1)) / 2 + size.h * 0.45;
      v.tx = clamp(v.tx, -limX, limX);
      v.ty = clamp(v.ty, -limY, limY);
    }
    baseDirtyRef.current = true;
    p.lastX = e.clientX;
    p.lastY = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const pointers = pointersRef.current;
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size === 1) {
      pinchRef.current = null;
      const [rem] = [...pointers.values()];
      pointerRef.current.lastX = rem.x;
      pointerRef.current.lastY = rem.y;
      pointerRef.current.moved = true;
      return;
    }
    if (pointers.size === 0) {
      pinchRef.current = null;
      if (pointerRef.current.button === 0 && !pointerRef.current.moved) hitTest(e.clientX, e.clientY);
    }
  };

  const recenter = () => {
    rotationRef.current = [...INITIAL_ROTATION];
    viewRef.current = { z: 1, tx: 0, ty: 0 };
    baseDirtyRef.current = true;
  };

  const selectedCountry = selectedCountryKey ? countryByKey.get(selectedCountryKey) ?? null : null;

  return (
    <Card className="border-border/50 bg-card/85 text-foreground">
      <CardHeader className="border-b border-border/50 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold tracking-tight">Map View</CardTitle>
            <Badge variant="outline" className="gap-1 border-border/60 bg-background/60 text-[13px] font-mono text-zinc-300">
              <Globe2 className="h-3 w-3" />
              {countries.length} countries · {summary.valid} valid
            </Badge>
          </div>
          <div className="inline-flex items-center rounded-lg border border-border/50 bg-background/60 p-1">
            <Button type="button" size="sm" variant={mode === "2d" ? "secondary" : "ghost"} className={cn("h-7 gap-1 rounded-md px-3 text-xs", mode !== "2d" && "text-zinc-400")} onClick={() => setMode("2d")}>
              <MapIcon className="h-3.5 w-3.5" />
              2D
            </Button>
            <Button type="button" size="sm" variant={mode === "3d" ? "secondary" : "ghost"} className={cn("h-7 gap-1 rounded-md px-3 text-xs", mode !== "3d" && "text-zinc-400")} onClick={() => setMode("3d")}>
              <Globe2 className="h-3.5 w-3.5" />
              3D
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="grid gap-3 lg:grid-cols-[212px_minmax(0,1fr)_304px]">
          {/* Left — Top Countries */}
          <div className="order-2 rounded-2xl border border-border/50 bg-card/70 p-3 lg:order-none lg:col-start-1 lg:row-start-1">
            <div className="mb-2 font-mono text-[12px] uppercase tracking-[0.2em] text-zinc-400">Top Countries</div>
            <div className="space-y-1.5">
              {topCountries.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    onSelectProxy(c.representative ?? null);
                    onSelectCountry(c.key === selectedCountryKey ? null : c.key);
                  }}
                  className="group block w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("flex min-w-0 items-center gap-1.5 truncate text-[13px]", c.key === selectedCountryKey ? "text-zinc-50" : "text-zinc-300")}>
                      <span className="relative h-2.5 w-3.5 shrink-0 overflow-hidden rounded-[1px]">
                        {getCountryFlagAssetUrl(c.countryCode) ? (
                          <Image src={getCountryFlagAssetUrl(c.countryCode)!} alt="" fill className="object-contain" />
                        ) : null}
                      </span>
                      <span className="truncate">{c.displayName}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[12px] text-zinc-500">{c.count.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-800/70">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(4, (c.count / maxTop) * 100)}%`, background: LAT_COLORS[c.latBand] }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Center — Map */}
          <div className="order-1 lg:order-none lg:col-start-2 lg:row-start-1">
            <div
              ref={wrapperRef}
              className="relative h-[380px] overflow-hidden rounded-2xl border border-border/50 bg-background sm:h-[460px] lg:h-[560px]"
            >
              <canvas
                ref={canvasRef}
                className="h-full w-full touch-none select-none"
                style={{ cursor: mode === "3d" ? "grab" : "pointer" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onContextMenu={(e) => e.preventDefault()}
              />
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-border/50 bg-black/70 px-2 py-1 font-mono text-[12px] text-zinc-400">
                {mode === "3d" ? "drag rotate · right-drag pan · scroll zoom · tap select" : "drag pan · scroll zoom · tap select"}
              </div>
              <div className="absolute right-3 top-3 flex items-center gap-1.5">
                <div className="flex items-center rounded-lg border border-border/50 bg-black/70 p-0.5">
                  <Button type="button" size="icon" variant="ghost" aria-label="Zoom out" className="h-7 w-7 text-zinc-200 hover:bg-zinc-800" onClick={() => zoomAtRef.current(1 / 1.3, size.w / 2, size.h / 2)}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" aria-label="Zoom in" className="h-7 w-7 text-zinc-200 hover:bg-zinc-800" onClick={() => zoomAtRef.current(1.3, size.w / 2, size.h / 2)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button type="button" size="sm" variant="outline" className="h-8 gap-1 border-border/50 bg-black/70 text-xs text-zinc-200 hover:bg-zinc-800" onClick={recenter}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-border/50 bg-card/70 p-3 sm:grid-cols-3">
              <div>
                <div className="mb-2 font-mono text-[12px] uppercase tracking-[0.15em] text-zinc-400">Proxies / Country</div>
                <div className="flex items-end gap-2">
                  {SIZE_RADII.map((r, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="rounded-full bg-zinc-400" style={{ width: r, height: r }} />
                      <span className="font-mono text-[10px] text-zinc-500">{SIZE_LABELS[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 font-mono text-[12px] uppercase tracking-[0.15em] text-zinc-400">Median Latency</div>
                <div className="grid grid-cols-2 gap-1">
                  {LAT_COLORS.map((color, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                      <span className="font-mono text-[11px] text-zinc-500">{LAT_LABELS[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 font-mono text-[12px] uppercase tracking-[0.15em] text-zinc-400">Google Rate</div>
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 36 36" className="h-9 w-9">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(226,232,240,0.9)" strokeWidth="3" strokeDasharray="66 100" strokeLinecap="round" transform="rotate(-90 18 18)" pathLength={100} />
                  </svg>
                  <span className="font-mono text-[11px] text-zinc-500">ring = % of valid proxies reaching Google (0–100%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Selected Proxy */}
          <div className="order-3 rounded-2xl border border-border/50 bg-card/70 p-3 lg:order-none lg:col-start-3 lg:row-start-1">
            <div className="mb-2 font-mono text-[12px] uppercase tracking-[0.2em] text-zinc-400">Selected Proxy</div>
            {selectedProxy ? (
              <div key={selectedProxy.id} className="ui-fade-up space-y-3">
                <div>
                  <div className="break-all font-mono text-base text-zinc-50">
                    {selectedProxy.ip}:{selectedProxy.port}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[13px] text-zinc-400">
                    <span className="relative h-2.5 w-3.5 shrink-0 overflow-hidden rounded-[1px]">
                      {getCountryFlagAssetUrl(selectedProxy.country_code) ? (
                        <Image src={getCountryFlagAssetUrl(selectedProxy.country_code)!} alt="" fill className="object-contain" />
                      ) : null}
                    </span>
                    {selectedProxy.country_name ?? "—"}
                  </div>
                </div>
                <dl className="space-y-1.5 font-mono text-[13px]">
                  {[
                    ["STATUS", selectedProxy.is_valid ? "VALID" : "INVALID"],
                    ["PROTOCOL", selectedProxy.protocol.toUpperCase()],
                    ["LATENCY", `${selectedProxy.speed_ms} ms`],
                    ["ANONYMITY", (selectedProxy.anonymity_level ?? "—").toUpperCase()],
                    ["GOOGLE ACCESS", selectedProxy.is_google ? "ACCESSIBLE" : "BLOCKED"],
                    ["ASN", selectedProxy.asn ?? "—"],
                    ["ORGANIZATION", selectedProxy.organization ?? "—"],
                    ["LAST CHECKED", formatUtc(selectedProxy.checked_at)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-3 border-b border-border/40 pb-1.5">
                      <dt className="shrink-0 text-zinc-500">{label}</dt>
                      <dd
                        className={cn(
                          "min-w-0 truncate text-right text-zinc-200",
                          label === "STATUS" && (selectedProxy.is_valid ? "text-emerald-400" : "text-rose-400"),
                          label === "GOOGLE ACCESS" && (selectedProxy.is_google ? "text-emerald-400" : "text-rose-400"),
                        )}
                      >
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {selectedCountry ? (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectProxy(null);
                      onSelectCountry(null);
                    }}
                    className="w-full rounded-md border border-border/50 py-1.5 text-[13px] text-zinc-400 transition-colors hover:bg-zinc-800/50"
                  >
                    Clear selection
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="py-8 text-center font-mono text-[13px] text-zinc-600">
                Tap a proxy dot or country
                <br />
                to inspect its record
              </div>
            )}
          </div>
        </div>

        {/* Global Summary */}
        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/50 bg-border/60 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["Countries", summary.countries.toLocaleString()],
            ["Valid Proxies", summary.valid.toLocaleString()],
            ["Google Accessible", summary.google.toLocaleString()],
            ["Median Latency", `${summary.medianLatency} ms`],
            ["Elite Proxies", summary.elite.toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} className="bg-card px-3 py-2.5">
              <div className="font-mono text-[13px] uppercase tracking-[0.14em] text-zinc-500">{label}</div>
              <div className="mt-1 font-mono text-base font-semibold text-zinc-100">{value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
