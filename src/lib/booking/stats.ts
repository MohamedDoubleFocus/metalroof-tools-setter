import { CalendarEvent, DayStats } from "@/types/booking";

export function computeDayStats(
  date: string,
  events: CalendarEvent[],
  totalDriveMinutes: number,
  totalDriveKm: number
): DayStats {
  return {
    date,
    totalDriveMinutes,
    totalDriveKm,
    appointmentCount: events.length,
  };
}

export function aggregateStats(stats: DayStats[]) {
  const totalDrive = stats.reduce((s, d) => s + d.totalDriveMinutes, 0);
  const totalKm = stats.reduce((s, d) => s + d.totalDriveKm, 0);
  const totalAppointments = stats.reduce((s, d) => s + d.appointmentCount, 0);
  const daysWithAppointments = stats.filter((d) => d.appointmentCount > 0).length;

  return {
    totalDriveMinutes: totalDrive,
    totalDriveKm: Math.round(totalKm * 10) / 10,
    totalAppointments,
    avgAppointmentsPerDay:
      daysWithAppointments > 0
        ? Math.round((totalAppointments / daysWithAppointments) * 10) / 10
        : 0,
    avgTravelPerDay:
      daysWithAppointments > 0
        ? Math.round(totalDrive / daysWithAppointments)
        : 0,
    daysTracked: stats.length,
  };
}
