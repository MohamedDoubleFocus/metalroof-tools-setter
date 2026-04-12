import { DirectionsResult } from "@/types/booking";

// Simple in-memory cache for direction results within the same server request lifecycle
const cache = new Map<string, DirectionsResult>();

function cacheKey(
  oLat: number,
  oLng: number,
  dLat: number,
  dLng: number
): string {
  // Round to 3 decimals (~100m precision) for cache hits
  return `${oLat.toFixed(3)},${oLng.toFixed(3)}->${dLat.toFixed(3)},${dLng.toFixed(3)}`;
}

export async function getTravelTime(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<DirectionsResult> {
  const key = cacheKey(originLat, originLng, destLat, destLng);
  const cached = cache.get(key);
  if (cached) return cached;

  const url = new URL(
    "https://maps.googleapis.com/maps/api/directions/json"
  );
  url.searchParams.set("origin", `${originLat},${originLng}`);
  url.searchParams.set("destination", `${destLat},${destLng}`);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("key", process.env.GOOGLE_MAPS_API_KEY!);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status !== "OK" || !data.routes?.[0]?.legs?.[0]) {
    // Fallback: estimate based on straight-line distance
    const distKm = haversine(originLat, originLng, destLat, destLng);
    const result: DirectionsResult = {
      durationMinutes: Math.round(distKm / 40 * 60), // ~40km/h average
      distanceKm: Math.round(distKm * 10) / 10,
    };
    cache.set(key, result);
    return result;
  }

  const leg = data.routes[0].legs[0];
  const result: DirectionsResult = {
    durationMinutes: Math.round(leg.duration.value / 60),
    distanceKm: Math.round(leg.distance.value / 100) / 10,
  };
  cache.set(key, result);
  return result;
}

function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
