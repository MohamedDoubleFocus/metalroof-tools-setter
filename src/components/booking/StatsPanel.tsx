"use client";

import { useState, useEffect } from "react";
import { CalendarEvent } from "@/types/booking";

type Period = "week" | "month";

interface StatsData {
  totalAppointments: number;
  daysWithEvents: number;
  avgPerDay: number;
}

export default function StatsPanel() {
  const [period, setPeriod] = useState<Period>("week");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      const today = new Date();
      const days = period === "week" ? 7 : 30;
      let totalAppointments = 0;
      let daysWithEvents = 0;

      for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];

        try {
          const res = await fetch(`/api/booking/calendar?date=${dateStr}`);
          if (res.ok) {
            const data = await res.json();
            const events: CalendarEvent[] = data.events || [];
            totalAppointments += events.length;
            if (events.length > 0) daysWithEvents++;
          }
        } catch {
          // skip failed days
        }
      }

      setStats({
        totalAppointments,
        daysWithEvents,
        avgPerDay:
          daysWithEvents > 0
            ? Math.round((totalAppointments / daysWithEvents) * 10) / 10
            : 0,
      });
      setLoading(false);
    }

    fetchStats();
  }, [period]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setPeriod("week")}
          className={`px-4 py-2 rounded-lg text-sm ${
            period === "week"
              ? "bg-accent text-white font-semibold"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          7 derniers jours
        </button>
        <button
          onClick={() => setPeriod("month")}
          className={`px-4 py-2 rounded-lg text-sm ${
            period === "month"
              ? "bg-accent text-white font-semibold"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          30 derniers jours
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <p className="text-3xl font-bold text-gray-900">
              {stats.totalAppointments}
            </p>
            <p className="text-sm text-gray-500 mt-1">Rendez-vous total</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <p className="text-3xl font-bold text-gray-900">
              {stats.daysWithEvents}
            </p>
            <p className="text-sm text-gray-500 mt-1">Jours actifs</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <p className="text-3xl font-bold text-gray-900">
              {stats.avgPerDay}
            </p>
            <p className="text-sm text-gray-500 mt-1">Moyenne par jour</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
