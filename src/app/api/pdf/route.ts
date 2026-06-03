import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import {
  buildSimulationPdf,
  type SimulationColorResult,
} from "@/lib/simulator/pdf-helper";
import { uploadSimulationPdf } from "@/lib/simulator/blob";
import {
  addToSimulationHistory,
  generateSimId,
} from "@/lib/simulator/history";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const {
      originalImageUrl,
      results,
      backOriginalImageUrl,
      backResults,
      clientName,
    } = (await request.json()) as {
      originalImageUrl: string;
      results: SimulationColorResult[];
      backOriginalImageUrl?: string | null;
      backResults?: SimulationColorResult[];
      clientName?: string;
    };

    if (!originalImageUrl || !results) {
      return NextResponse.json(
        { error: "Paramètres invalides" },
        { status: 400 }
      );
    }

    const pdfBuffer = await buildSimulationPdf({
      originalImageUrl,
      results,
      backOriginalImageUrl,
      backResults,
      clientName,
    });

    // Best-effort: archive the PDF to Blob + add to the closer-side history.
    // Runs after the response is flushed; failures only show in server logs.
    const simId = generateSimId();
    after(async () => {
      try {
        const pdfUrl = await uploadSimulationPdf(pdfBuffer, simId);
        await addToSimulationHistory({
          simId,
          clientName,
          pdfUrl,
          thumbnailUrl: originalImageUrl,
          createdAt: Date.now(),
          source: "closer-direct",
        });
      } catch (err) {
        console.error("[pdf] history archive failed:", err);
      }
    });

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="simulation-toiture.pdf"',
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la création du PDF",
      },
      { status: 500 }
    );
  }
}
