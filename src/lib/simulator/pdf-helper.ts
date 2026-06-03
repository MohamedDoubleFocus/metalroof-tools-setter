/**
 * Shared PDF construction for the simulator.
 *
 * Used by both `POST /api/pdf` (direct download) and
 * `POST /api/pdf/send-email` (build + upload + email). Same input shape as
 * the public API endpoints — downloads the image URLs, maps them back to
 * pages, and calls `buildPdf` from pdf-builder.
 */

import { COLORS } from "@/lib/colors";
import { downloadImageAsBuffer, getLogoPngBuffer } from "@/lib/image-utils";
import { buildPdf } from "@/lib/pdf-builder";

export interface SimulationColorResult {
  colorKey: string;
  waveTileUrl?: string;
  standingSeamUrl?: string;
  shingleTileUrl?: string;
}

export interface BuildSimulationPdfInput {
  originalImageUrl: string;
  results: SimulationColorResult[];
  backOriginalImageUrl?: string | null;
  backResults?: SimulationColorResult[];
  clientName?: string;
}

export async function buildSimulationPdf(
  input: BuildSimulationPdfInput
): Promise<Buffer> {
  const {
    originalImageUrl,
    results,
    backOriginalImageUrl,
    backResults,
    clientName,
  } = input;

  const hasBack = !!(
    backOriginalImageUrl &&
    backResults &&
    backResults.length > 0
  );

  if (results.length === 0 && !hasBack) {
    throw new Error("Aucune image à inclure dans le PDF");
  }

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

  return buildPdf({
    originalImageBuffer,
    colorPages,
    backOriginalImageBuffer,
    backColorPages,
    logoBuffer,
    clientName,
  });
}
