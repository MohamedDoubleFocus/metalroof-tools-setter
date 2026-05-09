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

/** Step (in minutes) used to scan candidate start-times within a gap */
const SLOT_STEP_MINUTES = 30;

/** Maximum number of slots returned per day (diversity across times of day) */
const MAX_SLOTS_PER_DAY = 5;

/**
 * Round a Date UP to the next multiple of `stepMinutes` (in Montreal local time).
 * Used so candidate start times land on neat clock positions (8:00, 8:30, 9:00…).
 */
function ceilToStep(d: Date, stepMinutes: number): Date {
  const ms = stepMinutes * 60 * 1000;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
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
    // Round UP to next clean slot step (8:30, 9:00, 9:30…)
    const earliest = ceilToStep(earliestRaw, SLOT_STEP_MINUTES);

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

    if (earliest.getTime() > latest.getTime()) continue; // no fit

    // Generate candidate slots at SLOT_STEP_MINUTES intervals
    const gapSlots: SlotSuggestion[] = [];
    for (
      let t = earliest.getTime();
      t <= latest.getTime();
      t += SLOT_STEP_MINUTES * 60 * 1000
    ) {
      const proposedStart = new Date(t);
      const proposedEnd = new Date(t + duration * 60 * 1000);

      gapSlots.push({
        date,
        dayLabel: "",
        startTime: proposedStart.toISOString(),
        endTime: proposedEnd.toISOString(),
        insertAfterEventId: prev.id,
        addedTravelMinutes: Math.round(addedTravel),
        score: Math.round(addedTravel),
        travelFromPrevious: travelFromPrev.durationMinutes,
        travelToNext: travelToNext.durationMinutes,
        conflict: addedTravel > settings.maxAcceptableTravelMinutes,
        dayEventCount: events.length,
      });
    }

    suggestions.push(...gapSlots);
  }

  // All slots in this day share the same `addedTravel` cost per gap, so
  // sort by addedTravel first, then by start time for stable diversity
  suggestions.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return (
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  });

  return suggestions.slice(0, MAX_SLOTS_PER_DAY);
}
