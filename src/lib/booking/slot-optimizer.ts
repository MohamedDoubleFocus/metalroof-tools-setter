import { CalendarEvent, BookingSettings, SlotSuggestion } from "@/types/booking";
import { getTravelTime } from "./directions";

interface SequencePoint {
  id: string | null;
  lat: number;
  lng: number;
  endTime: Date; // when this point "frees up"
  startTime: Date; // when the next thing at this point begins
}

export async function findOptimalSlots(
  events: CalendarEvent[],
  newAddress: { lat: number; lng: number },
  settings: BookingSettings,
  date: string // YYYY-MM-DD
): Promise<SlotSuggestion[]> {
  const duration = settings.defaultAppointmentDuration;

  // Build day start/end from working hours
  const dayStart = new Date(`${date}T${settings.workingHoursStart}:00`);
  const dayEnd = new Date(`${date}T${settings.workingHoursEnd}:00`);

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

  // Home base at day start
  sequence.push({
    id: null,
    lat: settings.homeBaseLat,
    lng: settings.homeBaseLng,
    endTime: dayStart,
    startTime: dayStart,
  });

  // Events
  for (const evt of locatedEvents) {
    sequence.push({
      id: evt.id,
      lat: evt.lat!,
      lng: evt.lng!,
      endTime: new Date(evt.end),
      startTime: new Date(evt.start),
    });
  }

  // Home base at day end
  sequence.push({
    id: null,
    lat: settings.homeBaseLat,
    lng: settings.homeBaseLng,
    endTime: dayEnd,
    startTime: dayEnd,
  });

  const suggestions: SlotSuggestion[] = [];

  // Check each gap between consecutive sequence points
  for (let i = 0; i < sequence.length - 1; i++) {
    const prev = sequence[i];
    const next = sequence[i + 1];

    const gapStart = prev.endTime;
    const gapEnd = next.startTime;
    const gapMinutes =
      (gapEnd.getTime() - gapStart.getTime()) / (1000 * 60);

    // Need at least enough time for travel + appointment
    if (gapMinutes < duration) continue;

    // Calculate travel times
    const [travelFromPrev, travelToNext, currentTravel] = await Promise.all([
      getTravelTime(prev.lat, prev.lng, newAddress.lat, newAddress.lng),
      getTravelTime(newAddress.lat, newAddress.lng, next.lat, next.lng),
      getTravelTime(prev.lat, prev.lng, next.lat, next.lng),
    ]);

    const totalNeeded =
      travelFromPrev.durationMinutes + duration + travelToNext.durationMinutes;

    if (totalNeeded > gapMinutes) continue; // doesn't fit

    const addedTravel =
      travelFromPrev.durationMinutes +
      travelToNext.durationMinutes -
      currentTravel.durationMinutes;

    // Proposed start time: after traveling from previous point
    const proposedStart = new Date(
      gapStart.getTime() + travelFromPrev.durationMinutes * 60 * 1000
    );
    const proposedEnd = new Date(
      proposedStart.getTime() + duration * 60 * 1000
    );

    suggestions.push({
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

  // Sort by score (lower = better)
  suggestions.sort((a, b) => a.score - b.score);

  return suggestions.slice(0, 5);
}
