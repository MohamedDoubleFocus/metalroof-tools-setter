/**
 * Supabase Postgres storage for the roofing-report ordering module.
 *
 * Schema: see supabase/migrations/0001_initial.sql (table `report_orders`).
 * Public API (signatures) is preserved 1:1 from the previous Redis impl.
 */

import { supabase } from "@/lib/supabase";
import type {
  CreateReportOrderInput,
  ReportOrder,
  ReportStatus,
  UpdateReportOrderInput,
} from "@/types/reports";

const TABLE = "report_orders";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ro-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface ReportOrderRow {
  id: string;
  closer_label: string;
  client_phone: string | null;
  created_by_label: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  reference_photos: string[];
  status: string;
  pdf_url: string | null;
  unavailable_reason: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

const tsOrUndef = (v: string | null) => (v ? new Date(v).getTime() : undefined);
const strOrUndef = (v: string | null) => v ?? undefined;
const isoOrNull = (v: number | undefined) =>
  v !== undefined ? new Date(v).toISOString() : null;

function rowToReportOrder(row: ReportOrderRow): ReportOrder {
  return {
    id: row.id,
    closerLabel: row.closer_label,
    clientPhone: strOrUndef(row.client_phone),
    createdByLabel: strOrUndef(row.created_by_label),
    address: row.address,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    notes: strOrUndef(row.notes),
    referencePhotos: row.reference_photos ?? [],
    status: row.status as ReportStatus,
    pdfUrl: strOrUndef(row.pdf_url),
    unavailableReason: strOrUndef(row.unavailable_reason),
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    completedAt: tsOrUndef(row.completed_at),
  };
}

function reportOrderToRow(o: ReportOrder) {
  return {
    id: o.id,
    closer_label: o.closerLabel,
    client_phone: o.clientPhone ?? null,
    created_by_label: o.createdByLabel ?? null,
    address: o.address,
    lat: o.lat ?? null,
    lng: o.lng ?? null,
    notes: o.notes ?? null,
    reference_photos: o.referencePhotos ?? [],
    status: o.status,
    pdf_url: o.pdfUrl ?? null,
    unavailable_reason: o.unavailableReason ?? null,
    created_at: new Date(o.createdAt).toISOString(),
    updated_at: new Date(o.updatedAt).toISOString(),
    completed_at: isoOrNull(o.completedAt),
  };
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

  const { error } = await supabase.from(TABLE).insert(reportOrderToRow(order));
  if (error) throw new Error(`createReportOrder: ${error.message}`);
  return order;
}

export async function getReportOrder(id: string): Promise<ReportOrder | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getReportOrder: ${error.message}`);
  return data ? rowToReportOrder(data as ReportOrderRow) : null;
}

export async function listAllReportOrders(): Promise<ReportOrder[]> {
  const { data, error } = await supabase.from(TABLE).select("*");
  if (error) throw new Error(`listAllReportOrders: ${error.message}`);
  return (data as ReportOrderRow[]).map(rowToReportOrder);
}

export async function listReportOrdersByStatus(
  status: ReportStatus
): Promise<ReportOrder[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("status", status);
  if (error) throw new Error(`listReportOrdersByStatus: ${error.message}`);
  return (data as ReportOrderRow[]).map(rowToReportOrder);
}

/**
 * Generic update — pass any subset of mutable fields. Maintains completedAt
 * audit timestamp when status transitions to "ready".
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
    unavailableReason: patch.unavailableReason ?? existing.unavailableReason,
    updatedAt: Date.now(),
    completedAt:
      patch.status === "ready" && !existing.completedAt
        ? Date.now()
        : existing.completedAt,
  };

  const { error } = await supabase
    .from(TABLE)
    .update(reportOrderToRow(updated))
    .eq("id", id);
  if (error) throw new Error(`updateReportOrder: ${error.message}`);
  return updated;
}

export async function attachReportPdf(
  id: string,
  pdfUrl: string
): Promise<ReportOrder | null> {
  return updateReportOrder(id, { status: "ready", pdfUrl });
}

export async function deleteReportOrder(id: string): Promise<boolean> {
  const { error, count } = await supabase
    .from(TABLE)
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw new Error(`deleteReportOrder: ${error.message}`);
  return (count ?? 0) > 0;
}
