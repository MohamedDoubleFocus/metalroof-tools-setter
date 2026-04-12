"use client";

import { useState, useEffect } from "react";
import { CalendarEvent, DirectionsResult } from "@/types/booking";
import AppointmentCard from "./AppointmentCard";

interface Props {
  events: CalendarEvent[];
}

export default function DayTimeline({ events }: Props) {
  const [travelTimes, setTravelTimes] = useState<(number | undefined)[]>([]);
  const [totalDrive, setTotalDrive] = useState(0);
  const now = new Date();

  // Find next appointment
  const nextIdx = events.findIndex((e) => new Date(e.start) > now);

  // Calculate travel times between consecutive events
  useEffect(() => {
    async function calcTravel() {
      const times: (number | undefined)[] = [];
      let total = 0;

      for (let i = 0; i < events.length - 1; i++) {
        const curr = events[i];
        const next = events[i + 1];
        if (curr.lat && curr.lng && next.lat && next.lng) {
          try {
            const res = await fetch("/api/booking/directions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                originLat: curr.lat,
                originLng: curr.lng,
                destLat: next.lat,
                destLng: next.lng,
              }),
            });
            const data: DirectionsResult = await res.json();
            times.push(data.durationMinutes);
            total += data.durationMinutes;
          } catch {
            times.push(undefined);
          }
        } else {
          times.push(undefined);
        }
      }

      setTravelTimes(times);
      setTotalDrive(total);
    }

    if (events.length > 1) {
      calcTravel();
    }
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">Aucun rendez-vous pour cette journee</p>
      </div>
    );
  }

  // Countdown to next
  const nextEvent = nextIdx >= 0 ? events[nextIdx] : null;
  const minutesUntilNext = nextEvent
    ? Math.round(
        (new Date(nextEvent.start).getTime() - now.getTime()) / (1000 * 60)
      )
    : null;

  return (
    <div className="space-y-4">
      {minutesUntilNext !== null && minutesUntilNext > 0 && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600">Prochain rendez-vous dans</p>
          <p className="text-2xl font-bold text-accent">
            {minutesUntilNext < 60
              ? `${minutesUntilNext} min`
              : `${Math.floor(minutesUntilNext / 60)}h ${minutesUntilNext % 60}min`}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {events.map((evt, i) => (
          <AppointmentCard
            key={evt.id}
            event={evt}
            travelToNext={travelTimes[i]}
            isNext={i === nextIdx}
          />
        ))}
      </div>

      {totalDrive > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500">Temps de conduite total estime</p>
          <p className="text-xl font-bold text-gray-900">
            {totalDrive < 60
              ? `${totalDrive} min`
              : `${Math.floor(totalDrive / 60)}h ${totalDrive % 60}min`}
          </p>
        </div>
      )}
    </div>
  );
}
