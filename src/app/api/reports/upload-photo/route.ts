import { NextRequest, NextResponse } from "next/server";
import { uploadReferencePhoto } from "@/lib/reports/blob";
import { detectContext } from "@/lib/reports/context";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/reports/upload-photo
 *
 * Closer-only. Takes a single image file, uploads it to Vercel Blob,
 * and returns the public URL. The closer then includes the URL in the
 * order's `referencePhotos` array when calling POST /api/reports.
 *
 * Form data:
 *   file: File (image/*)
 *   orderId?: string  (used in the Blob pathname for organisation)
 *   index?: number    (used in the Blob pathname for organisation)
 */
export async function POST(request: NextRequest) {
  const ctx = await detectContext();
  if (ctx !== "closer") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Form data invalide" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: "Aucun fichier fourni" },
      { status: 400 }
    );
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Le fichier doit être une image" },
      { status: 400 }
    );
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json(
      { error: "L'image ne doit pas dépasser 15 Mo" },
      { status: 400 }
    );
  }

  const orderIdRaw = formData.get("orderId");
  const indexRaw = formData.get("index");
  const orderId =
    typeof orderIdRaw === "string" && orderIdRaw.length > 0
      ? orderIdRaw
      : "draft";
  const index =
    typeof indexRaw === "string" && /^\d+$/.test(indexRaw)
      ? parseInt(indexRaw, 10)
      : 0;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const url = await uploadReferencePhoto(
      Buffer.from(arrayBuffer),
      orderId,
      index,
      file.name
    );
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[reports/upload-photo]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Erreur lors du téléchargement",
      },
      { status: 500 }
    );
  }
}
