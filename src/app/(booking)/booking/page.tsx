"use client";

import { useState, useEffect } from "react";
import DatePicker from "@/components/booking/DatePicker";
import DayTimeline from "@/components/booking/DayTimeline";
import { CalendarEvent } from "@/types/booking";

export default function DashboardPage() {
  const [date, setDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/booking/calendar?date=${date}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur");
        setEvents(data.events);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [date]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <DatePicker value={date} onChange={setDate} />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      ) : (
        <DayTimeline events={events} />
      )}
    </div>
  );
}
