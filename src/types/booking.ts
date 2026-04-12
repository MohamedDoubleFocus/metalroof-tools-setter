export interface BookingSettings {
  homeBaseAddress: string;
  homeBaseLat: number;
  homeBaseLng: number;
  defaultAppointmentDuration: number; // minutes
  workingHoursStart: string; // "08:00"
  workingHoursEnd: string; // "18:00"
  maxAcceptableTravelMinutes: number;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  location?: string;
  lat?: number;
  lng?: number;
}

export interface SlotSuggestion {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Lundi 14 avril"
  startTime: string; // ISO
  endTime: string; // ISO
  insertAfterEventId: string | null;
  addedTravelMinutes: number;
  score: number; // lower = better
  travelFromPrevious: number; // minutes
  travelToNext: number; // minutes
  conflict: boolean; // true if addedTravel > maxAcceptable
  dayEventCount: number; // how many MT events that day
}

export interface DirectionsResult {
  durationMinutes: number;
  distanceKm: number;
}

export interface DayStats {
  date: string;
  totalDriveMinutes: number;
  totalDriveKm: number;
  appointmentCount: number;
}

export const DEFAULT_SETTINGS: BookingSettings = {
  homeBaseAddress: "",
  homeBaseLat: 45.5017,
  homeBaseLng: -73.5673,
  defaultAppointmentDuration: 60,
  workingHoursStart: "08:00",
  workingHoursEnd: "18:00",
  maxAcceptableTravelMinutes: 45,
};
