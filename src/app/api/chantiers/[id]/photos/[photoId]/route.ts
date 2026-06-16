import { NextRequest, NextResponse } from "next/server";
import { requireForemanOrAdmin, respondError } from "@/lib/auth/can";
import { supabase as admin } from "@/lib/supabase";
import { del as deleteBlob } from "@vercel/blob";

export const runtime = "nodejs";

/**
 * DELETE /api/chantiers/[id]/photos/[photoId]
 *
 * Admin: can delete any photo.
 * Foreman: can delete only their OWN photos (uploaded_by === user.id).
 *
 * Best-effort Vercel Blob deletion: if the blob delete fails, the row is
 * still removed (we don't want orphan rows pointing at gone blobs).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const me = await requireForemanOrAdmin();
    const { id, photoId } = await params;

    // Look up the photo first to check ownership + get the URL to delete
    const { data: photo, error: fetchErr } = await admin
      .from("chantier_photos")
      .select("*")
      .eq("id", photoId)
      .eq("chantier_id", id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!photo) {
      return NextResponse.json(
        { error: "Photo introuvable" },
        { status: 404 }
      );
    }

    // Foreman can only delete their own
    if (me.role === "foreman" && photo.uploaded_by !== me.id) {
      return NextResponse.json(
        { error: "Tu ne peux supprimer que tes propres photos" },
        { status: 403 }
      );
    }

    // Best-effort delete the blob first
    try {
      await deleteBlob(photo.url);
    } catch (err) {
      console.warn("[photos delete] blob delete failed:", err);
    }

    const { error: delErr } = await admin
      .from("chantier_photos")
      .delete()
      .eq("id", photoId);
    if (delErr) throw new Error(delErr.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    return respondError(err);
  }
}
