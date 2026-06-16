import { NextRequest, NextResponse } from "next/server";
import {
  createAssignment,
  listAssignmentsByDate,
  listAssignmentsBySector,
  todayDateKey,
} from "@/lib/prospection/kv";
import { getKnockerById } from "@/lib/prospection/knockers";
import { requireSDROrAdmin, respondError } from "@/lib/auth/can";
import type { CreateAssignmentInput } from "@/types/prospection";

export const runtime = "nodejs";

/**
 * GET /api/prospection/assignments
 *   ?date=YYYY-MM-DD       (default: today) — list assignments for that day
 *   ?sectorId=X            (alternative) — list assignment history for a sector
 */
export async function GET(request: NextRequest) {
  try {
    await requireSDROrAdmin();
  } catch (err) {
    return respondError(err);
  }
  const url = new URL(request.url);
  const sectorId = url.searchParams.get("sectorId");
  const date = url.searchParams.get("date") || todayDateKey();

  try {
    const assignments = sectorId
      ? await listAssignmentsBySector(sectorId)
      : await listAssignmentsByDate(date);
    return NextResponse.json({ assignments });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prospection/assignments
 *   Body: { sectorId, knockerId, date, createdBy }
 */
export async function POST(request: NextRequest) {
  try {
    await requireSDROrAdmin();
  } catch (err) {
    return respondError(err);
  }
  let body: Partial<CreateAssignmentInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (!body.sectorId) {
    return NextResponse.json({ error: "sectorId requis" }, { status: 400 });
  }
  if (!body.knockerId || !getKnockerById(body.knockerId)) {
    return NextResponse.json(
      { error: "knockerId requis et valide" },
      { status: 400 }
    );
  }
  if (!body.createdBy || !getKnockerById(body.createdBy)) {
    return NextResponse.json(
      { error: "createdBy requis et valide" },
      { status: 400 }
    );
  }
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json(
      { error: "date requise au format YYYY-MM-DD" },
      { status: 400 }
    );
  }

  try {
    const a = await createAssignment(body as CreateAssignmentInput);
    return NextResponse.json({ assignment: a }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur creation" },
      { status: 500 }
    );
  }
}
