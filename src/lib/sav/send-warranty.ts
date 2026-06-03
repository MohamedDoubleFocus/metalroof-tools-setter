/**
 * Build + send a warranty certificate by email.
 *
 * Shared helper used by:
 *   - /api/sav/warranty (standalone NextAuth-gated form)
 *   - /api/chantiers/[id]/send-warranty (pre-fills from chantier, mr-pass cookie)
 *
 * The PDF is forwarded to Make.com (base64 inline) via MAKE_WARRANTY_WEBHOOK_URL,
 * which handles the actual SMTP/Gmail send. Never throws — returns ok/error.
 */

import { buildWarrantyPdf } from "@/lib/sav/warranty-pdf";
import { getWarrantyLogoPngBuffer } from "@/lib/image-utils";

export interface SendWarrantyParams {
  email: string;
  buyerName: string;
  addressLine1: string;
  addressLine2: string;
  /** YYYY/MM/DD — the format used in the PDF template */
  installationDate: string;
  /** Optional sender identity (closer email or "system") for audit. */
  sentBy?: string | null;
}

export interface SendWarrantyResult {
  ok: boolean;
  filename?: string;
  error?: string;
}

export async function sendWarrantyCertificate(
  params: SendWarrantyParams
): Promise<SendWarrantyResult> {
  let pdfBuffer: Buffer;
  try {
    const logoBuffer = await getWarrantyLogoPngBuffer();
    pdfBuffer = await buildWarrantyPdf({
      buyerName: params.buyerName,
      addressLine1: params.addressLine1,
      addressLine2: params.addressLine2,
      installationDate: params.installationDate,
      logoBuffer,
    });
  } catch (err) {
    console.error("[send-warranty] PDF build failed:", err);
    return {
      ok: false,
      error: "Erreur lors de la création du PDF",
    };
  }

  const makeUrl = process.env.MAKE_WARRANTY_WEBHOOK_URL;
  if (!makeUrl) {
    return {
      ok: false,
      error: "MAKE_WARRANTY_WEBHOOK_URL non configuré",
    };
  }

  const filename = `certificat-garantie-${params.buyerName
    .replace(/\s+/g, "-")
    .toLowerCase()}.pdf`;

  const payload = {
    type: "warranty_certificate",
    email: params.email,
    buyerName: params.buyerName,
    addressLine1: params.addressLine1,
    addressLine2: params.addressLine2,
    installationDate: params.installationDate,
    filename,
    pdfBase64: pdfBuffer.toString("base64"),
    sentBy: params.sentBy ?? null,
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
      console.error("[send-warranty] Make webhook failed:", res.status, text.slice(0, 200));
      return {
        ok: false,
        error: `Erreur Make.com (${res.status})`,
      };
    }
  } catch (err) {
    console.error("[send-warranty] Make webhook error:", err);
    return {
      ok: false,
      error: "Impossible de joindre Make.com",
    };
  }

  return { ok: true, filename };
}
