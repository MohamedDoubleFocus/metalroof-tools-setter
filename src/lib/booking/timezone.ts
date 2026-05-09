/**
 * All booking time math is anchored to Montreal / Quebec.
 * Vercel runs in UTC, so we cannot rely on `new Date("2025-11-09T08:00:00")`
 * to mean "8am Montreal" — it would mean "8am UTC".
 */

export const MONTREAL_TZ = "America/Toronto";

/**
 * Returns Montreal's UTC offset for the given UTC instant, as a "+HH:MM"/"-HH:MM" string.
 * Handles DST automatically.
 */
function montrealOffsetString(utcInstant: Date): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: MONTREAL_TZ,
    timeZoneName: "longOffset",
  });
  const parts = fmt.formatToParts(utcInstant);
  const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-05:00";
  // tz is "GMT-05:00" or "GMT-04:00"
  const m = tz.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return "-05:00"; // EST fallback
  return `${m[1]}${m[2]}:${m[3]}`;
}

/**
 * Build a UTC Date that represents the given Montreal wall-clock time.
 * Example: buildMontrealDate("2025-11-09", "08:00") returns the Date corresponding
 * to "Nov 9 2025, 08:00 in Montreal" (DST-aware).
 */
export function buildMontrealDate(
  yyyyMmDd: string,
  hhMm: string
): Date {
  // Probe at noon UTC of that day — far from any DST transition (which happens at 2am)
  const probe = new Date(`${yyyyMmDd}T12:00:00Z`);
  const offset = montrealOffsetString(probe);
  return new Date(`${yyyyMmDd}T${hhMm}:00${offset}`);
}

/**
 * Returns today's date in Montreal as "YYYY-MM-DD" (regardless of server TZ).
 */
export function todayMontrealYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MONTREAL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Add `days` to a YYYY-MM-DD date, returning a new YYYY-MM-DD string.
 * Uses UTC math at noon to avoid DST edge cases.
 */
export function addDays(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return date.toISOString().split("T")[0];
}

/**
 * Day-of-week (0=Sun, 1=Mon, ..., 6=Sat) for a YYYY-MM-DD date in Montreal.
 */
export function montrealDayOfWeek(yyyyMmDd: string): number {
  // Probe at noon Montreal; result is the same for any time-of-day except near DST flip
  const probe = buildMontrealDate(yyyyMmDd, "12:00");
  return new Date(probe.toLocaleString("en-US", { timeZone: MONTREAL_TZ })).getDay();
}

/**
 * Hour-of-day (0–23) for the given UTC instant interpreted in Montreal.
 */
export function montrealHourOfDay(utcInstant: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MONTREAL_TZ,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(utcInstant);
  const h = parseInt(parts.find((p) => p.type === "hour")!.value, 10);
  return h === 24 ? 0 : h;
}
