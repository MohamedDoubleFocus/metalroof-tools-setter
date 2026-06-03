/**
 * Vercel Blob storage for simulator PDFs.
 *
 * Public-read with opaque random URLs. Same store as reports — both modules
 * share the BLOB_READ_WRITE_TOKEN provisioned by Vercel Blob.
 */

import { put } from "@vercel/blob";

export async function uploadSimulationPdf(
  buffer: Buffer,
  simId: string
): Promise<string> {
  const pathname = `simulator/${simId}/${Date.now()}-simulation.pdf`;
  const result = await put(pathname, buffer, {
    access: "public",
    contentType: "application/pdf",
    addRandomSuffix: true,
  });
  return result.url;
}
