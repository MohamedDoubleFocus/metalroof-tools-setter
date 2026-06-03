import { NextRequest, NextResponse } from "next/server";
import { createChantier } from "@/lib/chantiers/kv";
import { normalizePhoneE164 } from "@/lib/codes";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/webhooks/create-chantier
 *
 * Inbound webhook to create a chantier from an external source (GHL CRM
 * after a sale closes, Zapier, Make.com, etc.).
 *
 * Auth: header `X-Webhook-Secret` must match env var WEBHOOK_SECRET.
 *
 * Body:
 *   {
 *     clientName: string,
 *     clientPhone: string,           // 10-digit or E.164
 *     clientEmail: string,
 *     addressLine1: string,          // street + civic
 *     addressLine2: string,          // city + province + postal
 *     signedAt?: number | string,    // ms timestamp or ISO date; defaults to now
 *     scheduledDate?: string,        // YYYY-MM-DD
 *     priority?: number,
 *     totalAmount?: number,
 *     notes?: string
 *   }
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.WEBHOOK_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "WEBHOOK_SECRET non configuré côté serveur" },
      { status: 500 }
    );
  }
  const provided = request.headers.get("x-webhook-secret");
  if (provided !== expectedSecret) {
    return NextResponse.json(
      { error: "Secret invalide ou manquant" },
      { status: 401 }
    );
  }

  let body: {
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    addressLine1?: string;
    addressLine2?: string;
    signedAt?: number | string;
    scheduledDate?: string;
    priority?: number;
    totalAmount?: number;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const clientName = (body.clientName || "").trim();
  if (!clientName) {
    return NextResponse.json(
      { error: "clientName requis" },
      { status: 400 }
    );
  }

  const phone = normalizePhoneE164((body.clientPhone || "").trim());
  if (!phone) {
    return NextResponse.json(
      { error: "clientPhone invalide (10 chiffres ou E.164)" },
      { status: 400 }
    );
  }

  const email = (body.clientEmail || "").trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "clientEmail invalide" },
      { status: 400 }
    );
  }

  const addressLine1 = (body.addressLine1 || "").trim();
  if (!addressLine1) {
    return NextResponse.json(
      { error: "addressLine1 requis" },
      { status: 400 }
    );
  }
  const addressLine2 = (body.addressLine2 || "").trim();

  // Resolve signedAt: number (ms), ISO string, or default to now.
  let signedAt: number | undefined;
  if (typeof body.signedAt === "number") {
    signedAt = body.signedAt;
  } else if (typeof body.signedAt === "string") {
    const parsed = Date.parse(body.signedAt);
    if (!Number.isNaN(parsed)) signedAt = parsed;
  }

  try {
    const chantier = await createChantier({
      clientName,
      clientPhone: phone,
      clientEmail: email || undefined,
      addressLine1,
      addressLine2: addressLine2 || undefined,
      signedAt,
      scheduledDate: body.scheduledDate,
      priority: body.priority,
      totalAmount: body.totalAmount,
      notes: body.notes,
    });
    return NextResponse.json({ success: true, chantier });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Erreur création chantier",
      },
      { status: 500 }
    );
  }
}
