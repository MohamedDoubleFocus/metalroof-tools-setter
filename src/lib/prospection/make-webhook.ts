/**
 * Make.com webhook for prospection events.
 *
 * Fires ONLY when a lead is CREATED with a status that should appear in
 * Google Calendar / CRM (meeting, repasser, suivi). Updates and deletes
 * are intentionally NOT notified — Make should not try to mirror lead
 * mutations after the fact (would create stale calendar entries).
 *
 * Configuration:
 *   - Set MAKE_PROSPECTION_WEBHOOK_URL in your Vercel environment.
 *   - If unset, the helper logs a warning and returns silently — the
 *     prospection flow keeps working without the notification.
 */

import type { Lead, LeadStatus } from "@/types/prospection";

/** Statuses that should trigger a calendar / CRM notification. */
const NOTIFIABLE_STATUSES: LeadStatus[] = ["meeting", "repasser", "suivi"];

export type ProspectionEventType = "lead.created";

interface ProspectionWebhookPayload {
  type: ProspectionEventType;
  status: LeadStatus;
  leadId: string;
  knockerId: string;
  knockerName: string;
  clientName?: string;
  clientPhone?: string;
  address: string;
  lat: number;
  lng: number;
  /** ISO string for the scheduled moment (meeting or follow-up), if any. */
  scheduledAt?: string;
  notes?: string;
  photoUrl?: string;
  sectorId?: string;
  occurredAt: string; // ISO of when this event was fired
}

/**
 * Fire-and-forget webhook to Make.com. Never throws — failures are logged
 * but don't break the request that triggered the event.
 */
export async function fireProspectionWebhook(
  type: ProspectionEventType,
  lead: Lead
): Promise<void> {
  // Only notify for statuses that map to a calendar event / follow-up task.
  if (!NOTIFIABLE_STATUSES.includes(lead.status)) return;

  const url = process.env.MAKE_PROSPECTION_WEBHOOK_URL;
  if (!url) {
    console.warn(
      "[prospection-webhook] MAKE_PROSPECTION_WEBHOOK_URL not set — skipping"
    );
    return;
  }

  const scheduledAtMs = lead.meetingAt ?? lead.followUpAt;
  const payload: ProspectionWebhookPayload = {
    type,
    status: lead.status,
    leadId: lead.id,
    knockerId: lead.knockerId,
    knockerName: lead.knockerName,
    clientName: lead.clientName,
    clientPhone: lead.clientPhone,
    address: lead.address,
    lat: lead.lat,
    lng: lead.lng,
    scheduledAt: scheduledAtMs ? new Date(scheduledAtMs).toISOString() : undefined,
    notes: lead.notes,
    photoUrl: lead.photoUrl,
    sectorId: lead.sectorId,
    occurredAt: new Date().toISOString(),
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
        "[prospection-webhook] non-OK response",
        res.status,
        text.slice(0, 200)
      );
    }
  } catch (err) {
    console.error("[prospection-webhook] fetch failed:", err);
  }
}
