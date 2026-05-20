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

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

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

  const query = `
    [out:json][timeout:25];
    way["highway"~"^(residential|primary|secondary|tertiary|unclassified|living_street)$"]
       ["name"]
       (poly:"${poly}");
    out geom;
  `;

  const res = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error(`Overpass API error ${res.status}: ${await res.text().catch(() => "")}`);
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
