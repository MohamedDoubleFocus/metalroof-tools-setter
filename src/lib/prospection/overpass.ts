/**
 * Overpass API client.
 *
 * Given a polygon (array of {lat, lng}), query OpenStreetMap for all the
 * driveable streets inside it, return a deduped list of named streets with
 * their geometry (suitable for drawing polylines on a Google Map).
 *
 * Docs:
 *   - https://overpass-api.de
 *   - https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL
 */

import type { LatLng } from "@/types/prospection";
import { normalizeStreetName } from "./streets";

/**
 * Overpass mirrors — we try them in order. The main `overpass-api.de` endpoint
 * is occasionally throttled or returns 406 to scripted requests; the Kumi
 * mirror is a stable fallback maintained by the OSM community.
 */
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/**
 * Overpass strictly requires a non-empty User-Agent identifying the caller.
 * Requests without one frequently return 406 Not Acceptable from the main
 * endpoint. See https://operations.osmfoundation.org/policies/api/
 */
const OVERPASS_USER_AGENT =
  "MetalRoofMontreal-Prospection/1.0 (contact@groupebricole.com)";

export interface OverpassStreet {
  name: string;
  normalizedName: string;
  geometry: LatLng[];
}

interface OverpassWay {
  type: "way";
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

interface OverpassResponse {
  elements: OverpassWay[];
}

/**
 * Build the Overpass polygon literal: "lat1 lng1 lat2 lng2 ..."
 */
function buildPolyArg(polygon: LatLng[]): string {
  return polygon.map((p) => `${p.lat} ${p.lng}`).join(" ");
}

/**
 * Fetch all driveable streets inside the polygon.
 * Returns deduplicated streets (same name = merged segments).
 */
export async function fetchStreetsInPolygon(
  polygon: LatLng[]
): Promise<OverpassStreet[]> {
  if (polygon.length < 3) {
    throw new Error("Polygon needs at least 3 points");
  }

  const poly = buildPolyArg(polygon);

  // Query for all named driveable streets that have any node inside the polygon.
  // Wider filter than just "residential" so we also catch service roads and
  // pedestrian/footway types found in some QC subdivisions.
  const query = `
    [out:json][timeout:30];
    (
      way["highway"~"^(residential|primary|secondary|tertiary|unclassified|living_street|service|tertiary_link|secondary_link|primary_link)$"]
         ["name"]
         (poly:"${poly}");
    );
    out geom;
  `;

  // Try each mirror in order until one succeeds. A 406 / 429 / 504 on the
  // primary just means "this mirror is unhappy right now" — the alternatives
  // serve the same data.
  let res: Response | null = null;
  let lastError = "";
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": OVERPASS_USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (r.ok) {
        res = r;
        break;
      }
      const text = await r.text().catch(() => "");
      lastError = `HTTP ${r.status} (${endpoint}) - ${text.slice(0, 200)}`;
      console.warn("[overpass] mirror failed, trying next:", lastError);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn("[overpass] mirror network error:", endpoint, lastError);
    }
  }

  if (!res) {
    throw new Error(`Overpass API indisponible — ${lastError}`);
  }

  const data = (await res.json()) as OverpassResponse;

  // Merge multiple `way` segments with the same name into one logical street.
  // We just keep the concatenated geometry — polylines drawn per-segment look
  // fine on the map even without merging at junctions.
  const byName = new Map<string, OverpassStreet>();

  for (const w of data.elements) {
    const name = w.tags?.name;
    if (!name || !w.geometry || w.geometry.length === 0) continue;

    const normalized = normalizeStreetName(name);
    if (!normalized) continue;

    const segGeo: LatLng[] = w.geometry.map((g) => ({
      lat: g.lat,
      lng: g.lon,
    }));

    const existing = byName.get(normalized);
    if (existing) {
      // Append a "gap" marker by storing geometry as a flat list (caller can
      // still render it as a polyline; minor visual artifacts at junctions are OK).
      existing.geometry.push(...segGeo);
    } else {
      byName.set(normalized, {
        name,
        normalizedName: normalized,
        geometry: segGeo,
      });
    }
  }

  return Array.from(byName.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "fr")
  );
}
