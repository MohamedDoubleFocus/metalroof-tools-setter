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
 * Body (JSON):
 *   {
 *     "phoneNumber": "5148670787" | "(514) 867-0787" | "+15148670787",
 *     "clientName": "Jean Tremblay"   // optional but recommended
 *   }
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
  let body: { phoneNumber?: string; clientName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (!body.phoneNumber) {
    return NextResponse.json(
      { error: "phoneNumber requis" },
      { status: 400 }
    );
  }

  const normalizedPhone = normalizePhoneE164(body.phoneNumber);
  if (!normalizedPhone) {
    return NextResponse.json(
      { error: "phoneNumber invalide (10 chiffres requis ou format E.164)" },
      { status: 400 }
    );
  }

  const clientName = (body.clientName || "").trim() || "client";

  // ─── 3. Generate unique code ───────────────────────────────────────────
  const code = generateCode();
  const now = Date.now();
  const meta: ClientCodeMeta = {
    code,
    clientName,
    phoneNumber: normalizedPhone,
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
  const firstName = clientName.split(/\s+/)[0] || "client";
  const smsContent = `Bonjour ${firstName}, voici votre simulation de toiture personnalisee Metal Roof Montreal :\n${url}\nLe lien expire dans 7 jours.`;

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
