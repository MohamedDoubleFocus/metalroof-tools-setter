import { NextRequest, NextResponse } from "next/server";
import {
  createReportOrder,
  listAllReportOrders,
  listReportOrdersByStatus,
} from "@/lib/reports/kv";
import { detectContext } from "@/lib/reports/context";
import { redactForFreelancer } from "@/types/reports";
import type {
  CreateReportOrderInput,
  ReportStatus,
} from "@/types/reports";

export const runtime = "nodejs";

const VALID_STATUSES: ReportStatus[] = [
  "pending",
  "in_progress",
  "ready",
  "delivered",
];

/**
 * GET /api/reports
 *   ?status=pending|in_progress|ready|delivered  (optional filter)
 *
 * Returns ALL orders (closer view) or a redacted list (freelancer view).
 * The middleware has already verified the appropriate cookie before we get
 * here, so we trust the hostname → context detection.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");

  const ctx = await detectContext();

  let orders;
  if (statusParam && VALID_STATUSES.includes(statusParam as ReportStatus)) {
    orders = await listReportOrdersByStatus(statusParam as ReportStatus);
  } else {
    orders = await listAllReportOrders();
  }

  // Newest first
  orders.sort((a, b) => b.createdAt - a.createdAt);

  if (ctx === "freelancer") {
    return NextResponse.json({
      orders: orders.map(redactForFreelancer),
    });
  }

  return NextResponse.json({ orders });
}

/**
 * POST /api/reports
 *
 * Closer-only: creates a new report order. Middleware blocks this on the
 * freelancer domain (portal routes don't include the bare /api/reports
 * POST), and we double-check here for defense in depth.
 */
export async function POST(request: NextRequest) {
  const ctx = await detectContext();
  if (ctx !== "closer") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  let body: Partial<CreateReportOrderInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const address = (body.address || "").trim();
  if (!address) {
    return NextResponse.json({ error: "address requis" }, { status: 400 });
  }
  const closerLabel = (body.closerLabel || "").trim();
  if (!closerLabel) {
    return NextResponse.json(
      { error: "closerLabel requis (identifiant interne du client)" },
      { status: 400 }
    );
  }

  const referencePhotos = Array.isArray(body.referencePhotos)
    ? body.referencePhotos.filter(
        (u): u is string => typeof u === "string" && u.length > 0
      )
    : [];

  try {
    const order = await createReportOrder({
      closerLabel,
      clientPhone: body.clientPhone,
      createdByLabel: body.createdByLabel,
      address,
      lat: typeof body.lat === "number" ? body.lat : undefined,
      lng: typeof body.lng === "number" ? body.lng : undefined,
      notes: body.notes,
      referencePhotos,
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
