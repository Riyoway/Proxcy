"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { geoBounds, geoCentroid, geoContains, geoGraticule10, geoMercator, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { feature } from "topojson-client";
import { Globe2, LocateFixed, Minus, Move, Plus } from "lucide-react";
import worldAtlas from "world-atlas/countries-110m.json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { normalizeCountryName } from "@/lib/country";

export interface CountryMapStat {
  averageSpeedMs: number;
  countryCode: string | null;
  displayName: string;
  fastestSpeedMs: number;
  googleCount: number;
  key: string;
  latestCheckedAt: string;
  protocolCounts: Array<{ count: number; protocol: string }>;
  proxyCount: number;
}

export interface MapProxyRecord {
  asn: string | null;
  checkedAt: string;
  countryCode: string | null;
  countryKey: string;
  countryName: string | null;
  id: string;
  ip: string;
  isGoogle: boolean;
  organization: string | null;
  port: number;
  protocol: string;
  speedMs: number;
}

type CountryFeature = Feature<Geometry, { name?: string }> & { id?: string | number };
type CountryFeatureCollection = FeatureCollection<Geometry, { name?: string }>;

type WorldAtlasFeatureInput = {
  objects: {
    countries: never;
  };
};

type PointDetailLevel = "country" | "organization" | "subgroup" | "record";

type MapPoint = {
  averageSpeedMs: number;
  countryCode: string | null;
  countryKey: string;
  countryName: string;
  fastestSpeedMs: number;
  googleCount: number;
  key: string;
  label: string;
  level: PointDetailLevel;
  parentKey: string | null;
  protocols: Array<{ count: number; protocol: string }>;
  proxyCount: number;
  records: MapProxyRecord[];
  updatedAt: string;
  x: number;
  y: number;
};

type MapPointGroup = {
  countryKey: string;
  key: string;
  label: string;
  parentKey: string | null;
  records: MapProxyRecord[];
};

type ProjectedCoordinate = {
  x: number;
  y: number;
};

type PreparedWorldFeature = {
  countryKey: string | null;
  featureItem: CountryFeature;
  pathData: string;
};

type SubgroupDescriptor = {
  groupKey: string;
  label: string;
  parentKey: string | null;
};

type RenderedMapPoint = MapPoint & {
  haloRadius: number;
  opacity: number;
  radius: number;
  renderKey: string;
};

const emptySubgroupDescriptors = new Map<string, SubgroupDescriptor>();

type ProxyMapViewProps = {
  countryStats: CountryMapStat[];
  onSelectCountry: (countryKey: string | null) => void;
  records: MapProxyRecord[];
  selectedCountryKey: string | null;
};

const mapWidth = 1280;
const mapHeight = 820;
const organizationTransitionStart = 3.4;
const organizationTransitionEnd = 5.4;
const subgroupTransitionStart = 7.4;
const subgroupTransitionEnd = 10.2;
const recordTransitionStart = 11.1;
const recordTransitionEnd = 14.2;
const selectedCountryRecordTransitionStart = 9.15;
const selectedCountryRecordTransitionEnd = 11.75;
const minMapZoomScale = 1;
const maxMapZoomScale = 18;
const mapFrameFeature: Feature<Geometry> = {
  type: "Feature",
  properties: null,
  geometry: {
    type: "Polygon",
    coordinates: [[
      [-180, -48],
      [-180, 78],
      [180, 78],
      [180, -48],
      [-180, -48],
    ]],
  },
};
const worldMapInput = worldAtlas as unknown as WorldAtlasFeatureInput;
const worldFeatureCollection = feature(
  worldMapInput as never,
  worldMapInput.objects.countries,
) as unknown as CountryFeatureCollection;
const worldFeatures = worldFeatureCollection.features as CountryFeature[];
const projection = geoMercator().fitExtent(
  [
    [12, 10],
    [mapWidth - 12, mapHeight - 10],
  ],
  mapFrameFeature,
).clipExtent([[0, 0], [mapWidth, mapHeight]]);
const pathGenerator = geoPath(projection);
const graticulePath = pathGenerator(geoGraticule10()) ?? "";

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function hashToUnitInterval(value: string): number {
  return (hashString(value) % 10000) / 10000;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getCountryFlagIconSrc(countryCode: string | null): string | null {
  if (!countryCode) {
    return null;
  }

  const normalizedCountryCode = countryCode.trim().toLowerCase();

  if (!/^[a-z]{2}$/.test(normalizedCountryCode)) {
    return null;
  }

  return `https://flagcdn.com/24x18/${normalizedCountryCode}.png`;
}

function mixValue(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function easeInOut(value: number): number {
  const clamped = clampNumber(value, 0, 1);

  if (clamped < 0.5) {
    return 2 * clamped * clamped;
  }

  return 1 - Math.pow(-2 * clamped + 2, 2) / 2;
}

function formatRelativeTime(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatDistanceToNowStrict(date, { addSuffix: true });
}

function getPointLevel(zoomScale: number): PointDetailLevel {
  if (zoomScale >= recordTransitionStart) {
    return "record";
  }

  if (zoomScale >= subgroupTransitionStart) {
    return "subgroup";
  }

  if (zoomScale >= organizationTransitionStart) {
    return "organization";
  }

  return "country";
}

function getMarkerRadius(proxyCount: number, level: PointDetailLevel, zoomScale: number): number {
  const normalizedZoom = Math.max(zoomScale, 1);

  if (level === "record") {
    return Math.max(0.045, 5.6 / Math.pow(normalizedZoom, 1.28));
  }

  if (level === "subgroup") {
    return Math.max(0.09, Math.min(5.8, 3.4 + Math.log10(proxyCount + 1) * 0.72) / Math.pow(normalizedZoom, 1.18));
  }

  if (level === "organization") {
    return Math.max(0.14, Math.min(7.2, 5 + Math.log10(proxyCount + 1) * 0.95) / Math.pow(normalizedZoom, 1.14));
  }

  return Math.max(0.22, Math.min(8.2, 5.2 + Math.log10(proxyCount + 1) * 1.12) / Math.pow(normalizedZoom, 1.06));
}

function getOrganizationGroupKey(record: MapProxyRecord): string {
  return `${record.countryKey}::${record.organization ?? record.asn ?? "Unknown network"}`;
}

function getSubgroupChunkSize(recordCount: number): number {
  if (recordCount <= 4) {
    return 2;
  }

  if (recordCount <= 16) {
    return 3;
  }

  if (recordCount <= 40) {
    return 5;
  }

  if (recordCount <= 100) {
    return 7;
  }

  return 10;
}

function buildSubgroupDescriptors(records: MapProxyRecord[]): Map<string, SubgroupDescriptor> {
  const descriptors = new Map<string, SubgroupDescriptor>();
  const organizationBuckets = new Map<string, MapProxyRecord[]>();

  for (const record of records) {
    const organizationKey = getOrganizationGroupKey(record);
    const current = organizationBuckets.get(organizationKey);

    if (current) {
      current.push(record);
      continue;
    }

    organizationBuckets.set(organizationKey, [record]);
  }

  for (const [organizationKey, organizationRecords] of organizationBuckets.entries()) {
    const sortedRecords = [...organizationRecords].sort((left, right) => left.id.localeCompare(right.id));
    const subgroupSize = getSubgroupChunkSize(sortedRecords.length);
    const subgroupCount = Math.max(1, Math.ceil(sortedRecords.length / subgroupSize));

    for (let subgroupIndex = 0; subgroupIndex < subgroupCount; subgroupIndex += 1) {
      const start = subgroupIndex * subgroupSize;
      const subgroupRecords = sortedRecords.slice(start, start + subgroupSize);

      for (const record of subgroupRecords) {
        descriptors.set(record.id, {
          groupKey: `${organizationKey}::subgroup:${subgroupIndex}`,
          label: `${record.organization ?? record.asn ?? "Unknown network"} • ${subgroupIndex + 1}`,
          parentKey: organizationKey,
        });
      }
    }
  }

  return descriptors;
}

function getStableCoordinate(featureItem: CountryFeature, seed: string): [number, number] {
  const bounds = geoBounds(featureItem);
  const centroid = geoCentroid(featureItem);
  const [[minLng, minLat], [maxLng, maxLat]] = bounds;

  for (let attempt = 0; attempt < 18; attempt += 1) {
    const lng = minLng + (maxLng - minLng) * hashToUnitInterval(`${seed}:lng:${attempt}`);
    const lat = minLat + (maxLat - minLat) * hashToUnitInterval(`${seed}:lat:${attempt}`);

    if (geoContains(featureItem, [lng, lat])) {
      return [lng, lat];
    }
  }

  return centroid;
}

function buildCountryCandidates(featureItem: CountryFeature, seed: string, count: number, level: PointDetailLevel): ProjectedCoordinate[] {
  const projectedBounds = pathGenerator.bounds(featureItem);
  const projectedCentroid = projection(geoCentroid(featureItem));
  const [[minX, minY], [maxX, maxY]] = projectedBounds;
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const centerX = projectedCentroid?.[0] ?? (minX + maxX) / 2;
  const centerY = projectedCentroid?.[1] ?? (minY + maxY) / 2;
  const minDimension = Math.max(Math.min(width, height), 1);
  const densityDivider = level === "record"
    ? Math.max(140, count * 3.1)
    : level === "subgroup"
      ? Math.max(80, count * 1.9)
      : level === "organization"
        ? 32
        : 18;
  const minSpacing = level === "record"
    ? clampNumber(minDimension / densityDivider, 0.02, 0.16)
    : level === "subgroup"
      ? clampNumber(minDimension / densityDivider, 0.08, 0.34)
    : level === "organization"
      ? clampNumber(minDimension / densityDivider, 0.32, 1.1)
      : clampNumber(minDimension / densityDivider, 0.95, 3.6);
  const targetCount = level === "record"
    ? clampNumber(Math.max(count * 9, 120), 120, 360)
    : level === "subgroup"
      ? clampNumber(Math.max(count * 7, 84), 84, 220)
    : level === "organization"
      ? clampNumber(Math.max(count * 8, 72), 72, 220)
      : clampNumber(Math.max(count * 6, 48), 48, 120);
  const centerPull = level === "country" ? 0.44 : level === "organization" ? 0.18 : level === "subgroup" ? 0.08 : 0.02;
  const maxAttempts = level === "record"
    ? targetCount * 10
    : level === "subgroup"
      ? targetCount * 10
    : level === "organization"
      ? targetCount * 9
      : targetCount * 8;
  const candidates: ProjectedCoordinate[] = [];

  if (projectedCentroid) {
    candidates.push({ x: projectedCentroid[0], y: projectedCentroid[1] });
  }

  const invertProjection = projection.invert;

  if (!invertProjection) {
    return candidates;
  }

  for (let attempt = 0; attempt < maxAttempts && candidates.length < targetCount; attempt += 1) {
    const rawX = minX + width * hashToUnitInterval(`${seed}:x:${attempt}`);
    const rawY = minY + height * hashToUnitInterval(`${seed}:y:${attempt}`);
    const x = mixValue(rawX, centerX, centerPull);
    const y = mixValue(rawY, centerY, centerPull);
    const inverted = invertProjection([x, y]);

    if (!inverted || !geoContains(featureItem, inverted)) {
      continue;
    }
    const candidate = { x, y };
    const isDuplicate = candidates.some((existing) => {
      return Math.hypot(existing.x - candidate.x, existing.y - candidate.y) < minSpacing;
    });

    if (!isDuplicate) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

function buildAnchoredCandidates(
  featureItem: CountryFeature,
  seed: string,
  count: number,
  level: PointDetailLevel,
  anchor: ProjectedCoordinate,
): ProjectedCoordinate[] {
  const projectedBounds = pathGenerator.bounds(featureItem);
  const [[minX, minY], [maxX, maxY]] = projectedBounds;
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const minDimension = Math.max(Math.min(width, height), 1);
  const maxOffset = level === "record"
    ? clampNumber(minDimension * (0.07 + Math.sqrt(count) * 0.007), 1.2, Math.max(minDimension * 0.24, 3.4))
    : level === "subgroup"
      ? clampNumber(minDimension * (0.12 + Math.sqrt(count) * 0.01), 2.4, Math.max(minDimension * 0.34, 6.4))
      : clampNumber(minDimension * (0.18 + Math.sqrt(count) * 0.016), 4.8, Math.max(minDimension * 0.48, 12));
  const minSpacing = level === "record"
    ? clampNumber(maxOffset / Math.max(count * 0.72, 8), 0.026, 0.12)
    : level === "subgroup"
      ? clampNumber(maxOffset / Math.max(count * 0.62, 6), 0.1, 0.26)
      : clampNumber(maxOffset / Math.max(count * 0.5, 5), 0.24, 0.8);
  const targetCount = level === "record"
    ? clampNumber(Math.max(count * 8, 48), 48, 180)
    : level === "subgroup"
      ? clampNumber(Math.max(count * 6, 36), 36, 120)
      : clampNumber(Math.max(count * 8, 48), 48, 160);
  const candidates: ProjectedCoordinate[] = [anchor];
  const invertProjection = projection.invert;

  if (!invertProjection) {
    return candidates;
  }

  for (let attempt = 0; attempt < targetCount * 12 && candidates.length < targetCount; attempt += 1) {
    const angle = Math.PI * 2 * hashToUnitInterval(`${seed}:angle:${attempt}`);
    const radius = maxOffset * Math.sqrt(hashToUnitInterval(`${seed}:radius:${attempt}`));
    const stretchX = 0.84 + hashToUnitInterval(`${seed}:stretch-x:${attempt}`) * 0.4;
    const stretchY = 0.84 + hashToUnitInterval(`${seed}:stretch-y:${attempt}`) * 0.4;
    const x = anchor.x + Math.cos(angle) * radius * stretchX;
    const y = anchor.y + Math.sin(angle) * radius * stretchY;

    if (x < minX || x > maxX || y < minY || y > maxY) {
      continue;
    }

    const inverted = invertProjection([x, y]);

    if (!inverted || !geoContains(featureItem, inverted)) {
      continue;
    }

    const candidate = { x, y };
    const isDuplicate = candidates.some((existing) => {
      return Math.hypot(existing.x - candidate.x, existing.y - candidate.y) < minSpacing;
    });

    if (!isDuplicate) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

function pickCoordinateForGroup(
  candidates: ProjectedCoordinate[],
  assigned: ProjectedCoordinate[],
  centroid: ProjectedCoordinate,
  seed: string,
): ProjectedCoordinate | null {
  let bestCandidateIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const minDistanceSquared = assigned.length === 0
      ? 6400
      : assigned.reduce((min, point) => {
          const dx = point.x - candidate.x;
          const dy = point.y - candidate.y;
          return Math.min(min, dx * dx + dy * dy);
        }, Number.POSITIVE_INFINITY);
    const centerDx = candidate.x - centroid.x;
    const centerDy = candidate.y - centroid.y;
    const centerDistanceSquared = centerDx * centerDx + centerDy * centerDy;
    const randomBias = hashToUnitInterval(`${seed}:candidate:${index}`) * 0.01;
    const score = minDistanceSquared - centerDistanceSquared * 0.18 + randomBias;

    if (score > bestScore) {
      bestScore = score;
      bestCandidateIndex = index;
    }
  }

  if (bestCandidateIndex < 0) {
    return null;
  }

  const [bestCandidate] = candidates.splice(bestCandidateIndex, 1);
  return bestCandidate ?? null;
}

function findFallbackCoordinate(
  featureItem: CountryFeature,
  assigned: ProjectedCoordinate[],
  seed: string,
  level: PointDetailLevel,
  anchor?: ProjectedCoordinate,
): ProjectedCoordinate | null {
  const projectedBounds = pathGenerator.bounds(featureItem);
  const [[minX, minY], [maxX, maxY]] = projectedBounds;
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const minDimension = Math.max(Math.min(width, height), 1);
  const invertProjection = projection.invert;
  const minimumDistance = level === "record" ? 0.01 : level === "subgroup" ? 0.06 : level === "organization" ? 0.24 : 0.8;

  if (invertProjection) {
    if (anchor) {
      const localRadius = level === "record"
        ? clampNumber(minDimension * 0.18, 2.2, Math.max(minDimension * 0.42, 6))
        : level === "subgroup"
          ? clampNumber(minDimension * 0.24, 5, Math.max(minDimension * 0.54, 12))
          : clampNumber(minDimension * 0.3, 8, Math.max(minDimension * 0.66, 18));

      for (let attempt = 0; attempt < 220; attempt += 1) {
        const angle = Math.PI * 2 * hashToUnitInterval(`${seed}:local-angle:${attempt}`);
        const radius = localRadius * Math.sqrt(hashToUnitInterval(`${seed}:local-radius:${attempt}`));
        const x = anchor.x + Math.cos(angle) * radius;
        const y = anchor.y + Math.sin(angle) * radius;
        const inverted = invertProjection([x, y]);

        if (!inverted || !geoContains(featureItem, inverted)) {
          continue;
        }

        const minDistance = assigned.length === 0
          ? Number.POSITIVE_INFINITY
          : assigned.reduce((minimum, point) => Math.min(minimum, Math.hypot(point.x - x, point.y - y)), Number.POSITIVE_INFINITY);

        if (minDistance >= minimumDistance || attempt > 140) {
          return { x, y };
        }
      }
    }

    for (let attempt = 0; attempt < 320; attempt += 1) {
      const x = minX + width * hashToUnitInterval(`${seed}:fallback:x:${attempt}`);
      const y = minY + height * hashToUnitInterval(`${seed}:fallback:y:${attempt}`);
      const inverted = invertProjection([x, y]);

      if (!inverted || !geoContains(featureItem, inverted)) {
        continue;
      }

      const minDistance = assigned.length === 0
        ? Number.POSITIVE_INFINITY
        : assigned.reduce((minimum, point) => Math.min(minimum, Math.hypot(point.x - x, point.y - y)), Number.POSITIVE_INFINITY);

      if (minDistance >= minimumDistance || attempt > 220) {
        return { x, y };
      }
    }
  }

  const [fallbackLng, fallbackLat] = getStableCoordinate(featureItem, seed);
  const fallbackProjected = projection([fallbackLng, fallbackLat]);

  if (!fallbackProjected) {
    return null;
  }

  return { x: fallbackProjected[0], y: fallbackProjected[1] };
}

function buildProtocolSummary(records: MapProxyRecord[]): Array<{ count: number; protocol: string }> {
  const counts = new Map<string, number>();

  for (const record of records) {
    const protocol = record.protocol.toUpperCase();
    counts.set(protocol, (counts.get(protocol) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([protocol, count]) => ({ protocol, count }))
    .sort((a, b) => b.count - a.count);
}

function buildMapPoint(key: string, level: PointDetailLevel, label: string, records: MapProxyRecord[], coordinate: ProjectedCoordinate, parentKey: string | null): MapPoint {
  const proxyCount = records.length;
  const googleCount = records.filter((record) => record.isGoogle).length;
  const fastestSpeedMs = records.reduce((min, record) => Math.min(min, record.speedMs), Number.POSITIVE_INFINITY);
  const speedTotalMs = records.reduce((sum, record) => sum + record.speedMs, 0);
  const latestCheckedAt = records.reduce((latest, record) => {
    return new Date(record.checkedAt).getTime() > new Date(latest).getTime() ? record.checkedAt : latest;
  }, records[0]?.checkedAt ?? new Date().toISOString());

  return {
    averageSpeedMs: Math.round(speedTotalMs / Math.max(proxyCount, 1)),
    countryCode: records[0]?.countryCode ?? null,
    countryKey: records[0]?.countryKey ?? key,
    countryName: records[0]?.countryName ?? records[0]?.countryKey ?? label,
    fastestSpeedMs,
    googleCount,
    key,
    label,
    level,
    parentKey,
    protocols: buildProtocolSummary(records),
    proxyCount,
    records,
    updatedAt: latestCheckedAt,
    x: coordinate.x,
    y: coordinate.y,
  };
}

function buildPointLayout(
  featureByCountryKey: Map<string, CountryFeature>,
  records: MapProxyRecord[],
  level: PointDetailLevel,
  subgroupDescriptors: Map<string, SubgroupDescriptor>,
  parentPointLookup?: Map<string, MapPoint>,
): MapPoint[] {
  const groups = new Map<string, MapPointGroup>();

  for (const record of records) {
    const featureItem = featureByCountryKey.get(record.countryKey);

    if (!featureItem) {
      continue;
    }

    const subgroupDescriptor = subgroupDescriptors.get(record.id);
    const groupKey = level === "country"
      ? record.countryKey
      : level === "organization"
        ? getOrganizationGroupKey(record)
        : level === "subgroup"
          ? subgroupDescriptor?.groupKey ?? `${getOrganizationGroupKey(record)}::subgroup:0`
          : record.id;
    const label = level === "country"
      ? record.countryName ?? record.countryKey
      : level === "organization"
        ? record.organization ?? record.asn ?? "Unknown network"
        : level === "subgroup"
          ? subgroupDescriptor?.label ?? `${record.organization ?? record.asn ?? "Unknown network"} • 1`
          : `${record.ip}:${record.port}`;
    const parentKey = level === "country"
      ? null
      : level === "organization"
        ? record.countryKey
        : level === "subgroup"
          ? subgroupDescriptor?.parentKey ?? getOrganizationGroupKey(record)
          : subgroupDescriptor?.groupKey ?? getOrganizationGroupKey(record);
    const current = groups.get(groupKey);

    if (current) {
      current.records.push(record);
      continue;
    }

    groups.set(groupKey, {
      countryKey: record.countryKey,
      key: groupKey,
      label,
      parentKey,
      records: [record],
    });
  }

  const groupsByCountry = new Map<string, Array<MapPointGroup & { parentKey: string | null }>>();

  for (const group of groups.values()) {
    const existing = groupsByCountry.get(group.countryKey);

    if (existing) {
      existing.push(group);
      continue;
    }

    groupsByCountry.set(group.countryKey, [group]);
  }

  const points: MapPoint[] = [];

  for (const [countryKey, countryGroups] of groupsByCountry.entries()) {
    const featureItem = featureByCountryKey.get(countryKey);

    if (!featureItem) {
      continue;
    }

    const centroid = geoCentroid(featureItem);
    const projectedCentroid = projection(centroid);

    if (!projectedCentroid) {
      continue;
    }

    if (parentPointLookup && level !== "country") {
      const groupsByParent = new Map<string, MapPointGroup[]>();

      for (const group of countryGroups) {
        const parentGroupKey = group.parentKey ?? "__country__";
        const existing = groupsByParent.get(parentGroupKey);

        if (existing) {
          existing.push(group);
          continue;
        }

        groupsByParent.set(parentGroupKey, [group]);
      }

      for (const [parentGroupKey, childGroups] of groupsByParent.entries()) {
        const assigned: ProjectedCoordinate[] = [];
        const parentPoint = parentGroupKey === "__country__" ? null : parentPointLookup.get(parentGroupKey) ?? null;
        const anchor = parentPoint
          ? { x: parentPoint.x, y: parentPoint.y }
          : { x: projectedCentroid[0], y: projectedCentroid[1] };
        const candidates = parentPoint
          ? buildAnchoredCandidates(featureItem, `${countryKey}:${level}:${parentGroupKey}`, childGroups.length, level, anchor)
          : buildCountryCandidates(featureItem, `${countryKey}:${level}:${parentGroupKey}`, childGroups.length, level);
        const orderedGroups = [...childGroups].sort((a, b) => {
          if (b.records.length !== a.records.length) {
            return b.records.length - a.records.length;
          }

          return a.key.localeCompare(b.key);
        });

        for (const group of orderedGroups) {
          const coordinate = pickCoordinateForGroup(
            candidates,
            assigned,
            anchor,
            group.key,
          );

          if (coordinate) {
            assigned.push(coordinate);
            points.push(buildMapPoint(group.key, level, group.label, group.records, coordinate, group.parentKey));
            continue;
          }

          const fallbackCoordinate = findFallbackCoordinate(featureItem, assigned, group.key, level, anchor);

          if (!fallbackCoordinate) {
            continue;
          }

          assigned.push(fallbackCoordinate);
          points.push(buildMapPoint(group.key, level, group.label, group.records, fallbackCoordinate, group.parentKey));
        }
      }

      continue;
    }

    const candidates = buildCountryCandidates(featureItem, `${countryKey}:${level}`, countryGroups.length, level);
    const orderedGroups = [...countryGroups].sort((a, b) => {
      if (b.records.length !== a.records.length) {
        return b.records.length - a.records.length;
      }

      return a.key.localeCompare(b.key);
    });
    const assigned: ProjectedCoordinate[] = [];

    for (const group of orderedGroups) {
      const coordinate = pickCoordinateForGroup(
        candidates,
        assigned,
        { x: projectedCentroid[0], y: projectedCentroid[1] },
        group.key,
      );

      if (coordinate) {
        assigned.push(coordinate);
        points.push(buildMapPoint(group.key, level, group.label, group.records, coordinate, group.parentKey));
        continue;
      }

      const fallbackCoordinate = findFallbackCoordinate(featureItem, assigned, group.key, level, { x: projectedCentroid[0], y: projectedCentroid[1] });

      if (!fallbackCoordinate) {
        continue;
      }

      assigned.push(fallbackCoordinate);
      points.push(buildMapPoint(group.key, level, group.label, group.records, fallbackCoordinate, group.parentKey));
    }
  }

  return points.sort((a, b) => b.proxyCount - a.proxyCount);
}

export function ProxyMapView({ countryStats, onSelectCountry, records, selectedCountryKey }: ProxyMapViewProps) {
  const [mapTransform, setMapTransform] = useState<ZoomTransform>(() => zoomIdentity);
  const [hoveredPointKey, setHoveredPointKey] = useState<string | null>(null);
  const [selectedPointKey, setSelectedPointKey] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pendingTransformRef = useRef<ZoomTransform>(zoomIdentity);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const featureByCountryKey = useMemo(() => {
    return new Map(
      worldFeatures
        .map((featureItem) => {
          const key = normalizeCountryName(featureItem.properties?.name ?? null);
          return key ? [key, featureItem] as const : null;
        })
        .filter((entry): entry is readonly [string, CountryFeature] => entry !== null),
    );
  }, []);

  const statsByCountry = useMemo(() => {
    return new Map(countryStats.map((item) => [item.key, item]));
  }, [countryStats]);

  const preparedWorldFeatures = useMemo<PreparedWorldFeature[]>(() => {
    return worldFeatures
      .map((featureItem) => {
        const pathData = pathGenerator(featureItem);

        if (!pathData) {
          return null;
        }

        return {
          countryKey: normalizeCountryName(featureItem.properties?.name ?? null),
          featureItem,
          pathData,
        };
      })
      .filter((entry): entry is PreparedWorldFeature => entry !== null);
  }, []);

  const isSelectedCountryFocused = Boolean(selectedCountryKey && mapTransform.k >= selectedCountryRecordTransitionStart);
  const selectedCountryRecords = useMemo(() => {
    if (!selectedCountryKey) {
      return [];
    }

    return records.filter((record) => record.countryKey === selectedCountryKey);
  }, [records, selectedCountryKey]);
  const effectiveRecordTransitionStart = selectedCountryKey ? selectedCountryRecordTransitionStart : recordTransitionStart;
  const effectiveRecordTransitionEnd = selectedCountryKey ? selectedCountryRecordTransitionEnd : recordTransitionEnd;
  const zoomDrivenPointLevel = mapTransform.k >= effectiveRecordTransitionStart
    ? "record"
    : getPointLevel(mapTransform.k);
  const pointLevel = selectedCountryKey ? zoomDrivenPointLevel : "country";
  const organizationTransitionProgress = selectedCountryKey
    ? easeInOut(
        (mapTransform.k - organizationTransitionStart) / (organizationTransitionEnd - organizationTransitionStart),
      )
    : 0;
  const subgroupTransitionProgress = selectedCountryKey
    ? easeInOut(
        (mapTransform.k - subgroupTransitionStart) / (subgroupTransitionEnd - subgroupTransitionStart),
      )
    : 0;
  const recordTransitionWindowStart = isSelectedCountryFocused ? selectedCountryRecordTransitionStart : effectiveRecordTransitionStart;
  const recordTransitionWindowEnd = isSelectedCountryFocused ? selectedCountryRecordTransitionEnd : effectiveRecordTransitionEnd;
  const recordTransitionProgress = selectedCountryKey
    ? easeInOut(
        (mapTransform.k - recordTransitionWindowStart) / (recordTransitionWindowEnd - recordTransitionWindowStart),
      )
    : 0;
  const needsOrganizationLayout = Boolean(selectedCountryKey) && (zoomDrivenPointLevel !== "country" || organizationTransitionProgress > 0);
  const needsSubgroupLayout = Boolean(selectedCountryKey) && (zoomDrivenPointLevel === "subgroup" || zoomDrivenPointLevel === "record" || subgroupTransitionProgress > 0);
  const needsRecordLayout = Boolean(selectedCountryKey) && (mapTransform.k >= recordTransitionWindowStart || recordTransitionProgress > 0);
  const subgroupDescriptors = useMemo(() => {
    if (selectedCountryRecords.length === 0) {
      return emptySubgroupDescriptors;
    }

    return buildSubgroupDescriptors(selectedCountryRecords);
  }, [selectedCountryRecords]);

  const countryPoints = useMemo(() => {
    return buildPointLayout(featureByCountryKey, records, "country", emptySubgroupDescriptors);
  }, [featureByCountryKey, records]);

  const organizationPoints = useMemo(() => {
    if (!needsOrganizationLayout) {
      return [];
    }

    return buildPointLayout(featureByCountryKey, selectedCountryRecords, "organization", subgroupDescriptors);
  }, [featureByCountryKey, needsOrganizationLayout, selectedCountryRecords, subgroupDescriptors]);

  const organizationPointLookup = useMemo(() => {
    return new Map(organizationPoints.map((point) => [point.key, point]));
  }, [organizationPoints]);

  const subgroupPoints = useMemo(() => {
    if (!needsSubgroupLayout) {
      return [];
    }

    return buildPointLayout(featureByCountryKey, selectedCountryRecords, "subgroup", subgroupDescriptors, organizationPointLookup);
  }, [featureByCountryKey, needsSubgroupLayout, organizationPointLookup, selectedCountryRecords, subgroupDescriptors]);

  const subgroupPointLookup = useMemo(() => {
    return new Map(subgroupPoints.map((point) => [point.key, point]));
  }, [subgroupPoints]);

  const recordPoints = useMemo(() => {
    if (!needsRecordLayout) {
      return [];
    }

    return buildPointLayout(featureByCountryKey, selectedCountryRecords, "record", subgroupDescriptors, subgroupPointLookup);
  }, [featureByCountryKey, needsRecordLayout, selectedCountryRecords, subgroupDescriptors, subgroupPointLookup]);

  const pointLookup = useMemo(() => {
    return new Map([...countryPoints, ...organizationPoints, ...subgroupPoints, ...recordPoints].map((point) => [point.key, point]));
  }, [countryPoints, organizationPoints, subgroupPoints, recordPoints]);

  const renderedPoints = useMemo(() => {
    const countryLookup = new Map(countryPoints.map((point) => [point.key, point]));
    const organizationLookup = new Map(organizationPoints.map((point) => [point.key, point]));
    const subgroupLookup = new Map(subgroupPoints.map((point) => [point.key, point]));
    const backgroundCountryPoints = selectedCountryKey
      ? countryPoints.filter((point) => point.key !== selectedCountryKey)
      : [];

    const createRenderedPoint = (
      point: MapPoint,
      renderKey: string,
      opacity: number,
      x: number,
      y: number,
      radius: number,
      haloRadius: number,
    ): RenderedMapPoint => {
      return {
        ...point,
        haloRadius,
        opacity,
        radius,
        renderKey,
        x,
        y,
      };
    };

    const renderCountryPoints = (points: MapPoint[]): RenderedMapPoint[] => {
      return points.map((point) => {
        const radius = getMarkerRadius(point.proxyCount, "country", mapTransform.k);
        return createRenderedPoint(point, `country:${point.key}`, 1, point.x, point.y, radius, radius + 1.4 / Math.max(mapTransform.k, 1));
      });
    };

    const renderChildPoints = (
      points: MapPoint[],
      parentLookup: Map<string, MapPoint>,
      progress: number,
    ): RenderedMapPoint[] => {
      return points.map((point) => {
        const parentPoint = point.parentKey ? parentLookup.get(point.parentKey) : null;
        const startX = parentPoint?.x ?? point.x;
        const startY = parentPoint?.y ?? point.y;
        const endRadius = getMarkerRadius(point.proxyCount, point.level, mapTransform.k);
        const startRadius = parentPoint
          ? Math.max(endRadius, getMarkerRadius(parentPoint.proxyCount, parentPoint.level, mapTransform.k) * 0.74)
          : endRadius;
        const resolvedProgress = progress <= 0 ? 0 : progress >= 1 ? 1 : progress;
        const radius = mixValue(startRadius, endRadius, resolvedProgress);

        return createRenderedPoint(
          point,
          `${point.level}:${point.key}`,
          1,
          mixValue(startX, point.x, resolvedProgress),
          mixValue(startY, point.y, resolvedProgress),
          radius,
          radius + (point.level === "record" ? 0.95 : point.level === "subgroup" ? 1.05 : 1.15) / Math.max(mapTransform.k, 1),
        );
      });
    };

    if (!selectedCountryKey) {
      return renderCountryPoints(countryPoints);
    }

    if (pointLevel === "record" || recordTransitionProgress > 0) {
      return [
        ...renderCountryPoints(backgroundCountryPoints),
        ...renderChildPoints(recordPoints, subgroupLookup.size > 0 ? subgroupLookup : organizationLookup, recordTransitionProgress === 0 ? 1 : recordTransitionProgress),
      ];
    }

    if (pointLevel === "subgroup" || subgroupTransitionProgress > 0) {
      return [
        ...renderCountryPoints(backgroundCountryPoints),
        ...renderChildPoints(subgroupPoints, organizationLookup, subgroupTransitionProgress === 0 ? 1 : subgroupTransitionProgress),
      ];
    }

    if (pointLevel === "organization" || organizationTransitionProgress > 0) {
      return [
        ...renderCountryPoints(backgroundCountryPoints),
        ...renderChildPoints(organizationPoints, countryLookup, organizationTransitionProgress === 0 ? 1 : organizationTransitionProgress),
      ];
    }

    return renderCountryPoints(countryPoints);
  }, [countryPoints, mapTransform.k, organizationPoints, organizationTransitionProgress, pointLevel, recordPoints, recordTransitionProgress, selectedCountryKey, subgroupPoints, subgroupTransitionProgress]);

  const hoveredPoint = hoveredPointKey ? pointLookup.get(hoveredPointKey) ?? null : null;
  const selectedPoint = selectedPointKey && pointLookup.has(selectedPointKey)
    ? pointLookup.get(selectedPointKey) ?? null
    : null;
  const selectedCountry = selectedCountryKey ? statsByCountry.get(selectedCountryKey) ?? null : null;
  const hoveredRenderedPoint = hoveredPointKey
    ? renderedPoints.find((point) => point.key === hoveredPointKey) ?? null
    : null;
  const hoveredTooltipPosition = hoveredRenderedPoint
    ? {
        left: `${clampNumber((mapTransform.applyX(hoveredRenderedPoint.x) / mapWidth) * 100, 12, 88)}%`,
        top: `${clampNumber((mapTransform.applyY(hoveredRenderedPoint.y) / mapHeight) * 100, 12, 90)}%`,
      }
    : null;

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    const svg = select(svgRef.current);
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .extent([[0, 0], [mapWidth, mapHeight]])
      .scaleExtent([minMapZoomScale, maxMapZoomScale])
      .translateExtent([[-mapWidth * 0.45, -mapHeight * 0.3], [mapWidth * 1.45, mapHeight * 1.3]])
      .on("zoom", (event) => {
        pendingTransformRef.current = event.transform;

        if (animationFrameRef.current !== null) {
          return;
        }

        animationFrameRef.current = window.requestAnimationFrame(() => {
          animationFrameRef.current = null;
          setMapTransform(pendingTransformRef.current);
        });
      });

    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);
    svg.on("dblclick.zoom", null);
    svg.call(zoomBehavior.transform, zoomIdentity);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      svg.on(".zoom", null);
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) {
      return;
    }

    const svg = select(svgRef.current);

    if (!selectedCountryKey) {
      svg.call(zoomBehaviorRef.current.transform, zoomIdentity);
      return;
    }

    const featureItem = featureByCountryKey.get(selectedCountryKey);

    if (!featureItem) {
      return;
    }

    const [[x0, y0], [x1, y1]] = pathGenerator.bounds(featureItem);
    const width = x1 - x0;
    const height = y1 - y0;

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return;
    }

    const proxyCount = selectedCountry?.proxyCount ?? 1;
    const fittedScale = 1.08 / Math.max(width / mapWidth, height / mapHeight);
    const organizationStageMidpoint = organizationTransitionStart + (organizationTransitionEnd - organizationTransitionStart) * 0.58;
    const organizationStageCeiling = organizationTransitionEnd - 0.2;
    const targetFocusedScale = Math.min(
      organizationStageCeiling,
      organizationStageMidpoint + Math.log10(proxyCount + 1) * 0.18,
    );
    const scale = Math.min(organizationStageCeiling, Math.max(targetFocusedScale, Math.min(fittedScale, organizationStageCeiling)));
    const translateX = mapWidth / 2 - scale * ((x0 + x1) / 2);
    const translateY = mapHeight / 2 - scale * ((y0 + y1) / 2);

    svg.call(zoomBehaviorRef.current.transform, zoomIdentity.translate(translateX, translateY).scale(scale));
  }, [featureByCountryKey, selectedCountry, selectedCountryKey]);

  const handleZoom = (scaleFactor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) {
      return;
    }

    select(svgRef.current).call(zoomBehaviorRef.current.scaleBy, scaleFactor);
  };

  const handleReset = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) {
      return;
    }

    select(svgRef.current).call(zoomBehaviorRef.current.transform, zoomIdentity);
  };

  const topCountries = countryStats;
  const activePoint = hoveredPoint ?? selectedPoint;
  const pointLevelLabel = pointLevel === "country"
    ? "Country groups"
    : pointLevel === "organization"
      ? "Network groups"
      : pointLevel === "subgroup"
        ? "Subgroups"
        : "Proxy pins";
  const focusModeLabel = selectedCountry ? "Country focus" : "World overview";
  const mapHint = selectedCountry
    ? pointLevel === "country"
      ? "Zoom in to reveal networks inside the selected country."
      : pointLevel === "organization"
        ? "Select a network cluster to inspect grouped proxies."
        : pointLevel === "subgroup"
          ? "Select a subgroup to narrow dense results before opening individual proxies."
          : "Select a proxy pin to inspect its endpoint, protocol, and latency."
    : "Select a country from the map or Top Regions to open network and proxy drilldown.";
  const selectedCountryGoogleRate = selectedCountry && selectedCountry.proxyCount > 0
    ? Math.round((selectedCountry.googleCount / selectedCountry.proxyCount) * 100)
    : null;
  const selectedCountryUpdatedAt = selectedCountry
    ? formatRelativeTime(selectedCountry.latestCheckedAt)
    : null;

  const handleSelectCountryFocus = (countryKey: string | null) => {
    setHoveredPointKey(null);
    setSelectedPointKey(null);
    onSelectCountry(countryKey);
  };

  const handleSelectPoint = (point: RenderedMapPoint) => {
    setHoveredPointKey(null);
    setSelectedPointKey(point.key);
    onSelectCountry(point.countryKey);
  };

  const handleClearPointSelection = () => {
    setHoveredPointKey(null);
    setSelectedPointKey(null);
  };

  return (
    <Card className="relative overflow-hidden border-zinc-800/90 bg-[#0d0d0e] text-zinc-100 shadow-sm">
      <CardHeader className="border-b border-zinc-800/90 pb-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold tracking-tight">Map View</CardTitle>
              <Badge variant="outline" className="gap-1 border-zinc-700/80 bg-zinc-900/70 text-zinc-300">
                <Globe2 className="h-3.5 w-3.5" />
                {records.length} proxies
              </Badge>
            </div>
            <p className="max-w-[820px] text-xs text-zinc-400">
              Map note: proxy locations are approximate. The world view stays grouped by country for responsiveness, and deeper network and proxy drilldown is only expanded after you select a country.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1 border-zinc-700/80 bg-zinc-900/70 text-zinc-300">
              {focusModeLabel}
            </Badge>
            {selectedCountry ? (
              <Badge variant="outline" className="gap-1 border-zinc-700/80 bg-zinc-900/70 text-zinc-300">
                {selectedCountry.displayName}
              </Badge>
            ) : null}
            {selectedCountryKey ? (
              <Button variant="outline" size="sm" className="border-zinc-700/80 bg-zinc-900/70 text-xs text-zinc-100 hover:bg-zinc-800" onClick={() => handleSelectCountryFocus(null)}>
                <LocateFixed className="mr-2 h-3.5 w-3.5" />
                Back to world
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="grid gap-4 xl:items-start xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="self-start overflow-hidden rounded-2xl border border-zinc-800/90 bg-[#090909]">
            <div className="relative bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(8,8,9,1))]">
              <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-md border border-zinc-700/80 bg-black/85 px-2 py-1 text-[11px] font-medium text-zinc-200">
                  {pointLevelLabel}
                </Badge>
                <Badge variant="outline" className="rounded-md border border-zinc-700/80 bg-black/80 px-2 py-1 text-[11px] text-zinc-300">
                  {focusModeLabel}
                </Badge>
                <div className="hidden items-center gap-1 rounded-md border border-zinc-800/80 bg-black/80 px-2 py-1 text-[11px] text-zinc-400 md:inline-flex">
                  <Move className="h-3.5 w-3.5" />
                  {selectedCountry ? mapHint : "Drag to explore, scroll to zoom, or select a country to drill down"}
                </div>
              </div>
              <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-xl border border-zinc-800/80 bg-black/80 px-2 py-1.5">
                <div className="hidden min-w-[56px] items-center justify-center rounded-md border border-zinc-800/80 bg-zinc-900/70 px-2 py-1 text-[11px] font-medium text-zinc-300 sm:inline-flex">
                  {mapTransform.k.toFixed(mapTransform.k >= 10 ? 0 : 1)}x
                </div>
                <Button type="button" variant="outline" size="icon" aria-label="Zoom in" className="h-8 w-8 border-zinc-700/80 bg-zinc-900/70 text-zinc-100 hover:bg-zinc-800" onClick={() => handleZoom(1.25)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="outline" size="icon" aria-label="Zoom out" className="h-8 w-8 border-zinc-700/80 bg-zinc-900/70 text-zinc-100 hover:bg-zinc-800" onClick={() => handleZoom(0.8)}>
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 border-zinc-700/80 bg-zinc-900/70 text-xs text-zinc-100 hover:bg-zinc-800" onClick={handleReset}>
                  Reset
                </Button>
              </div>
              {hoveredPoint && hoveredTooltipPosition ? (
                <div
                  className="pointer-events-none absolute z-20 w-[min(240px,calc(100%-24px))] rounded-xl border border-zinc-700/80 bg-black/92 px-3 py-2 text-left shadow-md shadow-black/25"
                  style={{
                    left: hoveredTooltipPosition.left,
                    top: hoveredTooltipPosition.top,
                    transform: "translate(-50%, calc(-100% - 10px))",
                  }}
                >
                  <div className="truncate text-[11px] font-semibold text-zinc-100">{hoveredPoint.label}</div>
                  <div className="mt-1 truncate text-[10px] text-zinc-300">
                    {hoveredPoint.level === "record" && hoveredPoint.records[0]
                      ? `${hoveredPoint.records[0].ip}:${hoveredPoint.records[0].port} · ${hoveredPoint.records[0].protocol.toUpperCase()} · ${hoveredPoint.records[0].speedMs}ms`
                      : `${hoveredPoint.proxyCount.toLocaleString()} proxies · ${hoveredPoint.level === "subgroup" ? "Subgroup" : hoveredPoint.level === "organization" ? "Network" : "Country"}`}
                  </div>
                  <div className="mt-1 truncate text-[10px] text-zinc-500">
                    {hoveredPoint.countryName} {hoveredPoint.countryCode ? `(${hoveredPoint.countryCode})` : ""}
                  </div>
                </div>
              ) : null}
              <svg ref={svgRef} viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="block h-auto w-full cursor-grab touch-none active:cursor-grabbing">
                <rect x="0" y="0" width={mapWidth} height={mapHeight} fill="rgb(8, 8, 9)" />
                <g transform={mapTransform.toString()}>
                  <path d={graticulePath} fill="none" stroke="rgba(113, 113, 122, 0.12)" strokeWidth={0.5 / Math.max(mapTransform.k, 1)} />
                  {preparedWorldFeatures.map(({ countryKey, featureItem, pathData }) => {
                    const hasData = Boolean(countryKey && statsByCountry.has(countryKey));
                    const isSelected = Boolean(countryKey && selectedCountryKey === countryKey);
                    const isDimmed = Boolean(selectedCountryKey && countryKey !== selectedCountryKey);

                    return (
                      <path
                        key={`${featureItem.id ?? countryKey ?? "world"}`}
                        d={pathData}
                        fill={isSelected ? "rgba(113, 113, 122, 0.34)" : hasData ? "rgba(63, 63, 70, 0.78)" : "rgba(24, 24, 27, 0.96)"}
                        stroke={isSelected ? "rgba(245, 245, 245, 0.72)" : hasData ? "rgba(113, 113, 122, 0.26)" : "rgba(39, 39, 42, 0.82)"}
                        strokeWidth={(isSelected ? 1.1 : 0.7) / Math.max(mapTransform.k, 1)}
                        opacity={isDimmed && !hasData ? 0.7 : 1}
                      />
                    );
                  })}
                  {renderedPoints.map((point) => {
                    const isSelected = selectedPointKey === point.key;
                    const isHovered = hoveredPointKey === point.key;

                    return (
                      <g
                        key={point.renderKey}
                        transform={`translate(${point.x}, ${point.y})`}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPointKey(point.key)}
                        onMouseLeave={() => setHoveredPointKey(null)}
                        onClick={() => handleSelectPoint(point)}
                        style={{ opacity: point.opacity, transition: "opacity 160ms ease-out" }}
                      >
                        {isHovered || isSelected ? (
                          <circle
                            r={point.haloRadius}
                            className="ui-map-pin-ping"
                            fill={isSelected ? "rgba(228, 228, 231, 0.2)" : "rgba(161, 161, 170, 0.16)"}
                            opacity={1}
                          />
                        ) : null}
                        <circle
                          r={point.radius}
                          fill={isSelected ? "rgb(228, 228, 231)" : "rgb(161, 161, 170)"}
                          stroke="rgba(250,250,250,0.82)"
                          strokeWidth={0.9 / Math.max(mapTransform.k, 1)}
                        />
                      </g>
                    );
                  })}
                </g>
              </svg>
              <div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-zinc-800/80 bg-[rgba(8,8,9,0.92)] px-4 py-2.5 text-[11px] text-zinc-400">
                {activePoint ? (
                  <>
                    <span className="font-medium text-zinc-100">{activePoint.label}</span>
                    <span>{activePoint.proxyCount.toLocaleString()} proxies</span>
                    <span>Google OK {activePoint.googleCount.toLocaleString()}</span>
                    <span>{activePoint.level === "record" ? "Single proxy" : activePoint.level === "subgroup" ? "Subgroup cluster" : activePoint.level === "organization" ? "Network cluster" : "Country cluster"}</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-zinc-200">{selectedCountry ? `${selectedCountry.displayName} focus` : "Map guide"}</span>
                    <span>{selectedCountry ? mapHint : "1. Select a country  2. Zoom in  3. Select a network or proxy pin"}</span>
                    <span>{selectedCountry ? "Back to world returns to country-level clusters." : "The world map stays grouped by country until a country is selected, which keeps exploration responsive."}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="rounded-2xl border border-zinc-800/90 bg-[#111113] p-4">
              {selectedPoint ? (
                <>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-zinc-100">{selectedPoint.label}</div>
                      <div className="mt-1 truncate text-[11px] text-zinc-400">{selectedPoint.countryName} {selectedPoint.countryCode ? `(${selectedPoint.countryCode})` : ""}</div>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      <Badge variant="secondary" className="shrink-0 border border-zinc-700/70 bg-zinc-800 text-[11px] font-medium text-zinc-100">
                        {selectedPoint.level === "record" ? "Proxy" : selectedPoint.level === "subgroup" ? "Subgroup" : selectedPoint.level === "organization" ? "Network" : "Country"}
                      </Badge>
                      {selectedPoint.level === "record" && selectedPoint.records[0] ? (
                        <Badge variant="outline" className="shrink-0 border-zinc-700/70 bg-zinc-900/70 text-[11px] font-medium text-zinc-200">
                          {selectedPoint.records[0].protocol.toUpperCase()}
                        </Badge>
                      ) : null}
                      {selectedCountryKey ? (
                        <Button type="button" variant="outline" size="sm" className="h-7 border-zinc-700/80 bg-zinc-900/70 px-2.5 text-[11px] text-zinc-200 hover:bg-zinc-800" onClick={handleClearPointSelection}>
                          Back to country
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {selectedPoint.level === "record" && selectedPoint.records[0] ? (
                    <div className="space-y-3 text-sm">
                      <div className="space-y-2">
                        <div className="rounded-xl border border-zinc-800/80 bg-black/35 p-3">
                          <div className="text-[11px] text-zinc-400">Endpoint</div>
                          <div className="mt-1 truncate font-mono text-[13px] font-medium text-zinc-100">
                            {selectedPoint.records[0].ip}:{selectedPoint.records[0].port}
                          </div>
                        </div>
                        <div className="rounded-xl border border-zinc-800/80 bg-black/35 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="shrink-0 text-[11px] text-zinc-400">Network</div>
                            <div className="min-w-0 truncate text-right text-zinc-100">{selectedPoint.records[0].organization ?? "Unknown network"}</div>
                          </div>
                          <div className="mt-1 truncate text-right text-[11px] text-zinc-400">{selectedPoint.records[0].asn ?? "ASN unavailable"}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-zinc-800/80 bg-black/35 p-3">
                            <div className="text-[11px] text-zinc-400">Latency</div>
                            <div className="mt-1 font-medium text-zinc-100">{selectedPoint.records[0].speedMs}ms</div>
                          </div>
                          <div className="rounded-xl border border-zinc-800/80 bg-black/35 p-3">
                            <div className="text-[11px] text-zinc-400">Google</div>
                            <div className="mt-1 font-medium text-zinc-100">{selectedPoint.records[0].isGoogle ? "Accessible" : "Blocked"}</div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-zinc-800/80 bg-black/35 p-3">
                          <div className="text-[11px] text-zinc-400">Updated</div>
                          <div className="mt-1 font-medium text-zinc-100">
                            {formatRelativeTime(selectedPoint.records[0].checkedAt) ?? "Unknown"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-zinc-800/80 bg-black/35 p-3">
                          <div className="text-[11px] text-zinc-400">Proxy count</div>
                          <div className="mt-1 font-semibold text-zinc-100">{selectedPoint.proxyCount.toLocaleString()}</div>
                        </div>
                        <div className="rounded-xl border border-zinc-800/80 bg-black/35 p-3">
                          <div className="text-[11px] text-zinc-400">Google OK</div>
                          <div className="mt-1 font-semibold text-zinc-100">{selectedPoint.googleCount.toLocaleString()}</div>
                        </div>
                        <div className="rounded-xl border border-zinc-800/80 bg-black/35 p-3">
                          <div className="text-[11px] text-zinc-400">Avg latency</div>
                          <div className="mt-1 font-semibold text-zinc-100">{selectedPoint.averageSpeedMs}ms</div>
                        </div>
                        <div className="rounded-xl border border-zinc-800/80 bg-black/35 p-3">
                          <div className="text-[11px] text-zinc-400">Fastest</div>
                          <div className="mt-1 font-semibold text-zinc-100">{selectedPoint.fastestSpeedMs}ms</div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-zinc-800/80 bg-black/35 p-3">
                        <div className="text-[11px] text-zinc-400">Protocols</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedPoint.protocols.map((item) => (
                            <Badge key={item.protocol} variant="outline" className="border-zinc-700/70 bg-zinc-900/70 text-[11px] text-zinc-200">
                              {item.protocol} {item.count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-zinc-800/80 bg-black/35 p-3">
                        <div className="text-[11px] text-zinc-400">Sample proxies</div>
                        <div className="mt-2 space-y-2">
                          {selectedPoint.records.slice(0, 4).map((record) => (
                            <div key={record.id} className="flex items-center justify-between gap-3 text-[12px]">
                              <div className="min-w-0">
                                <div className="truncate font-mono text-zinc-100">{record.ip}:{record.port}</div>
                                <div className="truncate text-zinc-400">{record.organization ?? record.asn ?? "Unknown network"}</div>
                              </div>
                              <div className="shrink-0 text-zinc-400">{record.speedMs}ms</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {selectedCountry ? (
                    <div className="mb-4 rounded-xl border border-zinc-800/80 bg-black/35 p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Focused country</div>
                          <div className="mt-1 truncate text-sm font-semibold text-zinc-100">{selectedCountry.displayName}</div>
                          <div className="mt-1 text-[11px] leading-relaxed text-zinc-400">{mapHint}</div>
                        </div>
                        <Badge variant="outline" className="shrink-0 border-zinc-700/70 bg-zinc-900/70 text-[11px] text-zinc-200">
                          {pointLevelLabel}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3">
                          <div className="text-[11px] text-zinc-400">Proxies</div>
                          <div className="mt-1 font-semibold text-zinc-100">{selectedCountry.proxyCount.toLocaleString()}</div>
                        </div>
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3">
                          <div className="text-[11px] text-zinc-400">Google ready</div>
                          <div className="mt-1 font-semibold text-zinc-100">{selectedCountryGoogleRate ?? 0}%</div>
                        </div>
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3">
                          <div className="text-[11px] text-zinc-400">Fastest</div>
                          <div className="mt-1 font-semibold text-zinc-100">{selectedCountry.fastestSpeedMs}ms</div>
                        </div>
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3">
                          <div className="text-[11px] text-zinc-400">Updated</div>
                          <div className="mt-1 font-semibold text-zinc-100">{selectedCountryUpdatedAt ?? "Unknown"}</div>
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="mt-3 w-full border-zinc-700/80 bg-zinc-900/70 text-xs text-zinc-100 hover:bg-zinc-800" onClick={() => handleSelectCountryFocus(null)}>
                        Back to world
                      </Button>
                    </div>
                  ) : (
                    <div className="mb-4 rounded-xl border border-zinc-800/80 bg-black/35 p-3.5">
                      <div className="text-sm font-semibold text-zinc-100">How to explore</div>
                      <div className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-zinc-400">
                        <div>1. Select a country from the map or Top Regions.</div>
                        <div>2. Zoom in to reveal networks and denser proxy clusters.</div>
                        <div>3. Click a point to lock its details in this panel.</div>
                      </div>
                    </div>
                  )}
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">Top Regions</div>
                      <div className="mt-1 text-[11px] text-zinc-400">
                        {selectedCountry ? "Switch focus or compare another country." : "Choose a country to start drilldown."}
                      </div>
                    </div>
                    <div className="rounded-md border border-zinc-800/80 bg-zinc-950/70 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                      {topCountries.length}
                    </div>
                  </div>
                  <div className="ui-scrollbar max-h-[70vh] space-y-2 overflow-y-auto pr-2">
                    {topCountries.map((country) => {
                      const isSelected = selectedCountryKey === country.key;
                      const flagIconSrc = getCountryFlagIconSrc(country.countryCode);
                      const googleAvailabilityRate = country.proxyCount > 0 ? Math.round((country.googleCount / country.proxyCount) * 100) : 0;

                      return (
                        <button
                          key={country.key}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => handleSelectCountryFocus(isSelected ? null : country.key)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                            isSelected
                              ? "border-zinc-500/30 bg-zinc-800/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                              : "border-zinc-800/80 bg-black/30 hover:border-zinc-700/80 hover:bg-zinc-800/45",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-medium text-zinc-100">{country.displayName}</div>
                              {isSelected ? (
                                <Badge variant="outline" className="shrink-0 border-zinc-600/80 bg-zinc-900/80 text-[10px] text-zinc-200">
                                  Focused
                                </Badge>
                              ) : null}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400">
                              {flagIconSrc ? (
                                <span
                                  role="img"
                                  aria-label={`${country.displayName} flag`}
                                  className="inline-block h-[14px] w-[18px] rounded-[2px] bg-cover bg-center bg-no-repeat"
                                  style={{ backgroundImage: `url(${flagIconSrc})` }}
                                />
                              ) : (
                                <span aria-label={`${country.displayName} country code`} className="inline-flex h-[14px] min-w-[18px] items-center justify-center rounded-[2px] border border-zinc-700/70 bg-zinc-900/80 px-1 text-[9px] font-semibold uppercase leading-none text-zinc-300">
                                  {country.countryCode ?? "??"}
                                </span>
                              )}
                              <span>Google OK {country.googleCount.toLocaleString()} / {country.proxyCount.toLocaleString()} · {googleAvailabilityRate}%</span>
                            </div>
                          </div>
                          <div
                            className={cn(
                              "shrink-0 min-w-[82px] rounded-2xl border px-3 py-2.5 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors",
                              isSelected
                                ? "border-zinc-500/35 bg-[linear-gradient(180deg,rgba(63,63,70,0.32),rgba(24,24,27,0.9))]"
                                : "border-zinc-700/70 bg-[linear-gradient(180deg,rgba(39,39,42,0.78),rgba(24,24,27,0.9))]",
                            )}
                          >
                            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">Proxies</div>
                            <div className="mt-1 text-base font-semibold leading-none tabular-nums text-zinc-50">
                              {country.proxyCount.toLocaleString()}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="mt-4 border-t border-zinc-800/80 pt-4 text-[11px] leading-relaxed text-zinc-500">
                Location markers are estimates based on country-level data, so they help you explore free proxies visually but do not represent exact server coordinates.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
