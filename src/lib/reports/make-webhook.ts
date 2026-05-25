/**
 * Make.com webhook for report-ready events.
 *
 * Fired once when the freelancer uploads the PDF and the order flips to
 * status "ready". Make then handles the closer notification fan-out
 * (SMS via OpenPhone, email, Slack, GHL tag, etc.) — keeps the orchestration
 * config-driven outside of the codebase.
 *
 * Set MAKE_REPORTS_WEBHOOK_URL on Vercel when the scenario is ready. If
 * unset, the helper logs a warning and returns — the upload still succeeds.
 */

import type { ReportOrder } from "@/types/reports";

interface ReportReadyPayload {
  type: "report.ready";
  orderId: string;
  closerLabel: string;
  clientPhone: string | null;
  address: string;
  pdfUrl: string;
  completedAt: string;
}

export async function fireReportReadyWebhook(
  order: ReportOrder
): Promise<void> {
  if (order.status !== "ready" || !order.pdfUrl || !order.completedAt) {
    console.warn(
      "[reports-webhook] skipping fire — order not in ready state",
      { id: order.id, status: order.status }
    );
    return;
  }

  const url = process.env.MAKE_REPORTS_WEBHOOK_URL;
  if (!url) {
    console.warn(
      "[reports-webhook] MAKE_REPORTS_WEBHOOK_URL not set — skipping notification"
    );
    return;
  }

  const payload: ReportReadyPayload = {
    type: "report.ready",
    orderId: order.id,
    closerLabel: order.closerLabel,
    clientPhone: order.clientPhone ?? null,
    address: order.address,
    pdfUrl: order.pdfUrl,
    completedAt: new Date(order.completedAt).toISOString(),
  };

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
