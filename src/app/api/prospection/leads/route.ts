import { NextRequest, NextResponse } from "next/server";
import {
  createLead,
  listLeadsByDate,
  listAllLeads,
  todayDateKey,
} from "@/lib/prospection/kv";
import { getKnockerById } from "@/lib/prospection/knockers";
import type { CreateLeadInput, LeadStatus } from "@/types/prospection";

export const runtime = "nodejs";

const VALID_STATUSES: LeadStatus[] = [
  "absent",
  "meeting",
  "repasser",
  "suivi",
  "refus",
];

/**
 * GET /api/prospection/leads
 *   ?date=YYYY-MM-DD   (default: today)
 *   ?range=all         (return ALL leads ever, ignores date)
 *   ?knockerId=X       (filter by knocker — if absent, all knockers)
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const range = url.searchParams.get("range");
  const date = url.searchParams.get("date") || todayDateKey();
  const knockerId = url.searchParams.get("knockerId") || undefined;

  try {
    let leads =
      range === "all" ? await listAllLeads() : await listLeadsByDate(date);

    if (knockerId) {
      leads = leads.filter((l) => l.knockerId === knockerId);
    }

    // Sort: newest first
    leads.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ leads });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prospection/leads
 *
 * Body (JSON):
 *   {
 *     knockerId: string,
 *     address: string,
 *     streetName: string,
 *     houseNumber: string,
 *     lat: number,
 *     lng: number,
 *     status: LeadStatus,
 *     meetingAt?: number,
 *     followUpAt?: number,
 *     notes?: string,
 *     photoUrl?: string,
 *     sectorId?: string
 *   }
 */
export async function POST(request: NextRequest) {
  let body: Partial<CreateLeadInput>;
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

  if (!body.address || typeof body.address !== "string") {
    return NextResponse.json({ error: "address requis" }, { status: 400 });
  }

  if (typeof body.lat !== "number" || typeof body.lng !== "number") {
    return NextResponse.json(
      { error: "lat et lng requis (numbers)" },
      { status: 400 }
    );
  }

  if (!body.status || !VALID_STATUSES.includes(body.status as LeadStatus)) {
    return NextResponse.json(
      { error: "status invalide" },
      { status: 400 }
    );
  }

  try {
    const lead = await createLead({
      knockerId: body.knockerId,
      clientName: body.clientName,
      clientPhone: body.clientPhone,
      address: body.address,
      streetName: body.streetName || body.address,
      houseNumber: body.houseNumber || "",
      lat: body.lat,
      lng: body.lng,
      status: body.status as LeadStatus,
      meetingAt: body.meetingAt,
      followUpAt: body.followUpAt,
      notes: body.notes,
      photoUrl: body.photoUrl,
      sectorId: body.sectorId,
    });
    return NextResponse.json({ lead }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur creation lead" },
      { status: 500 }
    );
  }
}
