"use client";

import { useState, useEffect } from "react";
import DatePicker from "@/components/booking/DatePicker";
import DayMap from "@/components/booking/DayMap";
import { CalendarEvent } from "@/types/booking";

export default function MapPage() {
  const [date, setDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const res = await fetch(`/api/booking/calendar?date=${date}`);
        const data = await res.json();
        if (res.ok) setEvents(data.events);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [date]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Carte du jour</h1>
        <DatePicker value={date} onChange={setDate} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      ) : (
        <DayMap events={events} />
      )}
    </div>
  );
}
