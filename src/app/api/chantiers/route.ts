import { NextRequest, NextResponse } from "next/server";
import { createChantier, listAllChantiers } from "@/lib/chantiers/kv";
import { normalizePhoneE164 } from "@/lib/codes";
import type { CreateChantierInput } from "@/types/chantiers";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  try {
    const chantiers = await listAllChantiers();
    return NextResponse.json({ chantiers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: Partial<CreateChantierInput>;
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

  const phone = normalizePhoneE164((body.clientPhone || "").trim());
  if (!phone) {
    return NextResponse.json(
      { error: "Numéro de téléphone invalide" },
      { status: 400 }
    );
  }

  const email = (body.clientEmail || "").trim().toLowerCase();
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Email invalide" },
      { status: 400 }
    );
  }

  const addressLine1 = (body.addressLine1 || "").trim();
  if (!addressLine1) {
    return NextResponse.json(
      { error: "Adresse requise" },
      { status: 400 }
    );
  }
  const addressLine2 = (body.addressLine2 || "").trim();

  try {
    const chantier = await createChantier({
      clientName,
      clientPhone: phone,
      clientEmail: email || undefined,
      addressLine1,
      addressLine2: addressLine2 || undefined,
      signedAt: body.signedAt,
      scheduledDate: body.scheduledDate,
      priority: body.priority,
      totalAmount: body.totalAmount,
      notes: body.notes,
    });
    return NextResponse.json({ chantier });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Erreur création chantier",
      },
      { status: 500 }
    );
  }
}
