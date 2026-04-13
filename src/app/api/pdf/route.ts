import { NextRequest, NextResponse } from "next/server";
import { COLORS } from "@/lib/colors";
import { downloadImageAsBuffer, getLogoPngBuffer } from "@/lib/image-utils";
import { buildPdf } from "@/lib/pdf-builder";

export const runtime = "nodejs";
export const maxDuration = 120;

interface ColorResult {
  colorKey: string;
  waveTileUrl?: string;
  standingSeamUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { originalImageUrl, results, clientName } = (await request.json()) as {
      originalImageUrl: string;
      results: ColorResult[];
      clientName?: string;
    };

    if (!originalImageUrl || !results || results.length === 0) {
      return NextResponse.json(
        { error: "Paramètres invalides" },
        { status: 400 }
      );
    }

    // Collect all image URLs to download
    const imageUrls: string[] = [];
    for (const r of results) {
      if (r.waveTileUrl) imageUrls.push(r.waveTileUrl);
      if (r.standingSeamUrl) imageUrls.push(r.standingSeamUrl);
    }

    const [logoBuffer, originalImageBuffer, ...imageBuffers] =
      await Promise.all([
        getLogoPngBuffer(),
        downloadImageAsBuffer(originalImageUrl),
        ...imageUrls.map((url) => downloadImageAsBuffer(url)),
      ]);

    // Map buffers back to color pages
    let bufIdx = 0;
    const colorPages = results.map((r) => ({
      color: COLORS[r.colorKey],
      waveTileBuffer: r.waveTileUrl ? imageBuffers[bufIdx++] : undefined,
      standingSeamBuffer: r.standingSeamUrl ? imageBuffers[bufIdx++] : undefined,
    }));

    const pdfBuffer = await buildPdf({
      originalImageBuffer,
      colorPages,
      logoBuffer,
      clientName,
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
