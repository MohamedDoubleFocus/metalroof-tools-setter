import { NextResponse } from "next/server";
import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import { detectContext } from "@/lib/reports/context";

export const runtime = "nodejs";

/**
 * POST /api/reports/upload-photo  (closer-only)
 *
 * Client-upload protocol: the browser uploads reference photos DIRECTLY to
 * Vercel Blob via `upload()` from `@vercel/blob/client`. This endpoint only
 * grants the upload token — large drone shots or hi-res phone photos bypass
 * Vercel's 4.5 MB function body limit entirely.
 *
 * Use:
 *   await upload(file.name, file, {
 *     access: "public",
 *     handleUploadUrl: "/api/reports/upload-photo",
 *     clientPayload: JSON.stringify({ orderId, index }),
 *   })
 *
 * `clientPayload` is optional — when present we use it to organise the Blob
 * pathname per order/index. Otherwise we file the photo under "draft".
 */
export async function POST(request: Request) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json(
      { error: "Body JSON invalide" },
      { status: 400 }
    );
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const ctx = await detectContext();
        if (ctx !== "closer") {
          throw new Error("Non autorisé");
        }
        // clientPayload is optional but we accept { orderId, index }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 25 * 1024 * 1024, // 25 MB
          addRandomSuffix: true,
          tokenPayload: clientPayload ?? null,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // No server-side bookkeeping needed — the closer's form receives the
        // resulting URL from `upload()` directly and POSTs it back with the
        // order creation.
        console.log("[upload-photo] uploaded", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error("[upload-photo]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 400 }
    );
  }
}
