import { NextRequest, NextResponse } from "next/server";
import {
  getSector,
  listStreetsForSector,
  deleteSector,
} from "@/lib/prospection/kv";

export const runtime = "nodejs";

/**
 * GET /api/prospection/sectors/[id]
 * Returns the sector + its full list of streets.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
