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
  shingleTileUrl?: string;
}

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
      results: ColorResult[];
      backOriginalImageUrl?: string | null;
      backResults?: ColorResult[];
      clientName?: string;
    };

    if (!originalImageUrl || !results) {
      return NextResponse.json(
        { error: "Paramètres invalides" },
        { status: 400 }
      );
    }

    const hasBack = !!(
      backOriginalImageUrl &&
      backResults &&
      backResults.length > 0
    );

    if (results.length === 0 && !hasBack) {
      return NextResponse.json(
        { error: "Aucune image à inclure dans le PDF" },
        { status: 400 }
      );
    }

    // Collect all image URLs to download (front + back)
    const frontImageUrls: string[] = [];
    for (const r of results) {
      if (r.waveTileUrl) frontImageUrls.push(r.waveTileUrl);
      if (r.standingSeamUrl) frontImageUrls.push(r.standingSeamUrl);
      if (r.shingleTileUrl) frontImageUrls.push(r.shingleTileUrl);
    }

    const backImageUrls: string[] = [];
    if (hasBack) {
      for (const r of backResults!) {
        if (r.waveTileUrl) backImageUrls.push(r.waveTileUrl);
        if (r.standingSeamUrl) backImageUrls.push(r.standingSeamUrl);
        if (r.shingleTileUrl) backImageUrls.push(r.shingleTileUrl);
      }
    }

    const downloadPromises: Promise<Buffer>[] = [
      getLogoPngBuffer(),
      downloadImageAsBuffer(originalImageUrl),
      ...frontImageUrls.map((url) => downloadImageAsBuffer(url)),
    ];
    if (hasBack && backOriginalImageUrl) {
      downloadPromises.push(downloadImageAsBuffer(backOriginalImageUrl));
      downloadPromises.push(
        ...backImageUrls.map((url) => downloadImageAsBuffer(url))
      );
    }

    const downloaded = await Promise.all(downloadPromises);

    let idx = 0;
    const logoBuffer = downloaded[idx++];
    const originalImageBuffer = downloaded[idx++];

    const frontImageBuffers: Buffer[] = [];
    for (let i = 0; i < frontImageUrls.length; i++) {
      frontImageBuffers.push(downloaded[idx++]);
    }

    let backOriginalImageBuffer: Buffer | undefined;
    const backImageBuffers: Buffer[] = [];
    if (hasBack) {
      backOriginalImageBuffer = downloaded[idx++];
      for (let i = 0; i < backImageUrls.length; i++) {
        backImageBuffers.push(downloaded[idx++]);
      }
    }

    // Map front buffers back to color pages
    let frontBufIdx = 0;
    const colorPages = results.map((r) => ({
      color: COLORS[r.colorKey],
      waveTileBuffer: r.waveTileUrl ? frontImageBuffers[frontBufIdx++] : undefined,
      standingSeamBuffer: r.standingSeamUrl
        ? frontImageBuffers[frontBufIdx++]
        : undefined,
      shingleTileBuffer: r.shingleTileUrl
        ? frontImageBuffers[frontBufIdx++]
        : undefined,
    }));

    // Map back buffers back to color pages
    let backColorPages;
    if (hasBack) {
      let backBufIdx = 0;
      backColorPages = backResults!.map((r) => ({
        color: COLORS[r.colorKey],
        waveTileBuffer: r.waveTileUrl ? backImageBuffers[backBufIdx++] : undefined,
        standingSeamBuffer: r.standingSeamUrl
          ? backImageBuffers[backBufIdx++]
          : undefined,
        shingleTileBuffer: r.shingleTileUrl
          ? backImageBuffers[backBufIdx++]
          : undefined,
      }));
    }

    const pdfBuffer = await buildPdf({
      originalImageBuffer,
      colorPages,
      backOriginalImageBuffer,
      backColorPages,
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
