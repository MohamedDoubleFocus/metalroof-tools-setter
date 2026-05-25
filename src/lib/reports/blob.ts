/**
 * Vercel Blob storage for the reports module.
 *
 * Files are public-read with opaque random URLs (non-enumerable) — fine for
 * an internal tool where both sides (closer + freelancer) are trusted.
 *
 * Requires the env var BLOB_READ_WRITE_TOKEN, auto-provisioned when the
 * Vercel Blob store is added in the project dashboard.
 */

import { put } from "@vercel/blob";

/**
 * Upload a PDF produced by the freelancer.
 * Returns the public URL.
 */
export async function uploadReportPdf(
  buffer: Buffer,
  orderId: string,
  originalFilename?: string
): Promise<string> {
  // Sanitize the filename — keep the order id at the start so it's clear in
  // the Blob dashboard which order each file belongs to.
  const safeName = (originalFilename || "rapport.pdf")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
  const pathname = `reports/${orderId}/${Date.now()}-${safeName}`;

  const result = await put(pathname, buffer, {
    access: "public",
    contentType: "application/pdf",
    // Random suffix protects against accidental URL guessing across orders.
    addRandomSuffix: true,
  });
  return result.url;
}

/**
 * Upload a reference photo provided by the closer alongside the order.
 * Accepts a typed Buffer; the caller is responsible for validating it's an image.
 */
export async function uploadReferencePhoto(
  buffer: Buffer,
  orderId: string,
  index: number,
  originalFilename?: string
): Promise<string> {
  const ext =
    originalFilename?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "jpg";
  const pathname = `reports/${orderId}/ref-${index}-${Date.now()}.${ext}`;

  const result = await put(pathname, buffer, {
    access: "public",
    addRandomSuffix: true,
  });
  return result.url;
}
