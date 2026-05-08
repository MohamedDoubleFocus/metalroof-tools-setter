import { NextRequest, NextResponse } from "next/server";
import {
  getCodeMeta,
  tryClaimCode,
  remainingTtlSeconds,
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
 * POST /api/client/[code]/use
 *
 * Atomically claim the code as "used". Returns 409 if already claimed.
 * This is called BEFORE generation starts — once we've claimed,
 * the client may proceed with image generation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!isValidCodeFormat(code)) {
    return NextResponse.json({ error: "Code invalide" }, { status: 404 });
  }

  // Tighter rate limit on this endpoint (10/5min) — attempts to claim should be rare
  const ip = getClientIp(request);
  const count = await incrementRateLimit(`use:${ip}`, 300);
  if (count > 10) {
    return NextResponse.json(
      { error: "Trop de tentatives. Reessayez dans quelques minutes." },
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

  const ttl = remainingTtlSeconds(meta.expiresAt);
  const claimed = await tryClaimCode(code, ttl);

  if (!claimed) {
    return NextResponse.json(
      { error: "Ce lien a deja ete utilise pour une simulation." },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}
