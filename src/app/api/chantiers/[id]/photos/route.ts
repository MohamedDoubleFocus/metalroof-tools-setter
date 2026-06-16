import { NextRequest, NextResponse } from "next/server";
import { requireForemanOrAdmin, respondError } from "@/lib/auth/can";
import { supabase as admin } from "@/lib/supabase";
import { uploadChantierPhoto } from "@/lib/chantiers/photos-blob";

export const runtime = "nodejs";
export const maxDuration = 60;

interface PhotoRow {
  id: string;
  chantier_id: string;
  url: string;
  caption: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

/**
 * GET /api/chantiers/[id]/photos
 * Returns photos sorted newest first. Admin or Foreman.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireForemanOrAdmin();
    const { id } = await params;
    const { data, error } = await admin
      .from("chantier_photos")
      .select("*")
      .eq("chantier_id", id)
      .order("uploaded_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ photos: data as PhotoRow[] });
  } catch (err) {
    return respondError(err);
  }
}

/**
 * POST /api/chantiers/[id]/photos
 * Multipart form upload: { file, caption? }. Admin or Foreman.
 * Uploads to Vercel Blob, inserts a row in chantier_photos.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireForemanOrAdmin();
    const { id } = await params;

    const form = await request.formData();
    const file = form.get("file");
    const caption = (form.get("caption") as string | null)?.trim() || null;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Champ 'file' requis" },
        { status: 400 }
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Fichier vide" }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Fichier trop gros (max 15 MB)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadChantierPhoto(buffer, id, file.name);

    const { data, error } = await admin
      .from("chantier_photos")
      .insert({
        chantier_id: id,
        url,
        caption,
        uploaded_by: me.id,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ photo: data });
  } catch (err) {
    return respondError(err);
  }
}
