import { NextRequest, NextResponse } from "next/server";
import { listChantiersByStatus, setChantierFields } from "@/lib/chantiers/kv";
import { sendSms } from "@/lib/openphone";
import { daysUntil } from "@/lib/chantiers/timezone";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/internal/chantiers-sms-cron
 *
 * Daily Vercel cron. Scans scheduled chantiers, sends SMS to clients whose
 * scheduledDate is exactly J-7 or J-2 away today (America/Toronto), and
 * marks the corresponding marker so we never re-send on subsequent runs.
 *
 * Idempotent: relies on smsJ7SentAt / smsJ2SentAt markers.
 */
export async function GET(request: NextRequest) {
  // Vercel automatically adds a header on cron-triggered calls; reject anything
  // else if CRON_SECRET is configured (optional hardening).
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const chantiers = await listChantiersByStatus("scheduled");
  const results: Array<{
    id: string;
    days: number;
    sent: boolean;
    error?: string;
  }> = [];

  for (const c of chantiers) {
    if (!c.scheduledDate) continue;
    const days = daysUntil(c.scheduledDate);
    if (days == null) continue;

    let kind: "J7" | "J2" | null = null;
    if (days === 7 && !c.smsJ7SentAt) kind = "J7";
    else if (days === 2 && !c.smsJ2SentAt) kind = "J2";
    if (!kind) continue;

    const firstName = c.clientName.split(/\s+/)[0] || "client";
    const content =
      kind === "J7"
        ? `Bonjour ${firstName}, votre installation de toiture métallique avec Metal Roof Montréal est prévue dans une semaine (${c.scheduledDate}). Notre équipe vous contactera quelques jours avant pour finaliser les détails. (514) 867-0787`
        : `Bonjour ${firstName}, rappel : votre installation de toiture métallique avec Metal Roof Montréal est prévue dans 2 jours (${c.scheduledDate}). À très bientôt ! (514) 867-0787`;

    const res = await sendSms({ to: c.clientPhone, content });
    if (res.success) {
      await setChantierFields(c.id, {
        [kind === "J7" ? "smsJ7SentAt" : "smsJ2SentAt"]: Date.now(),
      });
      results.push({ id: c.id, days, sent: true });
    } else {
      results.push({ id: c.id, days, sent: false, error: res.error });
    }
  }

  return NextResponse.json({
    success: true,
    scanned: chantiers.length,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
