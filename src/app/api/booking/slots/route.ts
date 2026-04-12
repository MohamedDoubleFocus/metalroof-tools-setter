import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCalendarEvents, enrichEventsWithCoords, geocodeAddress } from "@/lib/booking/calendar";
import { findOptimalSlots } from "@/lib/booking/slot-optimizer";
import { BookingSettings, DEFAULT_SETTINGS, SlotSuggestion } from "@/types/booking";

const DAYS_TO_SCAN = 15;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { address, settings } = (await request.json()) as {
    address: string;
    settings?: Partial<BookingSettings>;
  };

  if (!address) {
    return NextResponse.json(
      { error: "Adresse requise" },
      { status: 400 }
    );
  }

  try {
    // Geocode the new address
    const coords = await geocodeAddress(address);
    if (!coords) {
      return NextResponse.json(
        { error: "Impossible de localiser cette adresse" },
        { status: 400 }
      );
    }

    const mergedSettings: BookingSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
    };

    // Scan the next 15 days
    const allSuggestions: SlotSuggestion[] = [];

    for (let i = 0; i < DAYS_TO_SCAN; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];

      const dayLabel = d.toLocaleDateString("fr-CA", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });

      try {
        const events = await getCalendarEvents(session.accessToken, dateStr);
        const enriched = await enrichEventsWithCoords(events);

        const slots = await findOptimalSlots(
          enriched,
          coords,
          mergedSettings,
          dateStr
        );

        // Add date info to each slot
        for (const slot of slots) {
          allSuggestions.push({
            ...slot,
            date: dateStr,
            dayLabel,
            dayEventCount: enriched.length,
          });
        }
      } catch (err) {
        // Skip days that fail, continue with others
        console.error(`Slot scan failed for ${dateStr}:`, err);
      }
    }

    // Sort all suggestions by score (lower = better)
    allSuggestions.sort((a, b) => a.score - b.score);

    return NextResponse.json({
      suggestions: allSuggestions.slice(0, 10),
      newAddressCoords: coords,
      daysScanned: DAYS_TO_SCAN,
    });
  } catch (error) {
    console.error("Slot optimization error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'optimisation",
      },
      { status: 500 }
    );
  }
}
