/**
 * Supabase Postgres storage for the chantiers module.
 *
 * Public API (signatures) is preserved 1:1 from the previous Redis impl —
 * everything that imports from this file continues to work unchanged.
 *
 * Schema: see supabase/migrations/0001_initial.sql (table `chantiers`).
 * Status & by-status filtering is now a plain SQL WHERE — no more manually
 * maintained index lists.
 */

import { supabase } from "@/lib/supabase";
import type {
  Chantier,
  ChantierStatus,
  CreateChantierInput,
  UpdateChantierInput,
} from "@/types/chantiers";

const TABLE = "chantiers";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Row ↔ Chantier conversion ───────────────────────────────────────────

interface ChantierRow {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  address_line1: string;
  address_line2: string | null;
  lat: number | null;
  lng: number | null;
  submission_url: string | null;
  roofr_url: string | null;
  style: string | null;
  color_key: string | null;
  urgency: string;
  team: string | null;
  status: string;
  signed_at: string;
  scheduled_date: string | null;
  priority: number | null;
  total_amount: string | number | null; // numeric returns as string from supabase-js
  notes: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  sms_j7_sent_at: string | null;
  sms_j2_sent_at: string | null;
  warranty_sent_at: string | null;
  invoice_sent_at: string | null;
  invoice_pdf_url: string | null;
}

const tsOrUndef = (v: string | null) => (v ? new Date(v).getTime() : undefined);
const strOrUndef = (v: string | null) => v ?? undefined;

function rowToChantier(row: ChantierRow): Chantier {
  return {
    id: row.id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    clientEmail: strOrUndef(row.client_email),
    addressLine1: row.address_line1,
    addressLine2: strOrUndef(row.address_line2),
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    submissionUrl: strOrUndef(row.submission_url),
    roofrUrl: strOrUndef(row.roofr_url),
    style: (row.style as Chantier["style"]) ?? undefined,
    colorKey: strOrUndef(row.color_key),
    urgency: row.urgency as Chantier["urgency"],
    team: (row.team as Chantier["team"]) ?? undefined,
    status: row.status as ChantierStatus,
    signedAt: new Date(row.signed_at).getTime(),
    scheduledDate: strOrUndef(row.scheduled_date),
    priority: row.priority ?? undefined,
    totalAmount: row.total_amount != null ? Number(row.total_amount) : undefined,
    notes: strOrUndef(row.notes),
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    startedAt: tsOrUndef(row.started_at),
    completedAt: tsOrUndef(row.completed_at),
    smsJ7SentAt: tsOrUndef(row.sms_j7_sent_at),
    smsJ2SentAt: tsOrUndef(row.sms_j2_sent_at),
    warrantySentAt: tsOrUndef(row.warranty_sent_at),
    invoiceSentAt: tsOrUndef(row.invoice_sent_at),
    invoicePdfUrl: strOrUndef(row.invoice_pdf_url),
  };
}

const isoOrNull = (v: number | undefined) =>
  v !== undefined ? new Date(v).toISOString() : null;

function chantierToRow(c: Chantier) {
  return {
    id: c.id,
    client_name: c.clientName,
    client_phone: c.clientPhone,
    client_email: c.clientEmail ?? null,
    address_line1: c.addressLine1,
    address_line2: c.addressLine2 ?? null,
    lat: c.lat ?? null,
    lng: c.lng ?? null,
    submission_url: c.submissionUrl ?? null,
    roofr_url: c.roofrUrl ?? null,
    style: c.style ?? null,
    color_key: c.colorKey ?? null,
    urgency: c.urgency,
    team: c.team ?? null,
    status: c.status,
    signed_at: new Date(c.signedAt).toISOString(),
    scheduled_date: c.scheduledDate ?? null,
    priority: c.priority ?? null,
    total_amount: c.totalAmount ?? null,
    notes: c.notes ?? null,
    created_at: new Date(c.createdAt).toISOString(),
    updated_at: new Date(c.updatedAt).toISOString(),
    started_at: isoOrNull(c.startedAt),
    completed_at: isoOrNull(c.completedAt),
    sms_j7_sent_at: isoOrNull(c.smsJ7SentAt),
    sms_j2_sent_at: isoOrNull(c.smsJ2SentAt),
    warranty_sent_at: isoOrNull(c.warrantySentAt),
    invoice_sent_at: isoOrNull(c.invoiceSentAt),
    invoice_pdf_url: c.invoicePdfUrl ?? null,
  };
}

// ─── CRUD ────────────────────────────────────────────────────────────────

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
    submissionUrl: input.submissionUrl?.trim() || undefined,
    roofrUrl: input.roofrUrl?.trim() || undefined,
    style: input.style,
    colorKey: input.colorKey?.trim() || undefined,
    urgency: input.urgency ?? "non_urgent",
    team: input.team,
    status: "scheduled",
    signedAt: input.signedAt ?? now,
    scheduledDate: input.scheduledDate?.trim() || undefined,
    priority: input.priority,
    totalAmount: input.totalAmount,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase.from(TABLE).insert(chantierToRow(chantier));
  if (error) throw new Error(`createChantier: ${error.message}`);
  return chantier;
}

export async function getChantier(id: string): Promise<Chantier | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getChantier: ${error.message}`);
  return data ? rowToChantier(data as ChantierRow) : null;
}

export async function listAllChantiers(): Promise<Chantier[]> {
  const { data, error } = await supabase.from(TABLE).select("*");
  if (error) throw new Error(`listAllChantiers: ${error.message}`);
  return (data as ChantierRow[]).map(rowToChantier);
}

export async function listChantiersByStatus(
  status: ChantierStatus
): Promise<Chantier[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("status", status);
  if (error) throw new Error(`listChantiersByStatus: ${error.message}`);
  return (data as ChantierRow[]).map(rowToChantier);
}

export { sortQueueOrder } from "./kv-client";

/**
 * Reassign priorities to match a new in-column order. Priority 1 = top.
 * Called by /api/chantiers/reorder when a card is dragged within a column.
 */
export async function reorderChantiers(
  orderedInColumn: string[]
): Promise<void> {
  const updatedAt = new Date().toISOString();
  await Promise.all(
    orderedInColumn.map(async (id, idx) => {
      const { error } = await supabase
        .from(TABLE)
        .update({ priority: idx + 1, updated_at: updatedAt })
        .eq("id", id);
      if (error) {
        console.error(`reorderChantiers(${id}): ${error.message}`);
      }
    })
  );
}

/**
 * Generic patch — same merge logic as before. Maintains audit timestamps on
 * status transitions (startedAt / completedAt).
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
  const submissionUrl =
    patch.submissionUrl === undefined
      ? existing.submissionUrl
      : patch.submissionUrl === null
        ? undefined
        : patch.submissionUrl.trim() || undefined;
  const roofrUrl =
    patch.roofrUrl === undefined
      ? existing.roofrUrl
      : patch.roofrUrl === null
        ? undefined
        : patch.roofrUrl.trim() || undefined;
  const style =
    patch.style === undefined
      ? existing.style
      : patch.style === null
        ? undefined
        : patch.style;
  const colorKey =
    patch.colorKey === undefined
      ? existing.colorKey
      : patch.colorKey === null
        ? undefined
        : patch.colorKey.trim() || undefined;
  const team =
    patch.team === undefined
      ? existing.team
      : patch.team === null
        ? undefined
        : patch.team;

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
    submissionUrl,
    roofrUrl,
    style,
    colorKey,
    urgency: patch.urgency ?? existing.urgency ?? "non_urgent",
    team,
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

  const { error } = await supabase
    .from(TABLE)
    .update(chantierToRow(updated))
    .eq("id", id);
  if (error) throw new Error(`updateChantier: ${error.message}`);
  return updated;
}

/**
 * Mutate Chantier fields directly without going through the patch helper
 * (used for marker timestamps from server-side actions like cron / send).
 */
export async function setChantierFields(
  id: string,
  fields: Partial<
    Pick<
      Chantier,
      | "smsJ7SentAt"
      | "smsJ2SentAt"
      | "warrantySentAt"
      | "invoiceSentAt"
      | "invoicePdfUrl"
      | "lat"
      | "lng"
      | "priority"
    >
  >
): Promise<Chantier | null> {
  const existing = await getChantier(id);
  if (!existing) return null;
  const updated: Chantier = {
    ...existing,
    ...fields,
    updatedAt: Date.now(),
  };
  const { error } = await supabase
    .from(TABLE)
    .update(chantierToRow(updated))
    .eq("id", id);
  if (error) throw new Error(`setChantierFields: ${error.message}`);
  return updated;
}

export async function deleteChantier(id: string): Promise<boolean> {
  const { error, count } = await supabase
    .from(TABLE)
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw new Error(`deleteChantier: ${error.message}`);
  return (count ?? 0) > 0;
}
