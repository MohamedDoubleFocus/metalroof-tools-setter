/**
 * Persistent caches (Redis) for the booking module.
 *
 * Two namespaces:
 *   booking:geo:<address-hash>           → { lat, lng }              (TTL 30 days)
 *   booking:dir:<from>->:<to>:<bucket>   → { durationMinutes, distanceKm } (TTL 7 days)
 *
 * `bucket` is "DOW-HH" so traffic-aware travel times are cached per
 * (origin, destination, day-of-week, hour-of-day). Same Mon-9am call
 * across different weeks reuses the same cache slot.
 *
 * Failures (Redis down, missing env) are swallowed silently — the
 * booking flow keeps working without a cache, just slower.
 */

import { createClient, RedisClientType } from "redis";

type RedisClient = RedisClientType<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>
>;

const GEO_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const DIR_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

let client: RedisClient | null = null;
let connectingPromise: Promise<void> | null = null;
let disabled = false;

function getRedisUrl(): string | null {
  return (
    process.env.STORAGE_REDIS_URL ||
    process.env.REDIS_URL ||
    process.env.KV_URL ||
    null
  );
}

async function getClient(): Promise<RedisClient | null> {
  if (disabled) return null;
  const url = getRedisUrl();
  if (!url) {
    disabled = true;
    return null;
  }

  if (client && client.isOpen) return client;

  if (!client) {
    client = createClient({ url }) as RedisClient;
    client.on("error", (err) => {
      console.error("[booking-cache] redis error:", err);
    });
  }

  if (!client.isOpen) {
    if (!connectingPromise) {
      connectingPromise = client
        .connect()
        .then(() => {
          connectingPromise = null;
        })
        .catch((err) => {
          console.error("[booking-cache] connect failed, disabling cache:", err);
          disabled = true;
          connectingPromise = null;
        });
    }
    await connectingPromise;
    if (disabled) return null;
  }

  return client;
}

async function safeGet<T>(key: string): Promise<T | null> {
  try {
    const c = await getClient();
    if (!c) return null;
    const raw = await c.get(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function safeSet<T>(key: string, value: T, ttl: number): Promise<void> {
  try {
    const c = await getClient();
    if (!c) return;
    await c.set(key, JSON.stringify(value), {
      expiration: { type: "EX", value: ttl },
    });
  } catch {
    // best-effort
  }
}

// ─── Geocode cache ─────────────────────────────────────────────────────────

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

function geoKey(address: string): string {
  return `booking:geo:${normalizeAddress(address)}`;
}

export async function getCachedGeocode(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  return safeGet<{ lat: number; lng: number }>(geoKey(address));
}

export async function setCachedGeocode(
  address: string,
  coords: { lat: number; lng: number }
): Promise<void> {
  await safeSet(geoKey(address), coords, GEO_TTL_SECONDS);
}

// ─── Directions cache ──────────────────────────────────────────────────────

export interface CachedDirections {
  durationMinutes: number;
  distanceKm: number;
}

function dirKey(
  oLat: number,
  oLng: number,
  dLat: number,
  dLng: number,
  bucket: string
): string {
  // Round to 3 decimals (~100m) — enough for traffic patterns at residential scale
  return `booking:dir:${oLat.toFixed(3)},${oLng.toFixed(3)}->${dLat.toFixed(3)},${dLng.toFixed(3)}:${bucket}`;
}

export async function getCachedDirections(
  oLat: number,
  oLng: number,
  dLat: number,
  dLng: number,
  bucket: string
): Promise<CachedDirections | null> {
  return safeGet<CachedDirections>(dirKey(oLat, oLng, dLat, dLng, bucket));
}

export async function setCachedDirections(
  oLat: number,
  oLng: number,
  dLat: number,
  dLng: number,
  bucket: string,
  value: CachedDirections
): Promise<void> {
  await safeSet(dirKey(oLat, oLng, dLat, dLng, bucket), value, DIR_TTL_SECONDS);
}
