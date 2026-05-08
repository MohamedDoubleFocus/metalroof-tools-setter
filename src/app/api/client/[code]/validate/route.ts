import { NextRequest, NextResponse } from "next/server";
import {
  getCodeMeta,
  getCodeUsed,
  getCodeResults,
  incrementRateLimit,
} from "@/lib/kv";
import { isValidCodeFormat } from "@/lib/codes";

export const runtime = "nodejs";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * GET /api/client/[code]/validate
 *
 * Returns the state of the code so the client page knows what to render:
 *   404 - invalid format or doesn't exist
 *   410 - expired
 *   200 with { state: "unused" | "used_pending" | "used_completed", clientName, ... }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!isValidCodeFormat(code)) {
    return NextResponse.json({ error: "Code invalide" }, { status: 404 });
  }

  // Light rate limit (60/5min) to deter brute-force enumeration
  const ip = getClientIp(request);
  const count = await incrementRateLimit(`validate:${ip}`, 300);
  if (count > 60) {
    return NextResponse.json(
      { error: "Trop de requetes. Reessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  const meta = await getCodeMeta(code);
  if (!meta) {
    return NextResponse.json(
      { error: "Lien invalide ou expire" },
      { status: 404 }
    );
  }

  if (meta.expiresAt < Date.now()) {
    return NextResponse.json(
      { error: "Ce lien a expire" },
      { status: 410 }
    );
  }

  const used = await getCodeUsed(code);
  let state: "unused" | "used_pending" | "used_completed" = "unused";
  let results = null;

  if (used) {
    const r = await getCodeResults(code);
    if (r) {
      state = "used_completed";
      results = r;
    } else {
      state = "used_pending";
    }
  }

  return NextResponse.json({
    state,
    clientName: meta.clientName,
    expiresAt: meta.expiresAt,
    results,
  });
}
