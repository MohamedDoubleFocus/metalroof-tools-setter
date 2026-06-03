import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendWarrantyCertificate } from "@/lib/sav/send-warranty";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/sav/warranty
 *
 * Standalone warranty form (NextAuth-gated). Delegates the actual PDF build
 * + Make.com email forwarding to sendWarrantyCertificate so the chantiers
 * module can reuse the exact same path.
 *
 * Body:
 *   { email, buyerName, addressLine1, addressLine2, installationDate (YYYY-MM-DD) }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: {
    email?: string;
    buyerName?: string;
    addressLine1?: string;
    addressLine2?: string;
    installationDate?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const buyerName = (body.buyerName || "").trim();
  const addressLine1 = (body.addressLine1 || "").trim();
  const addressLine2 = (body.addressLine2 || "").trim();
  const installationDateRaw = (body.installationDate || "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Adresse courriel invalide" },
      { status: 400 }
    );
  }
  if (!buyerName) {
    return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  }
  if (!addressLine1) {
    return NextResponse.json({ error: "Adresse requise" }, { status: 400 });
  }
  if (!addressLine2) {
    return NextResponse.json(
      { error: "Ville/province/code postal requis" },
      { status: 400 }
    );
  }
  if (!installationDateRaw) {
    return NextResponse.json(
      { error: "Date d'installation requise" },
      { status: 400 }
    );
  }

  // YYYY-MM-DD → YYYY/MM/DD (template format)
  const installationDate = installationDateRaw.replaceAll("-", "/");

  const result = await sendWarrantyCertificate({
    email,
    buyerName,
    addressLine1,
    addressLine2,
    installationDate,
    sentBy: session.user?.email ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ success: true, filename: result.filename });
}
