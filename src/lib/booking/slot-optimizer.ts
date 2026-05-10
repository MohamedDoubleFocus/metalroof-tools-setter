import { CalendarEvent, BookingSettings, SlotSuggestion } from "@/types/booking";
import { getTravelTime } from "./directions";
import { buildMontrealDate } from "./timezone";

interface SequencePoint {
  id: string | null;
  lat: number;
  lng: number;
  endTime: Date; // when this point "frees up"
  startTime: Date; // when the next thing at this point begins
}

/**
 * Each gap in the calendar produces ONE availability "window":
 *   - windowStart = earliest time the appointment could start
 *   - windowEnd   = latest time it could start (still finishing in time
 *                   for the next event + travel + working-hours bound)
 *
 * The setter then negotiates the exact time inside that window with the
 * prospect over the phone — much more natural than offering 6 individual
 * overlapping slots.
 */

/** Round Date UP to next 15-minute mark — keeps window boundaries clean. */
function ceilTo15Min(d: Date): Date {
  const ms = 15 * 60 * 1000;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}

/** Round Date DOWN to previous 15-minute mark. */
function floorTo15Min(d: Date): Date {
  const ms = 15 * 60 * 1000;
  return new Date(Math.floor(d.getTime() / ms) * ms);
}

export async function findOptimalSlots(
  events: CalendarEvent[],
  newAddress: { lat: number; lng: number },
  settings: BookingSettings,
  date: string // YYYY-MM-DD
): Promise<SlotSuggestion[]> {
  const duration = settings.defaultAppointmentDuration;

  // Working day boundaries in Montreal time
  const dayStart = buildMontrealDate(date, settings.workingHoursStart);
  const dayEnd = buildMontrealDate(date, settings.workingHoursEnd);

  // Past-slot filter: never propose anything starting before "now"
  const now = new Date();

  // Filter events that have coordinates
  const locatedEvents = events.filter(
    (e) => e.lat !== undefined && e.lng !== undefined
  );

  // Sort by start time
  locatedEvents.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  // Build sequence: [home] -> events -> [home]
  const sequence: SequencePoint[] = [];

  sequence.push({
    id: null,
    lat: settings.homeBaseLat,
    lng: settings.homeBaseLng,
    endTime: dayStart,
    startTime: dayStart,
  });

  for (const evt of locatedEvents) {
    sequence.push({
      id: evt.id,
      lat: evt.lat!,
      lng: evt.lng!,
      endTime: new Date(evt.end),
      startTime: new Date(evt.start),
    });
  }

  sequence.push({
    id: null,
    lat: settings.homeBaseLat,
    lng: settings.homeBaseLng,
    endTime: dayEnd,
    startTime: dayEnd,
  });

  const suggestions: SlotSuggestion[] = [];

  // Walk each gap between consecutive sequence points
  for (let i = 0; i < sequence.length - 1; i++) {
    const prev = sequence[i];
    const next = sequence[i + 1];

    // Skip gaps that don't overlap working hours at all
    if (next.startTime.getTime() <= dayStart.getTime()) continue;
    if (prev.endTime.getTime() >= dayEnd.getTime()) continue;

    // Skip gaps fully in the past
    if (next.startTime.getTime() <= now.getTime()) continue;

    // Travel times — bucketed by departure time, so cached after first call
    const [travelFromPrev, travelToNext, currentTravel] = await Promise.all([
      getTravelTime(
        prev.lat,
        prev.lng,
        newAddress.lat,
        newAddress.lng,
        prev.endTime
      ),
      // travelToNext is approximate — assume departure ~middle of gap;
      // hour bucket means a small offset doesn't change cache result
      getTravelTime(
        newAddress.lat,
        newAddress.lng,
        next.lat,
        next.lng,
        prev.endTime
      ),
      getTravelTime(
        prev.lat,
        prev.lng,
        next.lat,
        next.lng,
        prev.endTime
      ),
    ]);

    const addedTravel =
      travelFromPrev.durationMinutes +
      travelToNext.durationMinutes -
      currentTravel.durationMinutes;

    // Earliest possible start-at-client time (after traveling from prev)
    const arrivalAtClient = new Date(
      prev.endTime.getTime() + travelFromPrev.durationMinutes * 60 * 1000
    );

    // Lower bound for proposed start: max(arrivalAtClient, dayStart, now)
    const earliestRaw = new Date(
      Math.max(
        arrivalAtClient.getTime(),
        dayStart.getTime(),
        now.getTime()
      )
    );

    // Upper bound for proposed start:
    //   proposedEnd ≤ dayEnd                       → start ≤ dayEnd - duration
    //   proposedEnd + travelToNext ≤ next.startTime → start ≤ next.startTime - travelToNext - duration
    const latestByDayEnd = new Date(
      dayEnd.getTime() - duration * 60 * 1000
    );
    const latestByNextStart = new Date(
      next.startTime.getTime() -
        (duration + travelToNext.durationMinutes) * 60 * 1000
    );
    const latest = new Date(
      Math.min(latestByDayEnd.getTime(), latestByNextStart.getTime())
    );

    // Round window boundaries to 15-min marks (cleanly displayable times).
    // windowStart goes UP to next 15-min, windowEnd goes DOWN to previous
    // 15-min — both staying within the feasible interval.
    const windowStart = ceilTo15Min(earliestRaw);
    const windowEnd = floorTo15Min(latest);

    if (windowStart.getTime() > windowEnd.getTime()) continue; // no fit

    suggestions.push({
      date,
      dayLabel: "",
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      durationMinutes: duration,
      insertAfterEventId: prev.id,
      addedTravelMinutes: Math.round(addedTravel),
      score: Math.round(addedTravel),
      travelFromPrevious: travelFromPrev.durationMinutes,
      travelToNext: travelToNext.durationMinutes,
      previousIsHome: prev.id === null,
      nextIsHome: next.id === null,
      conflict: addedTravel > settings.maxAcceptableTravelMinutes,
      dayEventCount: events.length,
    });
  }

  // Sort windows by addedTravel first, then by chronological order
  suggestions.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return (
      new Date(a.windowStart).getTime() - new Date(b.windowStart).getTime()
    );
  });

  return suggestions;
}
