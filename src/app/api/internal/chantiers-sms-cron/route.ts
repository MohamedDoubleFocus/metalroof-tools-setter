import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/internal/chantiers-sms-cron
 *
 * SMS rappels J-7 / J-2 — DÉSACTIVÉ.
 *
 * Cet endpoint était appelé par un cron Vercel quotidien pour envoyer un SMS
 * aux clients dont la date d'installation tombait à J-7 ou J-2. Le cron a été
 * retiré de vercel.json. L'endpoint reste en place comme no-op au cas où une
 * exécution fantôme du cron arriverait peu après le déploiement.
 *
 * Pour réactiver : restaurer la logique d'envoi + remettre l'entrée dans
 * vercel.json :
 *   { "path": "/api/internal/chantiers-sms-cron", "schedule": "0 13 * * *" }
 *
 * La version pré-désactivation : voir l'historique git.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    disabled: true,
    message: "SMS rappels J-7/J-2 désactivés",
  });
}
