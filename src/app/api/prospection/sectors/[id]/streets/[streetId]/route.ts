import { NextRequest, NextResponse } from "next/server";
import { toggleStreetDone } from "@/lib/prospection/kv";
import { getKnockerById } from "@/lib/prospection/knockers";

export const runtime = "nodejs";

/**
 * PATCH /api/prospection/sectors/[id]/streets/[streetId]
 *
 * Body: { knockerId: string, done: boolean }
 *
 * Toggle the "done" flag on a street.
 *
 * (The [id] sector segment is unused server-side — the streetId is already
 * scoped by sector; the URL nesting is for clarity in the client.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; streetId: string }> }
) {
  const { streetId } = await params;

  let body: { knockerId?: string; done?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (!body.knockerId || !getKnockerById(body.knockerId)) {
    return NextResponse.json(
      { error: "knockerId requis et valide" },
      { status: 400 }
    );
  }

  if (typeof body.done !== "boolean") {
    return NextResponse.json(
      { error: "done doit etre un boolean" },
      { status: 400 }
    );
  }

  // streetId comes URL-encoded; Next decodes path params automatically.
  const updated = await toggleStreetDone(streetId, body.knockerId, body.done);
  if (!updated) {
    return NextResponse.json({ error: "Rue introuvable" }, { status: 404 });
  }
  return NextResponse.json({ street: updated });
}
