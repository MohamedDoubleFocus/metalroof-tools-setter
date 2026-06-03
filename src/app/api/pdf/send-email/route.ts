import { NextRequest, NextResponse } from "next/server";
import {
  buildSimulationPdf,
  type SimulationColorResult,
} from "@/lib/simulator/pdf-helper";
import { uploadSimulationPdf } from "@/lib/simulator/blob";
import { fireSimulationEmailWebhook } from "@/lib/simulator/make-webhook";
import {
  addToSimulationHistory,
  generateSimId,
} from "@/lib/simulator/history";

export const runtime = "nodejs";
export const maxDuration = 120;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: {
    email?: string;
    originalImageUrl?: string;
    results?: SimulationColorResult[];
    backOriginalImageUrl?: string | null;
    backResults?: SimulationColorResult[];
    clientName?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Email valide requis" },
      { status: 400 }
    );
  }

  if (!body.originalImageUrl || !body.results) {
    return NextResponse.json(
      { error: "Paramètres invalides" },
      { status: 400 }
    );
  }

  try {
    const pdfBuffer = await buildSimulationPdf({
      originalImageUrl: body.originalImageUrl,
      results: body.results,
      backOriginalImageUrl: body.backOriginalImageUrl,
      backResults: body.backResults,
      clientName: body.clientName,
    });

    const simId = generateSimId();
    const pdfUrl = await uploadSimulationPdf(pdfBuffer, simId);

    const emailResult = await fireSimulationEmailWebhook({
      to: email,
      pdfUrl,
      clientName: body.clientName,
    });

    await addToSimulationHistory({
      simId,
      clientName: body.clientName,
      pdfUrl,
      thumbnailUrl: body.originalImageUrl,
      createdAt: Date.now(),
      source: "email",
    });

    if (!emailResult.ok) {
      return NextResponse.json(
        {
          success: false,
          pdfUrl,
          error: emailResult.error,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, pdfUrl });
  } catch (err) {
    console.error("[pdf/send-email] failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Erreur lors de l'envoi du PDF",
      },
      { status: 500 }
    );
  }
}
