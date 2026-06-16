import { NextRequest, NextResponse } from "next/server";
import { getChantier, setChantierFields } from "@/lib/chantiers/kv";
import { sendWarrantyCertificate } from "@/lib/sav/send-warranty";
import { requireAdmin, respondError } from "@/lib/auth/can";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/chantiers/[id]/send-warranty
 *
 * Pre-fills the warranty cert from the chantier's client info and triggers
 * the same Make.com email pipeline as the standalone /sav/garantie form.
 * Uses installationDate = scheduledDate if set, otherwise completedAt date,
 * otherwise today.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (err) {
    return respondError(err);
  }
  const { id } = await params;
  const chantier = await getChantier(id);
  if (!chantier) {
    return NextResponse.json(
      { error: "Chantier introuvable" },
      { status: 404 }
    );
  }
  if (!chantier.clientEmail) {
    return NextResponse.json(
      { error: "Email client manquant — renseigne-le avant d'envoyer la garantie" },
      { status: 400 }
    );
  }

  // Resolve install date — prefer explicit scheduledDate, fall back to
  // completedAt or now. Convert YYYY-MM-DD → YYYY/MM/DD (PDF template format).
  let installRaw: string;
  if (chantier.scheduledDate) {
    installRaw = chantier.scheduledDate;
  } else if (chantier.completedAt) {
    installRaw = new Date(chantier.completedAt).toISOString().slice(0, 10);
  } else {
    installRaw = new Date().toISOString().slice(0, 10);
  }
  const installationDate = installRaw.replaceAll("-", "/");

  const result = await sendWarrantyCertificate({
    email: chantier.clientEmail,
    buyerName: chantier.clientName,
    addressLine1: chantier.addressLine1,
    addressLine2: chantier.addressLine2 ?? "",
    installationDate,
    sentBy: `chantier:${chantier.id}`,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  await setChantierFields(id, { warrantySentAt: Date.now() });

  return NextResponse.json({ success: true, filename: result.filename });
}
