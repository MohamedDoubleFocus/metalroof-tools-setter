/**
 * Last-N PDF simulations history.
 *
 * Schema:
 *   sim-history:list      → list of last 5 simIds (LPUSH + LTRIM 0 4)
 *   sim-history:<simId>   → SimulationHistoryEntry (persistent)
 */

import { createClient, RedisClientType } from "redis";
import { getJson, setJsonPersistent, delKey } from "@/lib/kv";

const HISTORY_LIMIT = 5;
const LIST_KEY = "sim-history:list";

function entryKey(simId: string) {
  return `sim-history:${simId}`;
}

export interface SimulationHistoryEntry {
  simId: string;
  clientName?: string;
  pdfUrl: string;
  thumbnailUrl?: string;
  createdAt: number;
  source: "closer-direct" | "client-portal" | "email";
}

type RedisClient = RedisClientType<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>
>;

let client: RedisClient | null = null;
let connecting: Promise<void> | null = null;

function getUrl(): string {
  const url =
    process.env.STORAGE_REDIS_URL ||
    process.env.REDIS_URL ||
    process.env.KV_URL;
  if (!url) throw new Error("Redis URL non configuré");
  return url;
}

async function getClient(): Promise<RedisClient> {
  if (client && client.isOpen) return client;
  if (!client) {
    client = createClient({ url: getUrl() }) as RedisClient;
    client.on("error", (err) => console.error("[redis:sim-history]", err));
  }
  if (!client.isOpen) {
    if (!connecting) {
      connecting = client.connect().then(() => {
        connecting = null;
      });
    }
    await connecting;
  }
  return client;
}

export function generateSimId(): string {
  return `sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Push a new history entry. Prunes the list to HISTORY_LIMIT and deletes
 * orphaned entry blobs that fall off the end.
 */
export async function addToSimulationHistory(
  entry: SimulationHistoryEntry
): Promise<void> {
  const c = await getClient();
  await setJsonPersistent(entryKey(entry.simId), entry);
  await c.lPush(LIST_KEY, entry.simId);
  const overflow = await c.lRange(LIST_KEY, HISTORY_LIMIT, -1);
  if (overflow.length > 0) {
    await c.lTrim(LIST_KEY, 0, HISTORY_LIMIT - 1);
    await Promise.all(overflow.map((id) => delKey(entryKey(id))));
  }
}

export async function listSimulationHistory(): Promise<
  SimulationHistoryEntry[]
> {
  const c = await getClient();
  const ids = await c.lRange(LIST_KEY, 0, HISTORY_LIMIT - 1);
  if (ids.length === 0) return [];
  const entries = await Promise.all(
    ids.map((id) => getJson<SimulationHistoryEntry>(entryKey(id)))
  );
  return entries.filter((e): e is SimulationHistoryEntry => e !== null);
}
