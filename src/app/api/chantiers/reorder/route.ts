import { NextRequest, NextResponse } from "next/server";
import { reorderChantiers } from "@/lib/chantiers/kv";

export const runtime = "nodejs";

/**
 * POST /api/chantiers/reorder
 *
 * Called by the Kanban view when a card is dragged within a column to
 * manually pin its position. The body lists every chantier ID currently in
 * the column in the desired new order — the server reassigns `priority`
 * 1..N to match.
 *
 * Body: { ids: string[] }
 */
export async function POST(request: NextRequest) {
  let body: { ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json(
      { error: "ids doit être un tableau non-vide" },
      { status: 400 }
    );
  }

  try {
    await reorderChantiers(body.ids);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
