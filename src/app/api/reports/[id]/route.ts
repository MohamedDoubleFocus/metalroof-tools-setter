import { NextRequest, NextResponse } from "next/server";
import {
  getReportOrder,
  updateReportOrder,
  deleteReportOrder,
} from "@/lib/reports/kv";
import { detectContext } from "@/lib/reports/context";
import { redactForFreelancer } from "@/types/reports";
import type {
  UpdateReportOrderInput,
  ReportStatus,
} from "@/types/reports";

export const runtime = "nodejs";

const VALID_STATUSES: ReportStatus[] = [
  "pending",
  "in_progress",
  "ready",
  "delivered",
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await getReportOrder(id);
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  const ctx = await detectContext();
  if (ctx === "freelancer") {
    return NextResponse.json({ order: redactForFreelancer(order) });
  }
  return NextResponse.json({ order });
}

/**
 * PATCH — both sides can update, but with different allowed fields:
 *   - Closer: any field (status manual override, edit notes, etc.)
 *   - Freelancer: only status (limited to in_progress; PDF upload goes
 *                 through the dedicated /upload-pdf endpoint)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await detectContext();

  let body: Partial<UpdateReportOrderInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (body.status && !VALID_STATUSES.includes(body.status as ReportStatus)) {
    return NextResponse.json({ error: "status invalide" }, { status: 400 });
  }

  let patch: UpdateReportOrderInput;
  if (ctx === "freelancer") {
    // Freelancer can only flip status to in_progress
    if (body.status !== "in_progress") {
      return NextResponse.json(
        { error: "Seul le statut 'in_progress' peut être mis depuis le portail" },
        { status: 403 }
      );
    }
    patch = { status: "in_progress" };
  } else {
    patch = body as UpdateReportOrderInput;
  }

  const updated = await updateReportOrder(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  if (ctx === "freelancer") {
    return NextResponse.json({ order: redactForFreelancer(updated) });
  }
  return NextResponse.json({ order: updated });
}

/**
 * DELETE — closer only. Used for accidental orders / cancellations.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await detectContext();
  if (ctx !== "closer") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const ok = await deleteReportOrder(id);
  if (!ok) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
