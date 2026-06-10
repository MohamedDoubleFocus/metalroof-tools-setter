import { NextRequest, NextResponse } from "next/server";
import { getTeam, updateTeam } from "@/lib/teams/kv";
import { CHANTIER_TEAMS, type ChantierTeam } from "@/types/chantiers";
import type { UpdateTeamInput } from "@/types/teams";

export const runtime = "nodejs";

const VALID_KEYS = new Set<ChantierTeam>(CHANTIER_TEAMS);

function isValidKey(key: string): key is ChantierTeam {
  return VALID_KEYS.has(key as ChantierTeam);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  if (!isValidKey(key)) {
    return NextResponse.json({ error: "Équipe inconnue" }, { status: 404 });
  }
  const team = await getTeam(key);
  return NextResponse.json({ team });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  if (!isValidKey(key)) {
    return NextResponse.json({ error: "Équipe inconnue" }, { status: 404 });
  }

  let body: Partial<UpdateTeamInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  // Sanitize employees array — reject malformed entries silently rather than
  // erroring (the admin UI shouldn't be able to send junk, but be safe).
  let employees = body.employees;
  if (employees !== undefined) {
    if (!Array.isArray(employees)) {
      return NextResponse.json(
        { error: "employees doit être un tableau" },
        { status: 400 }
      );
    }
    employees = employees
      .filter(
        (e): e is { id: string; name: string } =>
          !!e && typeof e.id === "string" && typeof e.name === "string"
      )
      .map((e) => ({ id: e.id, name: e.name.trim() }))
      .filter((e) => e.name.length > 0);
  }

  const updated = await updateTeam(key, {
    chiefName: body.chiefName,
    employees,
    notes: body.notes,
  });
  return NextResponse.json({ team: updated });
}
