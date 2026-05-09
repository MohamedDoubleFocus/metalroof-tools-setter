import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import pLimit from "p-limit";
import { authOptions } from "@/lib/auth";
import {
  getCalendarEvents,
  enrichEventsWithCoords,
  geocodeAddress,
} from "@/lib/booking/calendar";
import { findOptimalSlots } from "@/lib/booking/slot-optimizer";
import {
  BookingSettings,
  DEFAULT_SETTINGS,
  SlotSuggestion,
} from "@/types/booking";
import { todayMontrealYmd, addDays, buildMontrealDate } from "@/lib/booking/timezone";

const DAYS_TO_SCAN = 15;
const PARALLEL_DAY_LIMIT = 5; // run up to 5 days concurrently
const FINAL_TOP_N = 15;
const MAX_SLOTS_PER_DAY_GLOBAL = 3; // diversity cap when assembling final list

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { address, coords: clientCoords, settings } = (await request.json()) as {
    address: string;
    /** Optional: skip geocoding when client comes from Places Autocomplete */
    coords?: { lat: number; lng: number };
    settings?: Partial<BookingSettings>;
  };

  if (!address && !clientCoords) {
    return NextResponse.json(
      { error: "Adresse ou coordonnees requises" },
      { status: 400 }
    );
  }

  try {
    // Resolve coordinates: trust client-provided coords first (came from Places),
    // fall back to geocoding the typed address.
    const coords =
      clientCoords ?? (address ? await geocodeAddress(address) : null);

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

    // Build the list of dates to scan, anchored on Montreal "today"
    const today = todayMontrealYmd();
    const dates: string[] = [];
    for (let i = 0; i < DAYS_TO_SCAN; i++) {
      dates.push(addDays(today, i));
    }

    // Run days concurrently with a soft limit to avoid hitting Google rate limits
    const limit = pLimit(PARALLEL_DAY_LIMIT);
    const perDayResults = await Promise.all(
      dates.map((dateStr) =>
        limit(async () => {
          const dayLabel = buildMontrealDate(dateStr, "12:00").toLocaleDateString(
            "fr-CA",
            {
              timeZone: "America/Toronto",
              weekday: "long",
              day: "numeric",
              month: "long",
            }
          );

          try {
            const events = await getCalendarEvents(
              session.accessToken!,
              dateStr
            );
            const enriched = await enrichEventsWithCoords(events);
            const slots = await findOptimalSlots(
              enriched,
              coords,
              mergedSettings,
              dateStr
            );
            return slots.map((slot) => ({
              ...slot,
              date: dateStr,
              dayLabel,
              dayEventCount: enriched.length,
            }));
          } catch (err) {
            console.error(`Slot scan failed for ${dateStr}:`, err);
            return [] as SlotSuggestion[];
          }
        })
      )
    );

    // Diversity-aware merge: keep up to MAX_SLOTS_PER_DAY_GLOBAL per day
    // in the final FINAL_TOP_N list, sorted by score.
    const allSorted = perDayResults
      .flat()
      .sort((a, b) => a.score - b.score);

    const perDayCount = new Map<string, number>();
    const finalList: SlotSuggestion[] = [];
    for (const slot of allSorted) {
      const c = perDayCount.get(slot.date) ?? 0;
      if (c >= MAX_SLOTS_PER_DAY_GLOBAL) continue;
      finalList.push(slot);
      perDayCount.set(slot.date, c + 1);
      if (finalList.length >= FINAL_TOP_N) break;
    }

    // finalList is already in score order from the diversity merge above.
    // Score-first ordering keeps the "rank" label in the UI meaningful:
    // #1 = least added travel, regardless of date.

    return NextResponse.json({
      suggestions: finalList,
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
