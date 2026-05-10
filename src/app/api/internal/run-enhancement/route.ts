import { NextRequest, NextResponse, after } from "next/server";
import { runEnhancementStep } from "@/lib/generation-pipeline";

export const runtime = "nodejs";
// Enhancement is one Kie.ai call (~60-120s) plus retry; comfortably fits.
export const maxDuration = 300;

/**
 * Internal worker — runs the enhancement step for a code, then fans out
 * the roof-job workers. Auth via shared secret in `X-Internal-Auth`.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "WEBHOOK_SECRET non configuré" },
      { status: 500 }
    );
  }
  if (request.headers.get("x-internal-auth") !== expected) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { code?: string; internalBaseUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }
  const code = body.code;
  const internalBaseUrl = body.internalBaseUrl;
  if (!code || !internalBaseUrl) {
    return NextResponse.json(
      { error: "Paramètres manquants" },
      { status: 400 }
    );
  }

  // Accept the call immediately; do the heavy work after responding.
  after(async () => {
    try {
      await runEnhancementStep(code, internalBaseUrl);
    } catch (err) {
      console.error("[run-enhancement] failed:", err);
    }
  });

  return NextResponse.json({ accepted: true });
}
