import { NextRequest, NextResponse } from "next/server";
import { getLead, updateLead, deleteLead } from "@/lib/prospection/kv";
import { requireSDROrAdmin, respondError } from "@/lib/auth/can";
import type { UpdateLeadInput, LeadStatus } from "@/types/prospection";

export const runtime = "nodejs";

async function gate() {
  try {
    await requireSDROrAdmin();
    return null;
  } catch (err) {
    return respondError(err);
  }
}

const VALID_STATUSES: LeadStatus[] = [
  "absent",
  "meeting",
  "repasser",
  "suivi",
  "refus",
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await gate();
  if (guard) return guard;
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) {
    return NextResponse.json({ error: "Lead introuvable" }, { status: 404 });
  }
  return NextResponse.json({ lead });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await gate();
  if (guard) return guard;
  const { id } = await params;

  let body: Partial<UpdateLeadInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (body.status && !VALID_STATUSES.includes(body.status as LeadStatus)) {
    return NextResponse.json({ error: "status invalide" }, { status: 400 });
  }

  const updated = await updateLead(id, body as UpdateLeadInput);
  if (!updated) {
    return NextResponse.json({ error: "Lead introuvable" }, { status: 404 });
  }
  return NextResponse.json({ lead: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await gate();
  if (guard) return guard;
  const { id } = await params;
  const ok = await deleteLead(id);
  if (!ok) {
    return NextResponse.json({ error: "Lead introuvable" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
