import { DirectionsResult } from "@/types/booking";
import {
  getCachedDirections,
  setCachedDirections,
} from "./cache";
import { montrealHourOfDay } from "./timezone";

/**
 * Travel time between two points, with traffic-aware estimates and
 * a two-tier cache:
 *   L1 — in-memory map keyed per request lifecycle (cleared between invocations)
 *   L2 — Redis, keyed by (origin, dest, day-of-week, hour-of-day)
 *
 * Traffic patterns are stable enough that bucketing by DOW+hour gives
 * accurate estimates without re-calling Google for every search.
 */

const memCache = new Map<string, DirectionsResult>();

function bucketFromDeparture(departureUtc: Date): string {
  const dow = new Date(
    departureUtc.toLocaleString("en-US", { timeZone: "America/Toronto" })
  ).getDay(); // 0=Sun..6=Sat
  const hour = montrealHourOfDay(departureUtc);
  return `${dow}-${hour.toString().padStart(2, "0")}`;
}

function memKey(
  oLat: number,
  oLng: number,
  dLat: number,
  dLng: number,
  bucket: string
): string {
  return `${oLat.toFixed(3)},${oLng.toFixed(3)}->${dLat.toFixed(3)},${dLng.toFixed(3)}:${bucket}`;
}

export async function getTravelTime(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  /** Approximate moment of departure — used for traffic-aware estimate + cache bucketing */
  departure?: Date
): Promise<DirectionsResult> {
  const dep = departure ?? new Date();
  const bucket = bucketFromDeparture(dep);
  const mk = memKey(originLat, originLng, destLat, destLng, bucket);

  // L1
  const cachedMem = memCache.get(mk);
  if (cachedMem) return cachedMem;

  // L2 (Redis)
  const cachedRedis = await getCachedDirections(
    originLat,
    originLng,
    destLat,
    destLng,
    bucket
  );
  if (cachedRedis) {
    memCache.set(mk, cachedRedis);
    return cachedRedis;
  }

  // Live call to Google Directions
  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", `${originLat},${originLng}`);
  url.searchParams.set("destination", `${destLat},${destLng}`);
  url.searchParams.set("mode", "driving");

  // Traffic-aware: departure_time must be in the future (or "now") for live traffic.
  // For past dates we fall back to a generic estimate.
  const depSeconds = Math.floor(dep.getTime() / 1000);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (depSeconds >= nowSeconds) {
    url.searchParams.set("departure_time", String(depSeconds));
    url.searchParams.set("traffic_model", "best_guess");
  }
  url.searchParams.set("key", process.env.GOOGLE_MAPS_API_KEY!);

  let result: DirectionsResult;
  try {
    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.status !== "OK" || !data.routes?.[0]?.legs?.[0]) {
      // Fallback to straight-line estimate
      const distKm = haversine(originLat, originLng, destLat, destLng);
      result = {
        durationMinutes: Math.round((distKm / 40) * 60), // ~40km/h average
        distanceKm: Math.round(distKm * 10) / 10,
      };
    } else {
      const leg = data.routes[0].legs[0];
      // Prefer duration_in_traffic when available (traffic-aware request returned it)
      const durationSeconds =
        leg.duration_in_traffic?.value ?? leg.duration.value;
      result = {
        durationMinutes: Math.round(durationSeconds / 60),
        distanceKm: Math.round(leg.distance.value / 100) / 10,
      };
    }
  } catch (err) {
    console.error("[directions] live call failed:", err);
    const distKm = haversine(originLat, originLng, destLat, destLng);
    result = {
      durationMinutes: Math.round((distKm / 40) * 60),
      distanceKm: Math.round(distKm * 10) / 10,
    };
  }

  memCache.set(mk, result);
  // Fire-and-forget Redis write
  setCachedDirections(originLat, originLng, destLat, destLng, bucket, result).catch(
    () => {}
  );
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
