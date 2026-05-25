/**
 * Redis storage for the roofing-report ordering module.
 *
 * Schema:
 *   report-order:<id>                → ReportOrder (persistent, no TTL)
 *   report-orders:all                → string[] of all order IDs
 *   report-orders:by-status:<status> → string[] of IDs in that status
 *
 * Reuses the singleton Redis client + JSON helpers from src/lib/kv.ts.
 */

import { getJson, setJsonPersistent, delKey } from "@/lib/kv";
import type {
  CreateReportOrderInput,
  ReportOrder,
  ReportStatus,
  UpdateReportOrderInput,
} from "@/types/reports";

// ─── Keys ────────────────────────────────────────────────────────────────

const orderKey = (id: string) => `report-order:${id}`;
const allOrdersKey = () => `report-orders:all`;
const byStatusKey = (status: ReportStatus) =>
  `report-orders:by-status:${status}`;

// ─── Helpers ─────────────────────────────────────────────────────────────

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ro-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

// ─── CRUD ────────────────────────────────────────────────────────────────

export async function createReportOrder(
  input: CreateReportOrderInput
): Promise<ReportOrder> {
  const now = Date.now();
  const id = newId();
  const order: ReportOrder = {
    id,
    closerLabel: input.closerLabel.trim() || "Client",
    clientPhone: input.clientPhone?.trim() || undefined,
    createdByLabel: input.createdByLabel?.trim() || undefined,
    address: input.address.trim(),
    lat: input.lat,
    lng: input.lng,
    notes: input.notes?.trim() || undefined,
    referencePhotos: input.referencePhotos ?? [],
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  await setJsonPersistent(orderKey(id), order);
  await pushToList(allOrdersKey(), id);
  await pushToList(byStatusKey("pending"), id);

  return order;
}

export async function getReportOrder(id: string): Promise<ReportOrder | null> {
  return getJson<ReportOrder>(orderKey(id));
}

export async function listAllReportOrders(): Promise<ReportOrder[]> {
  const ids = await getList(allOrdersKey());
  if (ids.length === 0) return [];
  const orders = await Promise.all(ids.map((id) => getReportOrder(id)));
  return orders.filter((o): o is ReportOrder => o !== null);
}

export async function listReportOrdersByStatus(
  status: ReportStatus
): Promise<ReportOrder[]> {
  const ids = await getList(byStatusKey(status));
  if (ids.length === 0) return [];
  const orders = await Promise.all(ids.map((id) => getReportOrder(id)));
  return orders.filter((o): o is ReportOrder => o !== null);
}

/**
 * Generic update — pass any subset of mutable fields.
 * Maintains the by-status indexes if status changes.
 */
export async function updateReportOrder(
  id: string,
  patch: UpdateReportOrderInput
): Promise<ReportOrder | null> {
  const existing = await getReportOrder(id);
  if (!existing) return null;

  const updated: ReportOrder = {
    ...existing,
    status: patch.status ?? existing.status,
    pdfUrl: patch.pdfUrl ?? existing.pdfUrl,
    notes: patch.notes ?? existing.notes,
    closerLabel: patch.closerLabel ?? existing.closerLabel,
    clientPhone: patch.clientPhone ?? existing.clientPhone,
    updatedAt: Date.now(),
    completedAt:
      patch.status === "ready" && !existing.completedAt
        ? Date.now()
        : existing.completedAt,
  };

  await setJsonPersistent(orderKey(id), updated);

  // Maintain by-status index
  if (patch.status && patch.status !== existing.status) {
    await removeFromList(byStatusKey(existing.status), id);
    await pushToList(byStatusKey(patch.status), id);
  }

  return updated;
}

/**
 * Attach the freelancer-uploaded PDF and flip status to "ready".
 * Convenience wrapper around updateReportOrder.
 */
export async function attachReportPdf(
  id: string,
  pdfUrl: string
): Promise<ReportOrder | null> {
  return updateReportOrder(id, { status: "ready", pdfUrl });
}

export async function deleteReportOrder(id: string): Promise<boolean> {
  const order = await getReportOrder(id);
  if (!order) return false;

  await delKey(orderKey(id));
  await removeFromList(allOrdersKey(), id);
  await removeFromList(byStatusKey(order.status), id);
  return true;
}
