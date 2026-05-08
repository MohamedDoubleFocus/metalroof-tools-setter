import { createClient, RedisClientType } from "redis";

/**
 * Redis-backed storage for the client portal.
 *
 * Schema:
 *   code:<CODE>           → ClientCodeMeta (immutable metadata, TTL 7 days)
 *   code:<CODE>:used      → ClientCodeUsed (set with NX for atomic claim)
 *   code:<CODE>:results   → ClientCodeResults (after generation completes)
 *   ratelimit:<KEY>       → counter (TTL 5 min)
 *
 * Connection: uses node-redis with a singleton client that persists across
 * warm function invocations on Vercel.
 */

export interface ClientCodeMeta {
  code: string;
  clientName: string;
  phoneNumber: string; // E.164
  createdAt: number;
  expiresAt: number;
}

export interface ClientCodeUsed {
  usedAt: number;
}

export interface ClientCodeColorResult {
  colorKey: string;
  waveTileUrl?: string;
  standingSeamUrl?: string;
  shingleTileUrl?: string;
}

export interface ClientCodeResults {
  enhancedImageUrl: string;
  originalImageUrl: string;
  results: ClientCodeColorResult[];
  completedAt: number;
}

const CODE_TTL_DAYS = 7;
export const CODE_TTL_SECONDS = CODE_TTL_DAYS * 24 * 60 * 60;

// ─── Singleton Redis client ────────────────────────────────────────────────

type RedisClient = RedisClientType<Record<string, never>, Record<string, never>, Record<string, never>>;

let client: RedisClient | null = null;
let connectingPromise: Promise<void> | null = null;

function getRedisUrl(): string {
  const url =
    process.env.STORAGE_REDIS_URL ||
    process.env.REDIS_URL ||
    process.env.KV_URL;
  if (!url) {
    throw new Error(
      "Redis URL non configure. Definissez STORAGE_REDIS_URL dans les variables d'environnement."
    );
  }
  return url;
}

async function getClient(): Promise<RedisClient> {
  if (client && client.isOpen) return client;

  if (!client) {
    client = createClient({ url: getRedisUrl() }) as RedisClient;
    client.on("error", (err) => {
      console.error("[redis] connection error:", err);
    });
  }

  if (!client.isOpen) {
    if (!connectingPromise) {
      connectingPromise = client.connect().then(() => {
        connectingPromise = null;
      });
    }
    await connectingPromise;
  }

  return client;
}

// ─── Internal helpers ──────────────────────────────────────────────────────

function metaKey(code: string) {
  return `code:${code}`;
}
function usedKey(code: string) {
  return `code:${code}:used`;
}
function resultsKey(code: string) {
  return `code:${code}:results`;
}

async function getJson<T>(key: string): Promise<T | null> {
  const c = await getClient();
  const raw = await c.get(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setJson<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const c = await getClient();
  await c.set(key, JSON.stringify(value), { expiration: { type: "EX", value: ttlSeconds } });
}

// ─── Code metadata ─────────────────────────────────────────────────────────

export async function getCodeMeta(code: string): Promise<ClientCodeMeta | null> {
  return getJson<ClientCodeMeta>(metaKey(code));
}

export async function setCodeMeta(meta: ClientCodeMeta): Promise<void> {
  const ttl = remainingTtlSeconds(meta.expiresAt);
  await setJson(metaKey(meta.code), meta, ttl);
}

// ─── Used flag (atomic claim) ──────────────────────────────────────────────

export async function getCodeUsed(code: string): Promise<ClientCodeUsed | null> {
  return getJson<ClientCodeUsed>(usedKey(code));
}

/**
 * Atomically claim the code as "used" via SET NX. Returns true if we won
 * the claim, false if another caller already claimed it.
 */
export async function tryClaimCode(code: string, ttlSeconds: number): Promise<boolean> {
  const c = await getClient();
  const value: ClientCodeUsed = { usedAt: Date.now() };
  // node-redis v5 syntax: NX option + EX expiration
  const result = await c.set(usedKey(code), JSON.stringify(value), {
    NX: true,
    expiration: { type: "EX", value: Math.max(60, ttlSeconds) },
  });
  return result === "OK";
}

/**
 * Rollback a claim — only used if generation can't start after a successful claim.
 */
export async function releaseClaim(code: string): Promise<void> {
  const c = await getClient();
  await c.del(usedKey(code));
}

// ─── Results ───────────────────────────────────────────────────────────────

export async function getCodeResults(code: string): Promise<ClientCodeResults | null> {
  return getJson<ClientCodeResults>(resultsKey(code));
}

export async function setCodeResults(
  code: string,
  results: ClientCodeResults,
  ttlSeconds: number
): Promise<void> {
  await setJson(resultsKey(code), results, Math.max(60, ttlSeconds));
}

// ─── Rate limiting ─────────────────────────────────────────────────────────

/**
 * Increment a rate-limit counter. Returns the new count.
 * On first increment, sets a TTL window.
 */
export async function incrementRateLimit(
  key: string,
  windowSeconds: number
): Promise<number> {
  const c = await getClient();
  const fullKey = `ratelimit:${key}`;
  const count = await c.incr(fullKey);
  if (count === 1) {
    await c.expire(fullKey, windowSeconds);
  }
  return count;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export function remainingTtlSeconds(expiresAt: number): number {
  return Math.max(60, Math.floor((expiresAt - Date.now()) / 1000));
}
