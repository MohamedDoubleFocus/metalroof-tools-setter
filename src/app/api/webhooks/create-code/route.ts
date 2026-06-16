import { NextRequest, NextResponse } from "next/server";
import {
  setCodeMeta,
  CODE_TTL_SECONDS,
  ClientCodeMeta,
} from "@/lib/kv";
import { generateCode, normalizePhoneE164 } from "@/lib/codes";
import { sendSms } from "@/lib/openphone";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/webhooks/create-code
 *
 * Inbound webhook to create a client simulation code and send the magic link
 * by SMS via OpenPhone.
 *
 * Auth: header `X-Webhook-Secret` must match env var WEBHOOK_SECRET.
 *
 * Body (JSON) — accepts BOTH formats:
 *
 *   Custom format (legacy):
 *     { "phoneNumber": "...", "clientName": "..." }
 *
 *   GHL native payload (just point the webhook URL, no custom data needed):
 *     { "phone": "+15148670787", "full_name": "Jean Tremblay", "first_name": ..., ... }
 *
 * The handler resolves phone from `phoneNumber || phone`, and name from
 * `clientName || full_name || (first_name + last_name)`.
 *
 * Response:
 *   200 { success: true, code, url }
 *   400 invalid input
 *   401 missing/invalid secret
 *   500 SMS failure (code may still have been created — check response.codeCreated)
 */
export async function POST(request: NextRequest) {
  // ─── 1. Auth via shared secret ─────────────────────────────────────────
  const expectedSecret = process.env.WEBHOOK_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "WEBHOOK_SECRET non configure cote serveur" },
      { status: 500 }
    );
  }

  const providedSecret = request.headers.get("x-webhook-secret");
  if (providedSecret !== expectedSecret) {
    return NextResponse.json(
      { error: "Secret invalide ou manquant" },
      { status: 401 }
    );
  }

  // ─── 2. Parse body ─────────────────────────────────────────────────────
  let body: {
    // legacy / explicit
    phoneNumber?: string;
    clientName?: string;
    email?: string;
    // GHL native payload (root-level)
    phone?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  // Resolve phone: explicit `phoneNumber` first, then GHL's `phone`
  const rawPhone = body.phoneNumber || body.phone;
  if (!rawPhone) {
    return NextResponse.json(
      { error: "phoneNumber requis (ou champ `phone` au root du payload)" },
      { status: 400 }
    );
  }

  const normalizedPhone = normalizePhoneE164(rawPhone);
  if (!normalizedPhone) {
    return NextResponse.json(
      { error: "Numero de telephone invalide (10 chiffres requis ou format E.164)" },
      { status: 400 }
    );
  }

  // Resolve client name: explicit `clientName` first, then GHL's `full_name`,
  // then build from first_name + last_name, finally fall back to "client"
  const composedName = [body.first_name, body.last_name]
    .filter((s) => s && s.trim())
    .join(" ")
    .trim();
  const clientName =
    (body.clientName || body.full_name || composedName || "").trim() ||
    "client";

  // Optional email — only stored if it looks like a real email.
  // Used by Make.com to send a completion notification.
  const rawEmail = (body.email || "").trim().toLowerCase();
  const email =
    rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : undefined;

  // ─── 3. Generate unique code ───────────────────────────────────────────
  const code = generateCode();
  const now = Date.now();
  const meta: ClientCodeMeta = {
    code,
    clientName,
    phoneNumber: normalizedPhone,
    email,
    createdAt: now,
    expiresAt: now + CODE_TTL_SECONDS * 1000,
  };

  try {
    await setCodeMeta(meta);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Erreur de stockage KV: " +
          (err instanceof Error ? err.message : "inconnue"),
      },
      { status: 500 }
    );
  }

  // ─── 4. Build magic URL ────────────────────────────────────────────────
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    new URL(request.url).origin;
  const url = `${baseUrl.replace(/\/$/, "")}/client/${code}`;

  // ─── 5. Send SMS via OpenPhone ─────────────────────────────────────────
  const smsContent = `Merci de nous faire confiance pour votre projet de toiture métallique ! Voici votre lien pour créer une simulation personnalisée de votre maison :\n${url}\nLe lien expire dans 7 jours.`;

  const smsResult = await sendSms({ to: normalizedPhone, content: smsContent });

  if (!smsResult.success) {
    return NextResponse.json(
      {
        success: false,
        codeCreated: true,
        code,
        url,
        smsError: smsResult.error,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    code,
    url,
    messageId: smsResult.messageId,
  });
}
