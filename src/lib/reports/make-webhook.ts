/**
 * Make.com webhook for transactional emails tied to report orders.
 *
 * The Make scenario on the receiving end is intentionally simple — it just
 * takes the four fields below and forwards them to a generic email module
 * (Gmail / SMTP). All copy lives here so we can tweak it without touching
 * Make.
 *
 *   { to: string, subject: string, body: string (HTML), pdfUrl?: string }
 *
 * Two events are fired:
 *   - report.created  → email to the freelancer (English)
 *   - report.ready    → email to the closer team (French) with the PDF
 *
 * Configuration:
 *   - MAKE_REPORTS_WEBHOOK_URL     : Make scenario webhook URL (required)
 *   - FREELANCER_EMAIL             : where new-order emails go (required)
 *   - TEAM_EMAIL                   : where ready emails go (required)
 *
 * Any missing config → warning log + silent skip. Never crashes the request.
 */

import type { ReportOrder } from "@/types/reports";

interface EmailWebhookPayload {
  to: string;
  subject: string;
  /** HTML body */
  body: string;
  /** Direct link to the generated PDF — present on report.ready only */
  pdfUrl?: string;
}

function buildPortalUrl(orderId: string): string {
  const domain = process.env.FREELANCER_DOMAIN;
  if (!domain) return `/portal/${orderId}`;
  return `https://${domain}/portal/${orderId}`;
}

async function post(payload: EmailWebhookPayload): Promise<void> {
  const url = process.env.MAKE_REPORTS_WEBHOOK_URL;
  if (!url) {
    console.warn(
      "[reports-webhook] MAKE_REPORTS_WEBHOOK_URL not set — skipping email"
    );
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        "[reports-webhook] non-OK response",
        res.status,
        text.slice(0, 200)
      );
    }
  } catch (err) {
    console.error("[reports-webhook] fetch failed:", err);
  }
}

// ─── Email content builders ──────────────────────────────────────────────

function buildFreelancerCreatedEmail(order: ReportOrder): EmailWebhookPayload {
  const portalUrl = buildPortalUrl(order.id);
  const notesBlock = order.notes
    ? `<p style="margin:16px 0 0;"><strong>Special instructions:</strong></p>
       <p style="margin:4px 0 0;white-space:pre-wrap;color:#475569;">${escapeHtml(order.notes)}</p>`
    : "";

  const body = `
<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;background:#f8fafc;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:white;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
    <h2 style="margin:0 0 16px;font-size:20px;">New roofing report order</h2>
    <p style="margin:0 0 16px;color:#475569;">A new order has been added to your queue.</p>

    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#64748b;width:120px;">Address</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(order.address)}</td></tr>
    </table>

    ${notesBlock}

    <p style="margin:32px 0 0;">
      <a href="${portalUrl}"
         style="display:inline-block;background:#0f172a;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;">
        Open order →
      </a>
    </p>

    <p style="margin:32px 0 0;font-size:12px;color:#94a3b8;">
      Report Portal · automated notification
    </p>
  </div>
</body></html>`.trim();

  const to = process.env.FREELANCER_EMAIL;
  return {
    to: to ?? "",
    subject: `New roofing report order — ${order.address}`,
    body,
  };
}

function buildTeamReadyEmail(order: ReportOrder): EmailWebhookPayload {
  const pdfUrl = order.pdfUrl ?? "";
  const phoneRow = order.clientPhone
    ? `<tr><td style="padding:8px 0;color:#6b7280;width:120px;">Téléphone</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(order.clientPhone)}</td></tr>`
    : "";

  const body = `
<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;color:#111827;background:#f9fafb;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:white;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
    <h2 style="margin:0 0 8px;font-size:20px;color:#9C082D;">📄 Rapport prêt</h2>
    <p style="margin:0 0 16px;color:#4b5563;">Le freelancer vient d'uploader le rapport pour la commande suivante.</p>

    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Client</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(order.closerLabel)}</td></tr>
      ${phoneRow}
      <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Adresse</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(order.address)}</td></tr>
    </table>

    <p style="margin:32px 0 0;">
      <a href="${pdfUrl}"
         style="display:inline-block;background:#9C082D;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;">
        Télécharger le PDF →
      </a>
    </p>

    <p style="margin:32px 0 0;font-size:12px;color:#9ca3af;">
      Metal Roof Montréal · notification automatique
    </p>
  </div>
</body></html>`.trim();

  const to = process.env.TEAM_EMAIL;
  return {
    to: to ?? "",
    subject: `Rapport prêt — ${order.closerLabel}`,
    body,
    pdfUrl,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Notify the freelancer that a new order needs their attention.
 * Fired from POST /api/reports after createReportOrder succeeds.
 */
export async function fireReportCreatedWebhook(
  order: ReportOrder
): Promise<void> {
  if (!process.env.FREELANCER_EMAIL) {
    console.warn(
      "[reports-webhook] FREELANCER_EMAIL not set — skipping created email"
    );
    return;
  }
  await post(buildFreelancerCreatedEmail(order));
}

function buildTeamUnavailableEmail(order: ReportOrder): EmailWebhookPayload {
  const reason = order.unavailableReason ?? "(no reason given)";
  const phoneRow = order.clientPhone
    ? `<tr><td style="padding:8px 0;color:#6b7280;width:120px;">Téléphone</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(order.clientPhone)}</td></tr>`
    : "";

  const body = `
<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;color:#111827;background:#f9fafb;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:white;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
    <h2 style="margin:0 0 8px;font-size:20px;color:#b91c1c;">⚠️ Rapport indisponible</h2>
    <p style="margin:0 0 16px;color:#4b5563;">Le freelancer a signalé que cette commande ne peut pas être réalisée.</p>

    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Client</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(order.closerLabel)}</td></tr>
      ${phoneRow}
      <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Adresse</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(order.address)}</td></tr>
    </table>

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 4px;font-size:12px;color:#991b1b;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Raison</p>
      <p style="margin:0;color:#7f1d1d;white-space:pre-wrap;">${escapeHtml(reason)}</p>
    </div>

    <p style="margin:32px 0 0;font-size:12px;color:#9ca3af;">
      Metal Roof Montréal · notification automatique
    </p>
  </div>
</body></html>`.trim();

  const to = process.env.TEAM_EMAIL;
  return {
    to: to ?? "",
    subject: `Rapport indisponible — ${order.closerLabel}`,
    body,
  };
}

/**
 * Notify the closer team that the freelancer cannot produce this report.
 * Fired from PATCH /api/reports/[id] when the freelancer flips status
 * to "unavailable".
 */
export async function fireReportUnavailableWebhook(
  order: ReportOrder
): Promise<void> {
  if (order.status !== "unavailable") {
    console.warn(
      "[reports-webhook] skipping unavailable email — order not in unavailable state",
      { id: order.id, status: order.status }
    );
    return;
  }
  if (!process.env.TEAM_EMAIL) {
    console.warn(
      "[reports-webhook] TEAM_EMAIL not set — skipping unavailable email"
    );
    return;
  }
  await post(buildTeamUnavailableEmail(order));
}

/**
 * Notify the closer team that the report is ready for pickup.
 * Fired from /api/reports/upload-pdf after the freelancer uploads the PDF.
 */
export async function fireReportReadyWebhook(
  order: ReportOrder
): Promise<void> {
  if (order.status !== "ready" || !order.pdfUrl) {
    console.warn(
      "[reports-webhook] skipping ready email — order not in ready state",
      { id: order.id, status: order.status }
    );
    return;
  }
  if (!process.env.TEAM_EMAIL) {
    console.warn(
      "[reports-webhook] TEAM_EMAIL not set — skipping ready email"
    );
    return;
  }
  await post(buildTeamReadyEmail(order));
}
