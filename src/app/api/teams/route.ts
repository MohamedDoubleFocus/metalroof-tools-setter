import { NextResponse } from "next/server";
import { listTeams } from "@/lib/teams/kv";
import { requireAuth, respondError } from "@/lib/auth/can";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAuth();
    const teams = await listTeams();
    return NextResponse.json({ teams });
  } catch (err) {
    return respondError(err);
  }
}
