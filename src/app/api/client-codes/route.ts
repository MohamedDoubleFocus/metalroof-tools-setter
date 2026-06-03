import { NextRequest, NextResponse } from "next/server";
import { createClient, RedisClientType } from "redis";
import {
  setCodeMeta,
  CODE_TTL_SECONDS,
  getJson,
  ClientCodeMeta,
} from "@/lib/kv";
import { generateCode, normalizePhoneE164 } from "@/lib/codes";
import { sendSms } from "@/lib/openphone";

export const runtime = "nodejs";
export const maxDuration = 30;

const LIST_KEY = "sim-codes:list";
const LIST_LIMIT = 20;

type RedisClient = RedisClientType<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>
>;

let client: RedisClient | null = null;
let connecting: Promise<void> | null = null;

function getRedisUrl(): string {
  const url =
    process.env.STORAGE_REDIS_URL ||
    process.env.REDIS_URL ||
    process.env.KV_URL;
  if (!url) throw new Error("Redis URL non configuré");
  return url;
}

async function getRedis(): Promise<RedisClient> {
  if (client && client.isOpen) return client;
  if (!client) {
    client = createClient({ url: getRedisUrl() }) as RedisClient;
    client.on("error", (err) => console.error("[redis:sim-codes]", err));
  }
  if (!client.isOpen) {
    if (!connecting) {
      connecting = client.connect().then(() => {
        connecting = null;
      });
    }
    await connecting;
  }
  return client;
}

/**
 * POST /api/client-codes
 *
 * Closer-side endpoint to create a client simulation link on demand. Mirrors
 * the existing /api/webhooks/create-code (kept for GHL automation) but is
 * triggered by the closer UI instead of an inbound webhook. No shared secret —
 * relies on the closer cookie enforced by middleware.
 *
 * Body: { clientName, phoneNumber, email? }
 * Returns: { success, code, url, smsSent }
 */
export async function POST(request: NextRequest) {
  let body: { clientName?: string; phoneNumber?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const clientName = (body.clientName || "").trim();
  if (!clientName) {
    return NextResponse.json(
      { error: "Nom du client requis" },
      { status: 400 }
    );
  }

  const rawPhone = (body.phoneNumber || "").trim();
  if (!rawPhone) {
    return NextResponse.json(
      { error: "Numéro de téléphone requis" },
      { status: 400 }
    );
  }
  const phone = normalizePhoneE164(rawPhone);
  if (!phone) {
    return NextResponse.json(
      { error: "Numéro de téléphone invalide" },
      { status: 400 }
    );
  }

  const rawEmail = (body.email || "").trim().toLowerCase();
  const email =
    rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : undefined;

  const code = generateCode();
  const now = Date.now();
  const meta: ClientCodeMeta = {
    code,
    clientName,
    phoneNumber: phone,
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
          "Erreur de stockage: " +
          (err instanceof Error ? err.message : "inconnue"),
      },
      { status: 500 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    new URL(request.url).origin;
  const url = `${baseUrl.replace(/\/$/, "")}/client/${code}`;

  // Track in a recent-codes audit list (last 20).
  try {
    const r = await getRedis();
    await r.lPush(LIST_KEY, code);
    await r.lTrim(LIST_KEY, 0, LIST_LIMIT - 1);
  } catch (err) {
    console.warn("[client-codes] audit list failed:", err);
  }

  const firstName = clientName.split(/\s+/)[0] || "client";
  const smsContent = `Bonjour ${firstName}, merci de nous faire confiance pour votre projet de toiture métallique ! Voici votre lien pour créer une simulation personnalisée :\n${url}\nLe lien expire dans 7 jours.`;
  const smsResult = await sendSms({ to: phone, content: smsContent });

  return NextResponse.json({
    success: true,
    code,
    url,
    smsSent: smsResult.success,
    smsError: smsResult.success ? undefined : smsResult.error,
  });
}

/**
 * GET /api/client-codes
 * Returns the most recent codes created from this UI (audit list).
 */
export async function GET() {
  try {
    const r = await getRedis();
    const codes = await r.lRange(LIST_KEY, 0, LIST_LIMIT - 1);
    const metas = await Promise.all(
      codes.map((c) => getJson<ClientCodeMeta>(`code:${c}`))
    );
    const items = codes
      .map((code, i) => {
        const meta = metas[i];
        if (!meta) return { code, expired: true };
        return {
          code,
          clientName: meta.clientName,
          phoneNumber: meta.phoneNumber,
          createdAt: meta.createdAt,
          expiresAt: meta.expiresAt,
          expired: meta.expiresAt < Date.now(),
        };
      })
      .slice(0, 10);
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
