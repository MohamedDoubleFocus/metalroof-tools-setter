import { NextRequest, NextResponse } from "next/server";
import { updateChantier } from "@/lib/chantiers/kv";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AttachItem {
  chantierId: string;
  roofrUrl: string;
}

/**
 * POST /api/chantiers/roofr-attach
 *
 * Body: { items: { chantierId, roofrUrl }[] }
 *
 * Applies the confirmed matches. Sets roofrUrl on each chantier. Skips
 * silently if the chantier no longer exists (returns ok: false for that row).
 */
export async function POST(request: NextRequest) {
  let body: { items?: AttachItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "items doit être un tableau non-vide" },
      { status: 400 }
    );
  }
  if (body.items.length > 2000) {
    return NextResponse.json(
      { error: "Maximum 2000 attaches par requête" },
      { status: 400 }
    );
  }

  const results: Array<{
    chantierId: string;
    ok: boolean;
    error?: string;
  }> = [];

  for (const item of body.items) {
    const chantierId = (item.chantierId || "").trim();
    const roofrUrl = (item.roofrUrl || "").trim();
    if (!chantierId || !roofrUrl) {
      results.push({
        chantierId,
        ok: false,
        error: "chantierId + roofrUrl requis",
      });
      continue;
    }
    try {
      const updated = await updateChantier(chantierId, { roofrUrl });
      if (!updated) {
        results.push({ chantierId, ok: false, error: "Introuvable" });
      } else {
        results.push({ chantierId, ok: true });
      }
    } catch (err) {
      results.push({
        chantierId,
        ok: false,
        error: err instanceof Error ? err.message : "Erreur",
      });
    }
  }

  const successCount = results.filter((r) => r.ok).length;
  return NextResponse.json({
    results,
    successCount,
    errorCount: results.length - successCount,
  });
}
