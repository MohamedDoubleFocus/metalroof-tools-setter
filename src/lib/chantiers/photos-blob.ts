/**
 * Vercel Blob storage for chantier photos uploaded by foremen.
 *
 * Same store as reports + invoices. Public-read with random hash suffix
 * (non-enumerable URLs). Migration to Supabase Storage is planned later.
 */

import { put } from "@vercel/blob";

export async function uploadChantierPhoto(
  buffer: Buffer,
  chantierId: string,
  originalFilename?: string
): Promise<string> {
  const ext =
    originalFilename?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "jpg";
  const pathname = `chantiers/${chantierId}/photo-${Date.now()}.${ext}`;
  const result = await put(pathname, buffer, {
    access: "public",
    addRandomSuffix: true,
  });
  return result.url;
}
