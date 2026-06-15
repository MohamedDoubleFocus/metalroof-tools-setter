/**
 * Supabase Postgres storage for the prospection module.
 *
 * Schema: see supabase/migrations/0001_initial.sql
 *   tables: leads, sectors, streets, sector_assignments
 *
 * Public API (signatures) is preserved 1:1 from the previous Redis impl —
 * everything that imports from this file continues to work unchanged.
 *
 * Note on `Sector.streetIds`: in Redis this was a denormalized array stored
 * on the sector. With Postgres the FK relationship (streets.sector_id) is
 * the source of truth; getSector / listSectors derive `streetIds` via a
 * join query.
 */

import { supabase } from "@/lib/supabase";
import { getKnockerName } from "./knockers";
import { normalizeStreetName, streetId } from "./streets";
import type {
  Lead,
  Sector,
  Street,
  SectorAssignment,
  CreateLeadInput,
  UpdateLeadInput,
  CreateSectorInput,
  CreateAssignmentInput,
  LeadStatus,
} from "@/types/prospection";

// ─── ID generation + utils ───────────────────────────────────────────────

function dateKey(timestampMs: number): string {
  const d = new Date(timestampMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const tsOrUndef = (v: string | null) => (v ? new Date(v).getTime() : undefined);
const strOrUndef = (v: string | null) => v ?? undefined;
const isoOrNull = (v: number | undefined) =>
  v !== undefined ? new Date(v).toISOString() : null;

// ─── Leads ───────────────────────────────────────────────────────────────

interface LeadRow {
  id: string;
  knocker_id: string;
  knocker_name: string;
  client_name: string | null;
  client_phone: string | null;
  address: string;
  street_name: string;
  house_number: string;
  lat: number;
  lng: number;
  status: string;
  meeting_at: string | null;
  follow_up_at: string | null;
  notes: string | null;
  photo_url: string | null;
  sector_id: string | null;
  created_at: string;
  updated_at: string;
}

function rowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    knockerId: row.knocker_id,
    knockerName: row.knocker_name,
    clientName: strOrUndef(row.client_name),
    clientPhone: strOrUndef(row.client_phone),
    address: row.address,
    streetName: row.street_name,
    houseNumber: row.house_number,
    lat: row.lat,
    lng: row.lng,
    status: row.status as LeadStatus,
    meetingAt: tsOrUndef(row.meeting_at),
    followUpAt: tsOrUndef(row.follow_up_at),
    notes: strOrUndef(row.notes),
    photoUrl: strOrUndef(row.photo_url),
    sectorId: strOrUndef(row.sector_id),
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

function leadToRow(l: Lead) {
  return {
    id: l.id,
    knocker_id: l.knockerId,
    knocker_name: l.knockerName,
    client_name: l.clientName ?? null,
    client_phone: l.clientPhone ?? null,
    address: l.address,
    street_name: l.streetName,
    house_number: l.houseNumber,
    lat: l.lat,
    lng: l.lng,
    status: l.status,
    meeting_at: isoOrNull(l.meetingAt),
    follow_up_at: isoOrNull(l.followUpAt),
    notes: l.notes ?? null,
    photo_url: l.photoUrl ?? null,
    sector_id: l.sectorId ?? null,
    created_at: new Date(l.createdAt).toISOString(),
    updated_at: new Date(l.updatedAt).toISOString(),
  };
}

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const now = Date.now();
  const id = newId();
  const lead: Lead = {
    id,
    knockerId: input.knockerId,
    knockerName: getKnockerName(input.knockerId),
    clientName: input.clientName?.trim() || undefined,
    clientPhone: input.clientPhone?.trim() || undefined,
    address: input.address,
    streetName: normalizeStreetName(input.streetName),
    houseNumber: input.houseNumber,
    lat: input.lat,
    lng: input.lng,
    status: input.status,
    meetingAt: input.meetingAt,
    followUpAt: input.followUpAt,
    notes: input.notes,
    photoUrl: input.photoUrl,
    sectorId: input.sectorId,
    createdAt: now,
    updatedAt: now,
  };
  const { error } = await supabase.from("leads").insert(leadToRow(lead));
  if (error) throw new Error(`createLead: ${error.message}`);
  return lead;
}

export async function getLead(id: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getLead: ${error.message}`);
  return data ? rowToLead(data as LeadRow) : null;
}

export async function updateLead(
  id: string,
  patch: UpdateLeadInput
): Promise<Lead | null> {
  const existing = await getLead(id);
  if (!existing) return null;
  const updated: Lead = {
    ...existing,
    clientName: patch.clientName ?? existing.clientName,
    clientPhone: patch.clientPhone ?? existing.clientPhone,
    status: patch.status ?? existing.status,
    meetingAt:
      patch.meetingAt === null
        ? undefined
        : (patch.meetingAt ?? existing.meetingAt),
    followUpAt:
      patch.followUpAt === null
        ? undefined
        : (patch.followUpAt ?? existing.followUpAt),
    notes: patch.notes ?? existing.notes,
    photoUrl: patch.photoUrl ?? existing.photoUrl,
    updatedAt: Date.now(),
  };
  const { error } = await supabase
    .from("leads")
    .update(leadToRow(updated))
    .eq("id", id);
  if (error) throw new Error(`updateLead: ${error.message}`);
  return updated;
}

export async function deleteLead(id: string): Promise<boolean> {
  const { error, count } = await supabase
    .from("leads")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw new Error(`deleteLead: ${error.message}`);
  return (count ?? 0) > 0;
}

export async function listLeadsByDate(date: string): Promise<Lead[]> {
  // date is YYYY-MM-DD. Filter leads created on that calendar day.
  const dayStart = `${date}T00:00:00.000Z`;
  // Add 24h for the end. Cheap arithmetic on the YYYY-MM-DD format works.
  const next = new Date(dayStart);
  next.setUTCDate(next.getUTCDate() + 1);
  const dayEnd = next.toISOString();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .gte("created_at", dayStart)
    .lt("created_at", dayEnd);
  if (error) throw new Error(`listLeadsByDate: ${error.message}`);
  return (data as LeadRow[]).map(rowToLead);
}

export async function listAllLeads(): Promise<Lead[]> {
  const { data, error } = await supabase.from("leads").select("*");
  if (error) throw new Error(`listAllLeads: ${error.message}`);
  return (data as LeadRow[]).map(rowToLead);
}

// ─── Sectors ─────────────────────────────────────────────────────────────

interface SectorRow {
  id: string;
  name: string;
  polygon: { lat: number; lng: number }[];
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  created_by: string;
  created_by_name: string;
}

function rowToSector(row: SectorRow, streetIds: string[] = []): Sector {
  return {
    id: row.id,
    name: row.name,
    polygon: row.polygon,
    notes: strOrUndef(row.notes),
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    streetIds,
  };
}

function sectorToRow(s: Sector) {
  return {
    id: s.id,
    name: s.name,
    polygon: s.polygon,
    notes: s.notes ?? null,
    created_at: new Date(s.createdAt).toISOString(),
    updated_at: isoOrNull(s.updatedAt),
    created_by: s.createdBy,
    created_by_name: s.createdByName,
  };
}

export async function createSector(
  input: CreateSectorInput
): Promise<Sector> {
  const now = Date.now();
  const id = newId();
  const sector: Sector = {
    id,
    name: input.name,
    polygon: input.polygon,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    createdBy: input.knockerId,
    createdByName: getKnockerName(input.knockerId),
    streetIds: [],
  };
  const { error } = await supabase.from("sectors").insert(sectorToRow(sector));
  if (error) throw new Error(`createSector: ${error.message}`);
  return sector;
}

export async function updateSector(
  id: string,
  patch: { name?: string; notes?: string | null }
): Promise<Sector | null> {
  const existing = await getSector(id);
  if (!existing) return null;
  const updated: Sector = {
    ...existing,
    name: patch.name?.trim() || existing.name,
    notes:
      patch.notes === null
        ? undefined
        : patch.notes !== undefined
          ? patch.notes.trim() || undefined
          : existing.notes,
    updatedAt: Date.now(),
  };
  const { error } = await supabase
    .from("sectors")
    .update(sectorToRow(updated))
    .eq("id", id);
  if (error) throw new Error(`updateSector: ${error.message}`);
  return updated;
}

export async function getSector(id: string): Promise<Sector | null> {
  const { data, error } = await supabase
    .from("sectors")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getSector: ${error.message}`);
  if (!data) return null;

  // Derive streetIds via FK
  const { data: streetIdsRows, error: sErr } = await supabase
    .from("streets")
    .select("id")
    .eq("sector_id", id);
  if (sErr) throw new Error(`getSector(streets): ${sErr.message}`);
  const streetIds = (streetIdsRows ?? []).map((r) => (r as { id: string }).id);

  return rowToSector(data as SectorRow, streetIds);
}

export async function listSectors(): Promise<Sector[]> {
  const { data, error } = await supabase.from("sectors").select("*");
  if (error) throw new Error(`listSectors: ${error.message}`);
  const sectors = data as SectorRow[];
  if (sectors.length === 0) return [];

  // Fetch all street→sector mappings in one query and group locally.
  const { data: streetRows, error: sErr } = await supabase
    .from("streets")
    .select("id, sector_id");
  if (sErr) throw new Error(`listSectors(streets): ${sErr.message}`);
  const byKey = new Map<string, string[]>();
  for (const r of (streetRows ?? []) as { id: string; sector_id: string }[]) {
    const arr = byKey.get(r.sector_id) ?? [];
    arr.push(r.id);
    byKey.set(r.sector_id, arr);
  }

  return sectors.map((s) => rowToSector(s, byKey.get(s.id) ?? []));
}

/**
 * No-op in Postgres: the streets ↔ sector relationship is captured by the
 * streets.sector_id FK at insert time (see createStreetsBulk). Kept as a
 * function so existing callers compile, but the streetIds parameter is
 * ignored (the truth is the FK). Returns the sector with its now-derived
 * streetIds for consistency with the previous behavior.
 */
export async function setSectorStreetIds(
  sectorId: string,
  _streetIds: string[]
): Promise<Sector | null> {
  void _streetIds;
  return getSector(sectorId);
}

export async function deleteSector(id: string): Promise<boolean> {
  // Streets cascade-delete via the FK. Just delete the sector.
  const { error, count } = await supabase
    .from("sectors")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw new Error(`deleteSector: ${error.message}`);
  return (count ?? 0) > 0;
}

// ─── Streets ─────────────────────────────────────────────────────────────

interface StreetRow {
  id: string;
  sector_id: string;
  name: string;
  normalized_name: string;
  geometry: { lat: number; lng: number }[];
  done_at: string | null;
  done_by: string | null;
  done_by_name: string | null;
}

function rowToStreet(row: StreetRow): Street {
  return {
    id: row.id,
    sectorId: row.sector_id,
    name: row.name,
    normalizedName: row.normalized_name,
    geometry: row.geometry,
    doneAt: tsOrUndef(row.done_at),
    doneBy: strOrUndef(row.done_by),
    doneByName: strOrUndef(row.done_by_name),
  };
}

function streetToRow(s: Street) {
  return {
    id: s.id,
    sector_id: s.sectorId,
    name: s.name,
    normalized_name: s.normalizedName,
    geometry: s.geometry,
    done_at: isoOrNull(s.doneAt),
    done_by: s.doneBy ?? null,
    done_by_name: s.doneByName ?? null,
  };
}

export async function createStreetsBulk(
  sectorId: string,
  rawStreets: Array<{
    name: string;
    normalizedName: string;
    geometry: { lat: number; lng: number }[];
  }>
): Promise<string[]> {
  if (rawStreets.length === 0) return [];
  const ids: string[] = [];
  const rows = rawStreets.map((s) => {
    const id = streetId(sectorId, s.normalizedName);
    ids.push(id);
    const street: Street = {
      id,
      sectorId,
      name: s.name,
      normalizedName: s.normalizedName,
      geometry: s.geometry,
    };
    return streetToRow(street);
  });
  // Upsert on id to be idempotent (same sector + same normalized name = same id).
  const { error } = await supabase.from("streets").upsert(rows, {
    onConflict: "id",
  });
  if (error) throw new Error(`createStreetsBulk: ${error.message}`);
  return ids;
}

export async function getStreet(id: string): Promise<Street | null> {
  const { data, error } = await supabase
    .from("streets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getStreet: ${error.message}`);
  return data ? rowToStreet(data as StreetRow) : null;
}

export async function listStreetsForSector(
  sectorId: string
): Promise<Street[]> {
  const { data, error } = await supabase
    .from("streets")
    .select("*")
    .eq("sector_id", sectorId);
  if (error) throw new Error(`listStreetsForSector: ${error.message}`);
  return (data as StreetRow[]).map(rowToStreet);
}

export async function toggleStreetDone(
  streetId: string,
  knockerId: string,
  done: boolean
): Promise<Street | null> {
  const existing = await getStreet(streetId);
  if (!existing) return null;
  const updated: Street = done
    ? {
        ...existing,
        doneAt: Date.now(),
        doneBy: knockerId,
        doneByName: getKnockerName(knockerId),
      }
    : {
        id: existing.id,
        sectorId: existing.sectorId,
        name: existing.name,
        normalizedName: existing.normalizedName,
        geometry: existing.geometry,
        // doneAt / doneBy / doneByName explicitly omitted
      };
  const { error } = await supabase
    .from("streets")
    .update(streetToRow(updated))
    .eq("id", streetId);
  if (error) throw new Error(`toggleStreetDone: ${error.message}`);
  return updated;
}

// ─── Assignments ─────────────────────────────────────────────────────────

interface AssignmentRow {
  id: string;
  sector_id: string;
  sector_name: string;
  knocker_id: string;
  knocker_name: string;
  date: string;
  created_at: string;
  created_by: string;
}

function rowToAssignment(row: AssignmentRow): SectorAssignment {
  return {
    id: row.id,
    sectorId: row.sector_id,
    sectorName: row.sector_name,
    knockerId: row.knocker_id,
    knockerName: row.knocker_name,
    date: row.date,
    createdAt: new Date(row.created_at).getTime(),
    createdBy: row.created_by,
  };
}

function assignmentToRow(a: SectorAssignment) {
  return {
    id: a.id,
    sector_id: a.sectorId,
    sector_name: a.sectorName,
    knocker_id: a.knockerId,
    knocker_name: a.knockerName,
    date: a.date,
    created_at: new Date(a.createdAt).toISOString(),
    created_by: a.createdBy,
  };
}

export async function createAssignment(
  input: CreateAssignmentInput
): Promise<SectorAssignment> {
  const sector = await getSector(input.sectorId);
  if (!sector) throw new Error("Secteur introuvable");

  const id = newId();
  const assignment: SectorAssignment = {
    id,
    sectorId: input.sectorId,
    sectorName: sector.name,
    knockerId: input.knockerId,
    knockerName: getKnockerName(input.knockerId),
    date: input.date,
    createdAt: Date.now(),
    createdBy: input.createdBy,
  };
  const { error } = await supabase
    .from("sector_assignments")
    .insert(assignmentToRow(assignment));
  if (error) throw new Error(`createAssignment: ${error.message}`);
  return assignment;
}

export async function getAssignment(
  id: string
): Promise<SectorAssignment | null> {
  const { data, error } = await supabase
    .from("sector_assignments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getAssignment: ${error.message}`);
  return data ? rowToAssignment(data as AssignmentRow) : null;
}

export async function listAssignmentsByDate(
  date: string
): Promise<SectorAssignment[]> {
  const { data, error } = await supabase
    .from("sector_assignments")
    .select("*")
    .eq("date", date);
  if (error) throw new Error(`listAssignmentsByDate: ${error.message}`);
  return (data as AssignmentRow[]).map(rowToAssignment);
}

export async function listAssignmentsBySector(
  sectorId: string
): Promise<SectorAssignment[]> {
  const { data, error } = await supabase
    .from("sector_assignments")
    .select("*")
    .eq("sector_id", sectorId)
    .order("date", { ascending: false });
  if (error) throw new Error(`listAssignmentsBySector: ${error.message}`);
  return (data as AssignmentRow[]).map(rowToAssignment);
}

export async function deleteAssignment(id: string): Promise<boolean> {
  const { error, count } = await supabase
    .from("sector_assignments")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw new Error(`deleteAssignment: ${error.message}`);
  return (count ?? 0) > 0;
}

// ─── Utilities ───────────────────────────────────────────────────────────

export function todayDateKey(): string {
  return dateKey(Date.now());
}

export function leadStatusCount(leads: Lead[]): Record<LeadStatus, number> {
  const out: Record<LeadStatus, number> = {
    absent: 0,
    meeting: 0,
    repasser: 0,
    suivi: 0,
    refus: 0,
  };
  for (const l of leads) out[l.status]++;
  return out;
}
