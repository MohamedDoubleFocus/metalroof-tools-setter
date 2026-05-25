import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { uploadReportPdf } from "@/lib/reports/blob";
import { attachReportPdf, getReportOrder } from "@/lib/reports/kv";
import { fireReportReadyWebhook } from "@/lib/reports/make-webhook";
import { detectContext } from "@/lib/reports/context";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/reports/upload-pdf
 *
 * Freelancer-only. Uploads the completed PDF to Vercel Blob, attaches the
 * URL to the order (status → "ready"), and fires the Make.com webhook so
 * the closer is notified.
 *
 * Form data:
 *   file: File (application/pdf)
 *   orderId: string
 */
export async function POST(request: NextRequest) {
  const ctx = await detectContext();
  if (ctx !== "freelancer") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Form data invalide" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  const orderIdRaw = formData.get("orderId");
  const orderId = typeof orderIdRaw === "string" ? orderIdRaw.trim() : "";

  if (!file) {
    return NextResponse.json(
      { error: "Aucun fichier fourni" },
      { status: 400 }
    );
  }
  if (!orderId) {
    return NextResponse.json({ error: "orderId requis" }, { status: 400 });
  }
  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return NextResponse.json(
      { error: "Le fichier doit être un PDF" },
      { status: 400 }
    );
  }
  if (file.size > 30 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Le PDF ne doit pas dépasser 30 Mo" },
      { status: 400 }
    );
  }

  // Verify the order exists before uploading anything
  const existing = await getReportOrder(orderId);
  if (!existing) {
    return NextResponse.json(
      { error: "Commande introuvable" },
      { status: 404 }
    );
  }

  let pdfUrl: string;
  try {
    const arrayBuffer = await file.arrayBuffer();
    pdfUrl = await uploadReportPdf(
      Buffer.from(arrayBuffer),
      orderId,
      file.name
    );
  } catch (err) {
    console.error("[reports/upload-pdf] blob upload failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Erreur lors du téléchargement",
      },
      { status: 500 }
    );
  }

  const updated = await attachReportPdf(orderId, pdfUrl);
  if (!updated) {
    return NextResponse.json(
      { error: "Commande introuvable après upload" },
      { status: 500 }
    );
  }

  // Notify the closer side via Make in the background — never block the
  // freelancer's submit on a slow third-party.
  after(() => fireReportReadyWebhook(updated));

  return NextResponse.json({
    success: true,
    pdfUrl,
    orderId,
  });
}
