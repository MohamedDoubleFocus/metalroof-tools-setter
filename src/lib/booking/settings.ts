import { BookingSettings, DEFAULT_SETTINGS } from "@/types/booking";

const STORAGE_KEY = "booking-settings";

export function getSettings(): BookingSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: BookingSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
