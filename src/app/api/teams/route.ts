import { NextResponse } from "next/server";
import { listTeams } from "@/lib/teams/kv";

export const runtime = "nodejs";

export async function GET() {
  try {
    const teams = await listTeams();
    return NextResponse.json({ teams });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
