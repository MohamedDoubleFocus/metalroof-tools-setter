/**
 * Redis storage for the prospection module.
 *
 * Schema:
 *   lead:<id>                       → Lead (persistent, no TTL)
 *   leads:by-date:<YYYY-MM-DD>      → string[] (lead ids created on that day)
 *   leads:all                       → string[] (every lead id ever — kept lean for scans)
 *
 *   sector:<id>                     → Sector
 *   sectors:all                     → string[]
 *
 *   street:<sectorId>::<normName>   → Street
 *
 * Reuses the singleton Redis client and JSON helpers from src/lib/kv.ts.
 */

import { getJson, setJsonPersistent, delKey } from "@/lib/kv";
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

// ─── Keys ────────────────────────────────────────────────────────────────

const leadKey = (id: string) => `lead:${id}`;
const leadsByDateKey = (date: string) => `leads:by-date:${date}`;
const leadsAllKey = () => `leads:all`;

const sectorKey = (id: string) => `sector:${id}`;
const sectorsAllKey = () => `sectors:all`;

const streetKey = (id: string) => `street:${id}`;

const assignmentKey = (id: string) => `assignment:${id}`;
const assignmentsByDateKey = (date: string) => `assignments:by-date:${date}`;
const assignmentsBySectorKey = (sectorId: string) =>
  `assignments:by-sector:${sectorId}`;

// ─── Helpers ─────────────────────────────────────────────────────────────

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

async function pushToList(key: string, value: string): Promise<void> {
  const list = (await getJson<string[]>(key)) ?? [];
  if (!list.includes(value)) list.push(value);
  await setJsonPersistent(key, list);
}

async function getList(key: string): Promise<string[]> {
  return (await getJson<string[]>(key)) ?? [];
}

// ─── Leads ───────────────────────────────────────────────────────────────

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

  await setJsonPersistent(leadKey(id), lead);
  await pushToList(leadsByDateKey(dateKey(now)), id);
  await pushToList(leadsAllKey(), id);

  return lead;
}

export async function getLead(id: string): Promise<Lead | null> {
  return getJson<Lead>(leadKey(id));
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

  await setJsonPersistent(leadKey(id), updated);
  return updated;
}

export async function deleteLead(id: string): Promise<boolean> {
  const lead = await getLead(id);
  if (!lead) return false;
  await delKey(leadKey(id));
  // Note: we don't bother removing the id from `leads:by-date` lists — readers
  // tolerate stale ids by filtering out leads that no longer exist.
  return true;
}

export async function listLeadsByDate(date: string): Promise<Lead[]> {
  const ids = await getList(leadsByDateKey(date));
  if (ids.length === 0) return [];
  const leads = await Promise.all(ids.map((id) => getLead(id)));
  return leads.filter((l): l is Lead => l !== null);
}

export async function listAllLeads(): Promise<Lead[]> {
  const ids = await getList(leadsAllKey());
  if (ids.length === 0) return [];
  const leads = await Promise.all(ids.map((id) => getLead(id)));
  return leads.filter((l): l is Lead => l !== null);
}

// ─── Sectors ─────────────────────────────────────────────────────────────

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
  await setJsonPersistent(sectorKey(id), sector);
  await pushToList(sectorsAllKey(), id);
  return sector;
}

/**
 * Patch a sector — currently used to edit the free-form notes field
 * (and the name, if we want to surface that later).
 */
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
  await setJsonPersistent(sectorKey(id), updated);
  return updated;
}

export async function getSector(id: string): Promise<Sector | null> {
  return getJson<Sector>(sectorKey(id));
}

export async function listSectors(): Promise<Sector[]> {
  const ids = await getList(sectorsAllKey());
  if (ids.length === 0) return [];
  const sectors = await Promise.all(ids.map((id) => getSector(id)));
  return sectors.filter((s): s is Sector => s !== null);
}

export async function setSectorStreetIds(
  sectorId: string,
  streetIds: string[]
): Promise<Sector | null> {
  const sector = await getSector(sectorId);
  if (!sector) return null;
  sector.streetIds = streetIds;
  await setJsonPersistent(sectorKey(sectorId), sector);
  return sector;
}

export async function deleteSector(id: string): Promise<boolean> {
  const sector = await getSector(id);
  if (!sector) return false;
  // Delete each street within the sector
  for (const sId of sector.streetIds) {
    await delKey(streetKey(sId));
  }
  await delKey(sectorKey(id));
  // Remove from sectors:all
  const all = await getList(sectorsAllKey());
  const filtered = all.filter((x) => x !== id);
  await setJsonPersistent(sectorsAllKey(), filtered);
  return true;
}

// ─── Streets ─────────────────────────────────────────────────────────────

export async function createStreetsBulk(
  sectorId: string,
  rawStreets: Array<{
    name: string;
    normalizedName: string;
    geometry: { lat: number; lng: number }[];
  }>
): Promise<string[]> {
  const ids: string[] = [];
  for (const s of rawStreets) {
    const id = streetId(sectorId, s.normalizedName);
    const street: Street = {
      id,
      sectorId,
      name: s.name,
      normalizedName: s.normalizedName,
      geometry: s.geometry,
    };
    await setJsonPersistent(streetKey(id), street);
    ids.push(id);
  }
  return ids;
}

export async function getStreet(id: string): Promise<Street | null> {
  return getJson<Street>(streetKey(id));
}

export async function listStreetsForSector(
  sectorId: string
): Promise<Street[]> {
  const sector = await getSector(sectorId);
  if (!sector || sector.streetIds.length === 0) return [];
  const streets = await Promise.all(
    sector.streetIds.map((id) => getStreet(id))
  );
  return streets.filter((s): s is Street => s !== null);
}

export async function toggleStreetDone(
  streetId: string,
  knockerId: string,
  done: boolean
): Promise<Street | null> {
  const street = await getStreet(streetId);
  if (!street) return null;
  if (done) {
    street.doneAt = Date.now();
    street.doneBy = knockerId;
    street.doneByName = getKnockerName(knockerId);
  } else {
    delete street.doneAt;
    delete street.doneBy;
    delete street.doneByName;
  }
  await setJsonPersistent(streetKey(streetId), street);
  return street;
}

// ─── Assignments ─────────────────────────────────────────────────────────

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
  await setJsonPersistent(assignmentKey(id), assignment);
  await pushToList(assignmentsByDateKey(input.date), id);
  await pushToList(assignmentsBySectorKey(input.sectorId), id);
  return assignment;
}

export async function getAssignment(id: string): Promise<SectorAssignment | null> {
  return getJson<SectorAssignment>(assignmentKey(id));
}

export async function listAssignmentsByDate(
  date: string
): Promise<SectorAssignment[]> {
  const ids = await getList(assignmentsByDateKey(date));
  if (ids.length === 0) return [];
  const list = await Promise.all(ids.map((id) => getAssignment(id)));
  return list.filter((a): a is SectorAssignment => a !== null);
}

export async function listAssignmentsBySector(
  sectorId: string
): Promise<SectorAssignment[]> {
  const ids = await getList(assignmentsBySectorKey(sectorId));
  if (ids.length === 0) return [];
  const list = await Promise.all(ids.map((id) => getAssignment(id)));
  return list
    .filter((a): a is SectorAssignment => a !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function deleteAssignment(id: string): Promise<boolean> {
  const a = await getAssignment(id);
  if (!a) return false;
  await delKey(assignmentKey(id));
  // Remove from date index
  const byDate = await getList(assignmentsByDateKey(a.date));
  await setJsonPersistent(
    assignmentsByDateKey(a.date),
    byDate.filter((x) => x !== id)
  );
  // Remove from sector index
  const bySector = await getList(assignmentsBySectorKey(a.sectorId));
  await setJsonPersistent(
    assignmentsBySectorKey(a.sectorId),
    bySector.filter((x) => x !== id)
  );
  return true;
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
