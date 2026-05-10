import { NextRequest, NextResponse, after } from "next/server";
import {
  getCodeMeta,
  tryClaimCode,
  remainingTtlSeconds,
  incrementRateLimit,
} from "@/lib/kv";
import { isValidCodeFormat } from "@/lib/codes";
import { kickoffGeneration } from "@/lib/generation-pipeline";
import type { RoofStyle } from "@/types";

export const runtime = "nodejs";
// This endpoint only sets up Redis state and fires the enhancement worker —
// the heavy lifting happens in /api/internal/run-* which each get their own
// 300s budget. Keep this short.
export const maxDuration = 30;

const VALID_STYLES: RoofStyle[] = ["wave_tile", "standing_seam", "shingle_tile"];

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * POST /api/client/[code]/start-generation
 *
 * Atomically claims the code and kicks off the fan-out pipeline:
 *   orchestrator → enhancement worker → N parallel roof workers → Make
 * Returns 200 immediately; the client redirects to /merci.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!isValidCodeFormat(code)) {
    return NextResponse.json({ error: "Code invalide" }, { status: 404 });
  }

  const ip = getClientIp(request);
  const count = await incrementRateLimit(`start:${ip}`, 300);
  if (count > 10) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  const meta = await getCodeMeta(code);
  if (!meta) {
    return NextResponse.json(
      { error: "Lien invalide ou expiré" },
      { status: 404 }
    );
  }
  if (meta.expiresAt < Date.now()) {
    return NextResponse.json({ error: "Ce lien a expiré" }, { status: 410 });
  }

  let body: {
    uploadedImageUrl?: string;
    selectedColors?: string[];
    selectedStyles?: RoofStyle[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const uploadedImageUrl = (body.uploadedImageUrl || "").trim();
  if (!uploadedImageUrl) {
    return NextResponse.json(
      { error: "uploadedImageUrl requis" },
      { status: 400 }
    );
  }

  const selectedColors = Array.isArray(body.selectedColors)
    ? body.selectedColors.filter(
        (c): c is string => typeof c === "string" && c.length > 0
      )
    : [];
  if (selectedColors.length === 0) {
    return NextResponse.json(
      { error: "Au moins une couleur requise" },
      { status: 400 }
    );
  }

  const selectedStyles = Array.isArray(body.selectedStyles)
    ? body.selectedStyles.filter((s): s is RoofStyle =>
        VALID_STYLES.includes(s as RoofStyle)
      )
    : [];
  if (selectedStyles.length === 0) {
    return NextResponse.json(
      { error: "Au moins un style requis" },
      { status: 400 }
    );
  }

  // Atomic claim — only one client wins
  const ttl = remainingTtlSeconds(meta.expiresAt);
  const claimed = await tryClaimCode(code, ttl);
  if (!claimed) {
    return NextResponse.json(
      { error: "Ce lien a déjà été utilisé pour une simulation." },
      { status: 409 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    new URL(request.url).origin;
  const cleanBase = baseUrl.replace(/\/$/, "");

  after(async () => {
    try {
      await kickoffGeneration({
        code,
        sourceImageUrl: uploadedImageUrl,
        selectedColors,
        selectedStyles,
        resultsBaseUrl: `${cleanBase}/client/${code}`,
        internalBaseUrl: cleanBase,
      });
    } catch (err) {
      console.error("[start-generation] kickoff failed:", err);
    }
  });

  return NextResponse.json({ status: "started" });
}
