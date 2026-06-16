import { NextRequest, NextResponse } from "next/server";
import { listAllChantiers } from "@/lib/chantiers/kv";
import { buildProposals, type CsvRow } from "@/lib/chantiers/roofr-match";
import { requireAdmin, respondError } from "@/lib/auth/can";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/chantiers/roofr-match
 *
 * Body: { rows: { address: string, roofrUrl: string }[] }
 *
 * Scores each row against every chantier and returns proposals (auto / review
 * / none). No mutation — purely a preview endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    return respondError(err);
  }
  let body: { rows?: CsvRow[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json(
      { error: "rows doit être un tableau non-vide" },
      { status: 400 }
    );
  }
  if (body.rows.length > 2000) {
    return NextResponse.json(
      { error: "Maximum 2000 lignes par batch" },
      { status: 400 }
    );
  }

  // Sanitize rows
  const rows = body.rows
    .map((r) => ({
      address: (r.address || "").trim(),
      roofrUrl: (r.roofrUrl || "").trim(),
    }))
    .filter((r) => r.address && r.roofrUrl);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Aucune ligne valide (chaque ligne doit avoir une adresse + une URL)" },
      { status: 400 }
    );
  }

  const chantiers = await listAllChantiers();
  const proposals = buildProposals(rows, chantiers);

  return NextResponse.json({
    proposals,
    counts: {
      total: proposals.length,
      auto: proposals.filter((p) => p.verdict === "auto").length,
      review: proposals.filter((p) => p.verdict === "review").length,
      none: proposals.filter((p) => p.verdict === "none").length,
    },
  });
}
