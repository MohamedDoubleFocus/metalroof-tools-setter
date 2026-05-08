import { NextRequest, NextResponse } from "next/server";
import {
  getCodeMeta,
  getCodeUsed,
  setCodeResults,
  remainingTtlSeconds,
  ClientCodeColorResult,
  ClientCodeResults,
} from "@/lib/kv";
import { isValidCodeFormat } from "@/lib/codes";

export const runtime = "nodejs";

/**
 * POST /api/client/[code]/results
 *
 * Persists the simulation results in KV so the client can re-download the PDF
 * after refreshing or returning to the page within the 7-day window.
 *
 * Only callable after the code has been claimed (used=true).
 *
 * Body: { enhancedImageUrl, originalImageUrl, results: [{ colorKey, waveTileUrl, standingSeamUrl }] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!isValidCodeFormat(code)) {
    return NextResponse.json({ error: "Code invalide" }, { status: 404 });
  }

  const meta = await getCodeMeta(code);
  if (!meta) {
    return NextResponse.json(
      { error: "Lien invalide ou expire" },
      { status: 404 }
    );
  }

  const used = await getCodeUsed(code);
  if (!used) {
    return NextResponse.json(
      { error: "Le code n'a pas ete claim. Appelez /use avant /results." },
      { status: 400 }
    );
  }

  let body: {
    enhancedImageUrl?: string;
    originalImageUrl?: string;
    results?: ClientCodeColorResult[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (!body.originalImageUrl || !Array.isArray(body.results)) {
    return NextResponse.json(
      { error: "Parametres invalides (originalImageUrl + results requis)" },
      { status: 400 }
    );
  }

  const payload: ClientCodeResults = {
    enhancedImageUrl: body.enhancedImageUrl || body.originalImageUrl,
    originalImageUrl: body.originalImageUrl,
    results: body.results,
    completedAt: Date.now(),
  };

  const ttl = remainingTtlSeconds(meta.expiresAt);
  await setCodeResults(code, payload, ttl);

  return NextResponse.json({ success: true });
}
