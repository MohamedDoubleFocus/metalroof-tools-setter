/**
 * Make.com email webhook for chantiers — final invoice delivery.
 *
 * Uses MAKE_CLIENT_WEBHOOK_URL — the default webhook for all client-facing
 * communications (simulator + invoice). Generic {to, subject, body, pdfUrl}
 * forwarder.
 */

import type { Chantier } from "@/types/chantiers";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatAmount(n: number | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

interface FireInvoiceParams {
  chantier: Chantier;
  pdfUrl: string;
  invoiceNumber: string;
}

export async function fireInvoiceWebhook(
  params: FireInvoiceParams
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.MAKE_CLIENT_WEBHOOK_URL;
  if (!url) {
    return {
      ok: false,
      error: "MAKE_CLIENT_WEBHOOK_URL non configuré",
    };
  }

  const { chantier, pdfUrl, invoiceNumber } = params;
  const greeting = `Bonjour ${escapeHtml(chantier.clientName.split(/\s+/)[0])},`;

  const body = `
<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;color:#111827;background:#f9fafb;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:white;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
    <h2 style="margin:0 0 8px;font-size:20px;color:#9C082D;">Votre facture finale</h2>
    <p style="margin:0 0 16px;color:#4b5563;">${greeting}</p>
    <p style="margin:0 0 24px;color:#4b5563;">
      Veuillez trouver ci-jointe votre facture finale pour les travaux de toiture métallique réalisés au
      <strong>${escapeHtml(chantier.addressLine1)}${chantier.addressLine2 ? ", " + escapeHtml(chantier.addressLine2) : ""}</strong>.
    </p>

    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#6b7280;width:160px;">N° de facture</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(invoiceNumber)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Montant total</td><td style="padding:8px 0;font-weight:700;color:#9C082D;">${formatAmount(chantier.totalAmount)}</td></tr>
    </table>

    <p style="margin:32px 0 0;">
      <a href="${pdfUrl}"
         style="display:inline-block;background:#9C082D;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;">
        Télécharger la facture →
      </a>
    </p>

    <p style="margin:32px 0 0;font-size:12px;color:#9ca3af;">
      Metal Roof Montréal · metalroofmontreal.ca · (514) 867-0787
    </p>
  </div>
</body></html>`.trim();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: chantier.clientEmail ?? "",
        subject: `Facture ${invoiceNumber} — Metal Roof Montréal`,
        body,
        pdfUrl,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Make webhook ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur réseau Make",
    };
  }
}
