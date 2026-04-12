"use client";

import { CalendarEvent } from "@/types/booking";

interface Props {
  event: CalendarEvent;
  travelToNext?: number; // minutes
  isNext?: boolean;
}

export default function AppointmentCard({
  event,
  travelToNext,
  isNext,
}: Props) {
  const start = new Date(event.start);
  const end = new Date(event.end);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className={`rounded-xl border p-4 ${
        isNext
          ? "border-accent bg-accent/5"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">{event.summary}</p>
          <p className="text-sm text-gray-500">
            {formatTime(start)} - {formatTime(end)}
          </p>
          {event.location && (
            <p className="text-sm text-gray-400 mt-1">{event.location}</p>
          )}
        </div>
        {isNext && (
          <span className="text-xs bg-accent text-white px-2 py-1 rounded-full font-semibold">
            Prochain
          </span>
        )}
      </div>
      {travelToNext !== undefined && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
          <span>{travelToNext} min de trajet vers le prochain</span>
        </div>
      )}
    </div>
  );
}
