/**
 * Redis storage for the chantiers module.
 *
 * Schema:
 *   chantier:<id>                     → Chantier (persistent)
 *   chantiers:all                     → string[] of all ids
 *   chantiers:by-status:<status>      → string[] of ids in that status
 *
 * Reuses the singleton Redis client + JSON helpers from src/lib/kv.ts.
 */

import { getJson, setJsonPersistent, delKey } from "@/lib/kv";
import type {
  Chantier,
  ChantierStatus,
  CreateChantierInput,
  UpdateChantierInput,
} from "@/types/chantiers";

const orderKey = (id: string) => `chantier:${id}`;
const allKey = () => `chantiers:all`;
const byStatusKey = (status: ChantierStatus) =>
  `chantiers:by-status:${status}`;

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function pushToList(key: string, value: string): Promise<void> {
  const list = (await getJson<string[]>(key)) ?? [];
  if (!list.includes(value)) list.push(value);
  await setJsonPersistent(key, list);
}

async function removeFromList(key: string, value: string): Promise<void> {
  const list = (await getJson<string[]>(key)) ?? [];
  await setJsonPersistent(
    key,
    list.filter((v) => v !== value)
  );
}

async function getList(key: string): Promise<string[]> {
  return (await getJson<string[]>(key)) ?? [];
}

export async function createChantier(
  input: CreateChantierInput
): Promise<Chantier> {
  const now = Date.now();
  const id = newId();
  const chantier: Chantier = {
    id,
    clientName: input.clientName.trim(),
    clientPhone: input.clientPhone.trim(),
    clientEmail: input.clientEmail?.trim().toLowerCase() || undefined,
    addressLine1: input.addressLine1.trim(),
    addressLine2: input.addressLine2?.trim() || undefined,
    status: "scheduled",
    signedAt: input.signedAt ?? now,
    scheduledDate: input.scheduledDate?.trim() || undefined,
    priority: input.priority,
    totalAmount: input.totalAmount,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  await setJsonPersistent(orderKey(id), chantier);
  await pushToList(allKey(), id);
  await pushToList(byStatusKey("scheduled"), id);

  return chantier;
}

export async function getChantier(id: string): Promise<Chantier | null> {
  return getJson<Chantier>(orderKey(id));
}

export async function listAllChantiers(): Promise<Chantier[]> {
  const ids = await getList(allKey());
  if (ids.length === 0) return [];
  const items = await Promise.all(ids.map((id) => getChantier(id)));
  return items.filter((c): c is Chantier => c !== null);
}

export async function listChantiersByStatus(
  status: ChantierStatus
): Promise<Chantier[]> {
  const ids = await getList(byStatusKey(status));
  if (ids.length === 0) return [];
  const items = await Promise.all(ids.map((id) => getChantier(id)));
  return items.filter((c): c is Chantier => c !== null);
}

/**
 * Apply default queue ordering: priority asc (smaller = first), null last,
 * then signedAt asc.
 */
export function sortQueueOrder(chantiers: Chantier[]): Chantier[] {
  return [...chantiers].sort((a, b) => {
    const pa = a.priority ?? Number.POSITIVE_INFINITY;
    const pb = b.priority ?? Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa - pb;
    return a.signedAt - b.signedAt;
  });
}

/**
 * Generic patch — pass any mutable field. null clears optional values.
 * Maintains by-status indexes and audit timestamps on status transitions.
 */
export async function updateChantier(
  id: string,
  patch: UpdateChantierInput
): Promise<Chantier | null> {
  const existing = await getChantier(id);
  if (!existing) return null;

  // Apply nullable patches: undefined keeps existing, null clears, value sets.
  const scheduledDate =
    patch.scheduledDate === undefined
      ? existing.scheduledDate
      : patch.scheduledDate === null
        ? undefined
        : patch.scheduledDate;
  const priority =
    patch.priority === undefined
      ? existing.priority
      : patch.priority === null
        ? undefined
        : patch.priority;
  const totalAmount =
    patch.totalAmount === undefined
      ? existing.totalAmount
      : patch.totalAmount === null
        ? undefined
        : patch.totalAmount;
  const notes =
    patch.notes === undefined
      ? existing.notes
      : patch.notes === null
        ? undefined
        : patch.notes;

  const now = Date.now();
  const updated: Chantier = {
    ...existing,
    clientName: patch.clientName?.trim() || existing.clientName,
    clientPhone: patch.clientPhone?.trim() || existing.clientPhone,
    clientEmail:
      patch.clientEmail === undefined
        ? existing.clientEmail
        : patch.clientEmail?.trim().toLowerCase() || undefined,
    addressLine1: patch.addressLine1?.trim() || existing.addressLine1,
    addressLine2:
      patch.addressLine2 === undefined
        ? existing.addressLine2
        : patch.addressLine2?.trim() || undefined,
    status: patch.status ?? existing.status,
    signedAt: patch.signedAt ?? existing.signedAt,
    scheduledDate,
    priority,
    totalAmount,
    notes,
    updatedAt: now,
    startedAt:
      patch.status === "in_progress" && !existing.startedAt
        ? now
        : existing.startedAt,
    completedAt:
      patch.status === "done" && !existing.completedAt
        ? now
        : existing.completedAt,
  };

  await setJsonPersistent(orderKey(id), updated);

  if (patch.status && patch.status !== existing.status) {
    await removeFromList(byStatusKey(existing.status), id);
    await pushToList(byStatusKey(patch.status), id);
  }

  return updated;
}

/**
 * Mutate Chantier fields directly without going through the patch helper
 * (used for marker timestamps from server-side actions like cron / send).
 */
export async function setChantierFields(
  id: string,
  fields: Partial<Pick<Chantier,
    | "smsJ7SentAt"
    | "smsJ2SentAt"
    | "warrantySentAt"
    | "invoiceSentAt"
    | "invoicePdfUrl"
  >>
): Promise<Chantier | null> {
  const existing = await getChantier(id);
  if (!existing) return null;
  const updated: Chantier = {
    ...existing,
    ...fields,
    updatedAt: Date.now(),
  };
  await setJsonPersistent(orderKey(id), updated);
  return updated;
}

export async function deleteChantier(id: string): Promise<boolean> {
  const existing = await getChantier(id);
  if (!existing) return false;
  await delKey(orderKey(id));
  await removeFromList(allKey(), id);
  await removeFromList(byStatusKey(existing.status), id);
  return true;
}
