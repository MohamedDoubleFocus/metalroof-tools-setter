import { NextRequest, NextResponse } from "next/server";
import { getChantier, setChantierFields } from "@/lib/chantiers/kv";
import { sendSms } from "@/lib/openphone";
import { daysUntil } from "@/lib/chantiers/timezone";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/chantiers/[id]/notify
 *
 * Manual "Notify client now" — sends an SMS announcing that the install is
 * coming up. If the chantier has a scheduledDate that maps to J-7 or J-2,
 * mark the corresponding marker so the cron doesn't re-send the same day.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chantier = await getChantier(id);
  if (!chantier) {
    return NextResponse.json(
      { error: "Chantier introuvable" },
      { status: 404 }
    );
  }

  const firstName = chantier.clientName.split(/\s+/)[0] || "client";
  let content: string;
  if (chantier.scheduledDate) {
    const days = daysUntil(chantier.scheduledDate);
    if (days != null && days >= 0) {
      content =
        `Bonjour ${firstName}, votre installation de toiture métallique par Metal Roof Montréal est prévue dans ${days} jour${days > 1 ? "s" : ""}. ` +
        `Notre équipe vous contactera la veille pour confirmer les détails. Merci de votre confiance ! (514) 867-0787`;
    } else {
      content =
        `Bonjour ${firstName}, votre installation de toiture métallique par Metal Roof Montréal est prévue prochainement. ` +
        `Notre équipe vous contactera pour confirmer les détails. Merci ! (514) 867-0787`;
    }
  } else {
    content =
      `Bonjour ${firstName}, votre projet de toiture métallique avec Metal Roof Montréal avance bien. ` +
      `Nous vous contacterons bientôt pour planifier l'installation. Merci de votre confiance ! (514) 867-0787`;
  }

  const result = await sendSms({ to: chantier.clientPhone, content });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Erreur envoi SMS" },
      { status: 502 }
    );
  }

  // If this manual notify matches a J-7 / J-2 window, mark it so the cron
  // doesn't double-send today.
  const days = chantier.scheduledDate
    ? daysUntil(chantier.scheduledDate)
    : null;
  const fields: Parameters<typeof setChantierFields>[1] = {};
  if (days === 7) fields.smsJ7SentAt = Date.now();
  if (days === 2) fields.smsJ2SentAt = Date.now();
  if (Object.keys(fields).length > 0) {
    await setChantierFields(id, fields);
  }

  return NextResponse.json({
    success: true,
    messageId: result.messageId,
  });
}
