import { CalendarEvent } from "@/types/booking";
import { buildMontrealDate, addDays } from "./timezone";
import { getCachedGeocode, setCachedGeocode } from "./cache";

export async function getCalendarEvents(
  accessToken: string,
  date: string // YYYY-MM-DD (interpreted in Montreal TZ)
): Promise<CalendarEvent[]> {
  // Window covers the entire Montreal calendar day (handles DST automatically)
  const timeMin = buildMontrealDate(date, "00:00").toISOString();
  const timeMax = buildMontrealDate(addDays(date, 1), "00:00").toISOString();

  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  );
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "50");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Calendar API error: ${res.status} ${err}`);
  }

  const data = await res.json();

  const events: CalendarEvent[] = (data.items || [])
    .filter(
      (item: { status?: string; start?: { dateTime?: string }; summary?: string }) =>
        item.status !== "cancelled" &&
        item.start?.dateTime &&
        (item.summary || "").startsWith("MT")
    )
    .map(
      (item: {
        id: string;
        summary?: string;
        start: { dateTime: string };
        end: { dateTime: string };
        location?: string;
      }) => ({
        id: item.id,
        summary: item.summary || "Sans titre",
        start: item.start.dateTime,
        end: item.end.dateTime,
        location: item.location || undefined,
      })
    );

  return events;
}

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  // L2 cache lookup (persists across requests)
  const cached = await getCachedGeocode(address);
  if (cached) return cached;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=ca&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status === "OK" && data.results?.[0]) {
    const loc = data.results[0].geometry.location;
    const coords = { lat: loc.lat, lng: loc.lng };
    setCachedGeocode(address, coords).catch(() => {});
    return coords;
  }
  return null;
}

export async function enrichEventsWithCoords(
  events: CalendarEvent[]
): Promise<CalendarEvent[]> {
  const enriched = await Promise.all(
    events.map(async (evt) => {
      if (!evt.location) return evt;
      const coords = await geocodeAddress(evt.location);
      if (coords) {
        return { ...evt, lat: coords.lat, lng: coords.lng };
      }
      return evt;
    })
  );
  return enriched;
}
