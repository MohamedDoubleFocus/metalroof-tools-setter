import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildWarrantyPdf } from "@/lib/sav/warranty-pdf";
import { getLogoPngBuffer } from "@/lib/image-utils";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/sav/warranty
 *
 * Generates a warranty certificate PDF from the submitted form and forwards
 * it to a Make.com webhook (base64-encoded) so Make can send it by email.
 *
 * Auth: requires a NextAuth Google session (internal tool).
 *
 * Body:
 *   {
 *     email: string,            // destination
 *     buyerName: string,        // e.g. "Mme Edith Villalon"
 *     addressLine1: string,     // street
 *     addressLine2: string,     // city + province + postal
 *     installationDate: string  // YYYY-MM-DD (from <input type="date">)
 *   }
 */
export async function POST(request: NextRequest) {
  // ─── Auth check ─────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // ─── Parse + validate body ──────────────────────────────────────────
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

  // Convert YYYY-MM-DD (HTML date input) → YYYY/MM/DD (template format)
  const installationDate = installationDateRaw.replaceAll("-", "/");

  // ─── Build the PDF ──────────────────────────────────────────────────
  let pdfBuffer: Buffer;
  try {
    const logoBuffer = await getLogoPngBuffer();
    pdfBuffer = await buildWarrantyPdf({
      buyerName,
      addressLine1,
      addressLine2,
      installationDate,
      logoBuffer,
    });
  } catch (err) {
    console.error("[warranty] PDF build failed:", err);
    return NextResponse.json(
      { error: "Erreur lors de la création du PDF" },
      { status: 500 }
    );
  }

  // ─── Forward to Make.com so it can email the PDF ────────────────────
  const makeUrl = process.env.MAKE_WARRANTY_WEBHOOK_URL;
  if (!makeUrl) {
    return NextResponse.json(
      {
        error:
          "MAKE_WARRANTY_WEBHOOK_URL non configuré côté serveur — configurez-le dans les variables d'environnement Vercel.",
      },
      { status: 500 }
    );
  }

  const filename = `certificat-garantie-${buyerName.replace(/\s+/g, "-").toLowerCase()}.pdf`;

  const payload = {
    type: "warranty_certificate",
    email,
    buyerName,
    addressLine1,
    addressLine2,
    installationDate,
    filename,
    pdfBase64: pdfBuffer.toString("base64"),
    sentBy: session.user?.email ?? null,
    sentAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(makeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[warranty] Make webhook failed:", res.status, text.slice(0, 200));
      return NextResponse.json(
        { error: `Erreur Make.com (${res.status})` },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("[warranty] Make webhook error:", err);
    return NextResponse.json(
      { error: "Impossible de joindre Make.com" },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, filename });
}
