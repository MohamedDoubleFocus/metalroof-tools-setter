import { NextRequest, NextResponse } from "next/server";
import { deleteAssignment } from "@/lib/prospection/kv";
import { requireSDROrAdmin, respondError } from "@/lib/auth/can";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSDROrAdmin();
  } catch (err) {
    return respondError(err);
  }
  const { id } = await params;
  const ok = await deleteAssignment(id);
  if (!ok) {
    return NextResponse.json(
      { error: "Attribution introuvable" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}
