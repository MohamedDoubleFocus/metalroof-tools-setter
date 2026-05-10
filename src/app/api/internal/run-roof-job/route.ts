import { NextRequest, NextResponse, after } from "next/server";
import { runRoofJobStep } from "@/lib/generation-pipeline";

export const runtime = "nodejs";
// One Kie.ai call (~60-120s) plus retry plus finalize+webhook; fits in 300s.
export const maxDuration = 300;

/**
 * Internal worker — runs ONE roof-image task, persists its result,
 * decrements the global counter, and fires the Make completion webhook
 * if it was the last one.
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

  let body: { code?: string; jobKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }
  const code = body.code;
  const jobKey = body.jobKey;
  if (!code || !jobKey) {
    return NextResponse.json(
      { error: "Paramètres manquants" },
      { status: 400 }
    );
  }

  after(async () => {
    try {
      await runRoofJobStep(code, jobKey);
    } catch (err) {
      console.error("[run-roof-job] failed for", code, jobKey, err);
    }
  });

  return NextResponse.json({ accepted: true });
}
