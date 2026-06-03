import { NextRequest, NextResponse } from "next/server";
import {
  getChantier,
  updateChantier,
  deleteChantier,
} from "@/lib/chantiers/kv";
import { normalizePhoneE164 } from "@/lib/codes";
import type { UpdateChantierInput } from "@/types/chantiers";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chantier = await getChantier(id);
  if (!chantier) {
    return NextResponse.json(
      { error: "Chantier introuvable" },
      { status: 404 }
    );
  }
  return NextResponse.json({ chantier });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Partial<UpdateChantierInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  // Normalize phone if provided
  if (body.clientPhone) {
    const phone = normalizePhoneE164(body.clientPhone);
    if (!phone) {
      return NextResponse.json(
        { error: "Téléphone invalide" },
        { status: 400 }
      );
    }
    body.clientPhone = phone;
  }

  const updated = await updateChantier(id, body);
  if (!updated) {
    return NextResponse.json(
      { error: "Chantier introuvable" },
      { status: 404 }
    );
  }
  return NextResponse.json({ chantier: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deleteChantier(id);
  if (!ok) {
    return NextResponse.json(
      { error: "Chantier introuvable" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}
