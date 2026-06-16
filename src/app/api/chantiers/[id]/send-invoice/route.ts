import { NextRequest, NextResponse } from "next/server";
import { getChantier, setChantierFields } from "@/lib/chantiers/kv";
import { buildInvoicePdf, formatInvoiceNumber } from "@/lib/chantiers/invoice-pdf";
import { uploadInvoicePdf } from "@/lib/chantiers/invoice-blob";
import { fireInvoiceWebhook } from "@/lib/chantiers/make-webhook";
import { getLogoPngBuffer } from "@/lib/image-utils";
import { requireAdmin, respondError } from "@/lib/auth/can";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/chantiers/[id]/send-invoice
 *
 * Builds the invoice PDF, uploads to Vercel Blob, fires the Make.com email
 * webhook so the client receives the invoice. Stores invoicePdfUrl so the
 * office can re-download from the chantier detail page.
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

  if (chantier.totalAmount == null) {
    return NextResponse.json(
      { error: "Montant total requis — renseigne-le avant d'envoyer la facture" },
      { status: 400 }
    );
  }
  if (!chantier.clientEmail) {
    return NextResponse.json(
      { error: "Email client manquant — renseigne-le avant d'envoyer la facture" },
      { status: 400 }
    );
  }

  const issuedAt = Date.now();
  const invoiceNumber = formatInvoiceNumber(chantier, issuedAt);

  let pdfBuffer: Buffer;
  try {
    const logoBuffer = await getLogoPngBuffer();
    pdfBuffer = await buildInvoicePdf({
      chantier,
      logoBuffer,
      invoiceNumber,
      issuedAt,
    });
  } catch (err) {
    console.error("[send-invoice] PDF build failed:", err);
    return NextResponse.json(
      { error: "Erreur création PDF facture" },
      { status: 500 }
    );
  }

  let pdfUrl: string;
  try {
    pdfUrl = await uploadInvoicePdf(pdfBuffer, chantier.id);
  } catch (err) {
    console.error("[send-invoice] Blob upload failed:", err);
    return NextResponse.json(
      { error: "Erreur upload Vercel Blob" },
      { status: 502 }
    );
  }

  const webhookResult = await fireInvoiceWebhook({
    chantier,
    pdfUrl,
    invoiceNumber,
  });

  await setChantierFields(id, {
    invoiceSentAt: Date.now(),
    invoicePdfUrl: pdfUrl,
  });

  if (!webhookResult.ok) {
    return NextResponse.json(
      { success: false, pdfUrl, error: webhookResult.error },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    pdfUrl,
    invoiceNumber,
  });
}
