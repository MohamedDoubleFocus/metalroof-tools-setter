import { NextResponse } from "next/server";
import { listSimulationHistory } from "@/lib/simulator/history";

export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await listSimulationHistory();
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
