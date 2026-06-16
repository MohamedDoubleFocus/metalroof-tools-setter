import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import {
  getReportOrder,
  updateReportOrder,
  deleteReportOrder,
} from "@/lib/reports/kv";
import { detectContext } from "@/lib/reports/context";
import { fireReportUnavailableWebhook } from "@/lib/reports/make-webhook";
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
  "unavailable",
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
    // Freelancer can flip status to in_progress, or mark as unavailable.
    // PDF upload still goes through the dedicated /upload-pdf endpoint.
    if (body.status === "in_progress") {
      patch = { status: "in_progress" };
    } else if (body.status === "unavailable") {
      const reason = (body.unavailableReason ?? "").trim();
      if (!reason) {
        return NextResponse.json(
          { error: "A reason is required to mark the order as unavailable" },
          { status: 400 }
        );
      }
      patch = { status: "unavailable", unavailableReason: reason };
    } else {
      return NextResponse.json(
        {
          error:
            "Only 'in_progress' or 'unavailable' statuses can be set from the portal",
        },
        { status: 403 }
      );
    }
  } else {
    patch = body as UpdateReportOrderInput;
  }

  let updated;
  try {
    updated = await updateReportOrder(id, patch);
  } catch (err) {
    console.error("[reports PATCH] updateReportOrder failed:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Update failed",
      },
      { status: 500 }
    );
  }
  if (!updated) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  // Notify the closer team in the background when freelancer marks it as
  // unavailable — they need to know they have to handle the order another way.
  if (
    ctx === "freelancer" &&
    patch.status === "unavailable" &&
    updated.status === "unavailable"
  ) {
    after(() => fireReportUnavailableWebhook(updated));
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
