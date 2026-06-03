/**
 * Vercel Blob storage for the chantiers module — final invoices.
 *
 * Public-read with opaque random URLs. Same store as reports/simulator.
 */

import { put } from "@vercel/blob";

export async function uploadInvoicePdf(
  buffer: Buffer,
  chantierId: string
): Promise<string> {
  const pathname = `chantiers/${chantierId}/invoice-${Date.now()}.pdf`;
  const result = await put(pathname, buffer, {
    access: "public",
    contentType: "application/pdf",
    addRandomSuffix: true,
  });
  return result.url;
}
