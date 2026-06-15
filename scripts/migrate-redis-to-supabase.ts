/**
 * One-shot migration: read every persistent entity from Redis and upsert
 * into Supabase Postgres. Idempotent — safe to re-run.
 *
 * Run from repo root:
 *   npx tsx scripts/migrate-redis-to-supabase.ts
 *
 * Requires .env.local with:
 *   - STORAGE_REDIS_URL (or REDIS_URL / KV_URL) — the SOURCE Redis instance
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY — the TARGET Postgres
 *
 * Strategy: connect directly to BOTH databases. Read Redis raw via node-redis
 * (so we don't go through the Next.js kv helpers, which now point at Supabase).
 *
 * For each entity type:
 *   1. List the source ids (chantiers:all, leads:all, etc.)
 *   2. Read each entity from Redis
 *   3. Convert via the kv mapping helpers (re-used inline below)
 *   4. Upsert to Supabase in batches of 500
 *   5. Report count_redis vs count_supabase for validation
 */

import { createClient as createRedisClient } from "redis";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

// ─── Connections ─────────────────────────────────────────────────────────

const REDIS_URL =
  process.env.STORAGE_REDIS_URL ||
  process.env.REDIS_URL ||
  process.env.KV_URL;
if (!REDIS_URL) {
  console.error("❌ STORAGE_REDIS_URL / REDIS_URL / KV_URL manquant.");
  process.exit(1);
}
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.");
  process.exit(1);
}

const redis = createRedisClient({ url: REDIS_URL });
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ─── Helpers ─────────────────────────────────────────────────────────────

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readList(key: string): Promise<string[]> {
  return (await readJson<string[]>(key)) ?? [];
}

const isoOrNull = (v: number | undefined) =>
  v !== undefined ? new Date(v).toISOString() : null;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function upsertBatch(
  table: string,
  rows: Record<string, unknown>[],
  conflict = "id"
) {
  if (rows.length === 0) return;
  for (const batch of chunk(rows, 500)) {
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflict });
    if (error) throw new Error(`upsert ${table}: ${error.message}`);
  }
}

async function countTable(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count ?? 0;
}

// ─── Module: TEAMS ───────────────────────────────────────────────────────

const TEAM_KEYS = ["Nikita", "MAX", "PAVEL", "OMAR"];

async function migrateTeams() {
  const rows: Record<string, unknown>[] = [];
  for (const key of TEAM_KEYS) {
    const t = await readJson<{
      key: string;
      chiefName: string;
      employees: Array<{ id: string; name: string }>;
      notes?: string;
      updatedAt: number;
    }>(`team:${key}`);
    if (!t) continue;
    rows.push({
      key: t.key,
      chief_name: t.chiefName,
      employees: t.employees ?? [],
      notes: t.notes ?? null,
      updated_at: new Date(t.updatedAt).toISOString(),
    });
  }
  await upsertBatch("teams", rows, "key");
  return rows.length;
}

// ─── Module: CHANTIERS ───────────────────────────────────────────────────

async function migrateChantiers() {
  const ids = await readList("chantiers:all");
  const rows: Record<string, unknown>[] = [];
  for (const id of ids) {
    const c = await readJson<Record<string, unknown>>(`chantier:${id}`);
    if (!c) continue;
    rows.push({
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
      urgency: c.urgency ?? "non_urgent",
      team: c.team ?? null,
      status: c.status,
      signed_at: new Date(c.signedAt as number).toISOString(),
      scheduled_date: c.scheduledDate ?? null,
      priority: c.priority ?? null,
      total_amount: c.totalAmount ?? null,
      notes: c.notes ?? null,
      created_at: new Date(c.createdAt as number).toISOString(),
      updated_at: new Date(c.updatedAt as number).toISOString(),
      started_at: isoOrNull(c.startedAt as number | undefined),
      completed_at: isoOrNull(c.completedAt as number | undefined),
      sms_j7_sent_at: isoOrNull(c.smsJ7SentAt as number | undefined),
      sms_j2_sent_at: isoOrNull(c.smsJ2SentAt as number | undefined),
      warranty_sent_at: isoOrNull(c.warrantySentAt as number | undefined),
      invoice_sent_at: isoOrNull(c.invoiceSentAt as number | undefined),
      invoice_pdf_url: c.invoicePdfUrl ?? null,
    });
  }
  await upsertBatch("chantiers", rows);
  return { redis: ids.length, mapped: rows.length };
}

// ─── Module: REPORT ORDERS ───────────────────────────────────────────────

async function migrateReportOrders() {
  const ids = await readList("report-orders:all");
  const rows: Record<string, unknown>[] = [];
  for (const id of ids) {
    const o = await readJson<Record<string, unknown>>(`report-order:${id}`);
    if (!o) continue;
    rows.push({
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
      created_at: new Date(o.createdAt as number).toISOString(),
      updated_at: new Date(o.updatedAt as number).toISOString(),
      completed_at: isoOrNull(o.completedAt as number | undefined),
    });
  }
  await upsertBatch("report_orders", rows);
  return { redis: ids.length, mapped: rows.length };
}

// ─── Module: SECTORS ─────────────────────────────────────────────────────

async function migrateSectors() {
  const ids = await readList("sectors:all");
  const rows: Record<string, unknown>[] = [];
  for (const id of ids) {
    const s = await readJson<Record<string, unknown>>(`sector:${id}`);
    if (!s) continue;
    rows.push({
      id: s.id,
      name: s.name,
      polygon: s.polygon,
      notes: s.notes ?? null,
      created_at: new Date(s.createdAt as number).toISOString(),
      updated_at: isoOrNull(s.updatedAt as number | undefined),
      created_by: s.createdBy,
      created_by_name: s.createdByName,
    });
  }
  await upsertBatch("sectors", rows);
  return { redis: ids.length, mapped: rows.length };
}

// ─── Module: STREETS ─────────────────────────────────────────────────────

async function migrateStreets() {
  // Streets aren't in a global list — we discover them via the sectors.
  // Each sector has a `streetIds: string[]` field with the keys to read.
  const sectorIds = await readList("sectors:all");
  const rows: Record<string, unknown>[] = [];
  for (const sId of sectorIds) {
    const sector = await readJson<{ streetIds: string[] }>(`sector:${sId}`);
    if (!sector?.streetIds?.length) continue;
    for (const strId of sector.streetIds) {
      const s = await readJson<Record<string, unknown>>(`street:${strId}`);
      if (!s) continue;
      rows.push({
        id: s.id,
        sector_id: s.sectorId,
        name: s.name,
        normalized_name: s.normalizedName,
        geometry: s.geometry,
        done_at: isoOrNull(s.doneAt as number | undefined),
        done_by: s.doneBy ?? null,
        done_by_name: s.doneByName ?? null,
      });
    }
  }
  await upsertBatch("streets", rows);
  return { mapped: rows.length };
}

// ─── Module: LEADS ───────────────────────────────────────────────────────

async function migrateLeads() {
  const ids = await readList("leads:all");
  const rows: Record<string, unknown>[] = [];
  for (const id of ids) {
    const l = await readJson<Record<string, unknown>>(`lead:${id}`);
    if (!l) continue;
    rows.push({
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
      meeting_at: isoOrNull(l.meetingAt as number | undefined),
      follow_up_at: isoOrNull(l.followUpAt as number | undefined),
      notes: l.notes ?? null,
      photo_url: l.photoUrl ?? null,
      sector_id: l.sectorId ?? null,
      created_at: new Date(l.createdAt as number).toISOString(),
      updated_at: new Date(l.updatedAt as number).toISOString(),
    });
  }
  await upsertBatch("leads", rows);
  return { redis: ids.length, mapped: rows.length };
}

// ─── Module: SECTOR ASSIGNMENTS ──────────────────────────────────────────

async function migrateAssignments() {
  // No global list — assignments are indexed by date and by sector.
  // We discover them via the by-sector indexes (each sector has its list).
  const sectorIds = await readList("sectors:all");
  const seenAssignmentIds = new Set<string>();
  const rows: Record<string, unknown>[] = [];
  for (const sId of sectorIds) {
    const ids = await readList(`assignments:by-sector:${sId}`);
    for (const aId of ids) {
      if (seenAssignmentIds.has(aId)) continue;
      seenAssignmentIds.add(aId);
      const a = await readJson<Record<string, unknown>>(`assignment:${aId}`);
      if (!a) continue;
      rows.push({
        id: a.id,
        sector_id: a.sectorId,
        sector_name: a.sectorName,
        knocker_id: a.knockerId,
        knocker_name: a.knockerName,
        date: a.date,
        created_at: new Date(a.createdAt as number).toISOString(),
        created_by: a.createdBy,
      });
    }
  }
  await upsertBatch("sector_assignments", rows);
  return { mapped: rows.length };
}

// ─── Main ────────────────────────────────────────────────────────────────

(async () => {
  console.log("🔌 Connexion à Redis...");
  await redis.connect();
  console.log("✅ Redis connecté\n");

  console.log("📦 Migration en cours...\n");

  let teamCount = 0,
    chantierResult = { redis: 0, mapped: 0 },
    reportResult = { redis: 0, mapped: 0 },
    sectorResult = { redis: 0, mapped: 0 },
    streetResult = { mapped: 0 },
    leadResult = { redis: 0, mapped: 0 },
    assignResult = { mapped: 0 };

  try {
    teamCount = await migrateTeams();
    console.log(`✓  teams              → ${teamCount} migrated`);

    sectorResult = await migrateSectors();
    console.log(
      `✓  sectors            → ${sectorResult.mapped}/${sectorResult.redis} migrated`
    );

    streetResult = await migrateStreets();
    console.log(`✓  streets            → ${streetResult.mapped} migrated`);

    chantierResult = await migrateChantiers();
    console.log(
      `✓  chantiers          → ${chantierResult.mapped}/${chantierResult.redis} migrated`
    );

    reportResult = await migrateReportOrders();
    console.log(
      `✓  report_orders      → ${reportResult.mapped}/${reportResult.redis} migrated`
    );

    leadResult = await migrateLeads();
    console.log(
      `✓  leads              → ${leadResult.mapped}/${leadResult.redis} migrated`
    );

    assignResult = await migrateAssignments();
    console.log(
      `✓  sector_assignments → ${assignResult.mapped} migrated`
    );
  } catch (err) {
    console.error(
      `\n❌ Migration failed: ${err instanceof Error ? err.message : err}`
    );
    await redis.disconnect();
    process.exit(1);
  }

  console.log("\n🔍 Validation côté Postgres...\n");

  const [chantiers, reports, sectors, streets, leads, assignments, teams] =
    await Promise.all([
      countTable("chantiers"),
      countTable("report_orders"),
      countTable("sectors"),
      countTable("streets"),
      countTable("leads"),
      countTable("sector_assignments"),
      countTable("teams"),
    ]);

  console.log(`   chantiers          → ${chantiers} rows`);
  console.log(`   report_orders      → ${reports} rows`);
  console.log(`   sectors            → ${sectors} rows`);
  console.log(`   streets            → ${streets} rows`);
  console.log(`   leads              → ${leads} rows`);
  console.log(`   sector_assignments → ${assignments} rows`);
  console.log(`   teams              → ${teams} rows`);

  await redis.disconnect();

  const allMatched =
    chantiers === chantierResult.mapped &&
    reports === reportResult.mapped &&
    sectors === sectorResult.mapped &&
    streets === streetResult.mapped &&
    leads === leadResult.mapped &&
    assignments === assignResult.mapped &&
    teams === teamCount;

  console.log();
  if (allMatched) {
    console.log("✅ Migration réussie. Tous les counts correspondent.");
    console.log(
      "   Tu peux maintenant deploy l'app — elle lira/écrira depuis Supabase."
    );
  } else {
    console.log(
      "⚠️  Counts ne matchent pas exactement (peut être normal si certaines clés Redis étaient corrompues)."
    );
    console.log(
      "   Compare les chiffres ci-dessus. Si les écarts sont mineurs, OK."
    );
  }
})();
