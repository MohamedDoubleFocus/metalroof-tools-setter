import { NextResponse } from "next/server";
import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import { after } from "next/server";
import {
  attachReportPdf,
  getReportOrder,
} from "@/lib/reports/kv";
import { fireReportReadyWebhook } from "@/lib/reports/make-webhook";
import { detectContext } from "@/lib/reports/context";

export const runtime = "nodejs";

/**
 * POST /api/reports/upload-pdf  (freelancer-only)
 *
 * Implements Vercel Blob's client-upload protocol:
 *   1. Browser asks this endpoint for a one-time upload token.
 *   2. Browser uploads the PDF DIRECTLY to Blob (bypassing this function
 *      entirely — no Vercel body-size limit, no HTTP 413).
 *   3. Blob calls back into this endpoint via `onUploadCompleted`, at which
 *      point we attach the resulting URL to the order and ping Make.
 *
 * Use @vercel/blob/client's `upload()` on the client side and pass
 *   handleUploadUrl: "/api/reports/upload-pdf"
 *   clientPayload: JSON.stringify({ orderId })
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
        // Defense-in-depth: middleware already gates the route to the freelancer
        // domain, but verify again here.
        const ctx = await detectContext();
        if (ctx !== "freelancer") {
          throw new Error("Non autorisé");
        }

        if (!clientPayload) {
          throw new Error("clientPayload requis (orderId)");
        }
        let parsed: { orderId?: string };
        try {
          parsed = JSON.parse(clientPayload);
        } catch {
          throw new Error("clientPayload invalide");
        }
        const orderId = parsed.orderId?.trim();
        if (!orderId) throw new Error("orderId requis");

        const order = await getReportOrder(orderId);
        if (!order) throw new Error("Commande introuvable");

        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ orderId }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Server-side callback fired by Vercel Blob once the client finished
        // uploading. We use it to atomically attach the PDF + notify Make.
        if (!tokenPayload) return;
        let payload: { orderId?: string };
        try {
          payload = JSON.parse(tokenPayload);
        } catch {
          console.error("[upload-pdf] invalid tokenPayload");
          return;
        }
        const orderId = payload.orderId;
        if (!orderId) return;

        const updated = await attachReportPdf(orderId, blob.url);
        if (!updated) {
          console.error("[upload-pdf] order vanished between token and upload", orderId);
          return;
        }

        // Fire-and-forget Make webhook so the closer is notified
        after(() => fireReportReadyWebhook(updated));
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error("[upload-pdf]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 400 }
    );
  }
}
