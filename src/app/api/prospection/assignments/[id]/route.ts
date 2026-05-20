import { NextRequest, NextResponse } from "next/server";
import { deleteAssignment } from "@/lib/prospection/kv";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
