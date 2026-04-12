import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCalendarEvents, enrichEventsWithCoords } from "@/lib/booking/calendar";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Date requise" }, { status: 400 });
  }

  try {
    const events = await getCalendarEvents(session.accessToken, date);
    const enriched = await enrichEventsWithCoords(events);
    return NextResponse.json({ events: enriched });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur calendrier" },
      { status: 500 }
    );
  }
}
