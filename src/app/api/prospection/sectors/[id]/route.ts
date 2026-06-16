import { NextRequest, NextResponse } from "next/server";
import {
  getSector,
  listStreetsForSector,
  deleteSector,
  updateSector,
} from "@/lib/prospection/kv";
import { requireSDROrAdmin, respondError } from "@/lib/auth/can";
import type { UpdateSectorInput } from "@/types/prospection";

export const runtime = "nodejs";

async function gate() {
  try {
    await requireSDROrAdmin();
    return null;
  } catch (err) {
    return respondError(err);
  }
}

/**
 * GET /api/prospection/sectors/[id]
 * Returns the sector + its full list of streets.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await gate();
  if (guard) return guard;
  const { id } = await params;
  const sector = await getSector(id);
  if (!sector) {
    return NextResponse.json(
      { error: "Secteur introuvable" },
      { status: 404 }
    );
  }
  const streets = await listStreetsForSector(id);
  return NextResponse.json({ sector, streets });
}

/**
 * PATCH /api/prospection/sectors/[id]
 * Updates the editable sector fields (notes, name).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await gate();
  if (guard) return guard;
  const { id } = await params;

  let body: Partial<UpdateSectorInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const updated = await updateSector(id, {
    name: body.name,
    notes: body.notes,
  });
  if (!updated) {
    return NextResponse.json(
      { error: "Secteur introuvable" },
      { status: 404 }
    );
  }
  return NextResponse.json({ sector: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await gate();
  if (guard) return guard;
  const { id } = await params;
  const ok = await deleteSector(id);
  if (!ok) {
    return NextResponse.json(
      { error: "Secteur introuvable" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}
