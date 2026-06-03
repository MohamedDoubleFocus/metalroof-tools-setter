/**
 * Make.com email webhook for simulator deliveries.
 *
 * Uses MAKE_CLIENT_WEBHOOK_URL — the default webhook for ALL client-facing
 * communications (simulator PDF, invoice). The Make scenario is a generic
 * forwarder that accepts { to, subject, body (HTML), pdfUrl? } and emails
 * via SMTP/Gmail.
 *
 * (Reports module stays on MAKE_REPORTS_WEBHOOK_URL — freelancer + team only.
 *  Warranty stays on MAKE_WARRANTY_WEBHOOK_URL — different payload format.)
 */

interface SendEmailParams {
  to: string;
  pdfUrl: string;
  clientName?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function fireSimulationEmailWebhook(
  params: SendEmailParams
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.MAKE_CLIENT_WEBHOOK_URL;
  if (!url) {
    return {
      ok: false,
      error: "MAKE_CLIENT_WEBHOOK_URL non configuré",
    };
  }

  const greeting = params.clientName
    ? `Bonjour ${escapeHtml(params.clientName.split(/\s+/)[0])},`
    : "Bonjour,";

  const body = `
<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;color:#111827;background:#f9fafb;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:white;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
    <h2 style="margin:0 0 8px;font-size:20px;color:#9C082D;">Votre simulation de toiture</h2>
    <p style="margin:0 0 16px;color:#4b5563;">${greeting}</p>
    <p style="margin:0 0 24px;color:#4b5563;">
      Voici votre simulation personnalisée. Vous pouvez télécharger le PDF avec toutes les couleurs et styles que nous avons préparés pour votre maison.
    </p>

    <p style="margin:32px 0 0;">
      <a href="${params.pdfUrl}"
         style="display:inline-block;background:#9C082D;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;">
        Télécharger le PDF →
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
        to: params.to,
        subject: "Votre simulation de toiture — Metal Roof Montréal",
        body,
        pdfUrl: params.pdfUrl,
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
