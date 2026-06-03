/**
 * Date / timezone helpers for the chantiers module.
 *
 * `scheduledDate` is stored as `YYYY-MM-DD` and compared against "today" in
 * America/Toronto (where MTM operates), regardless of the server's UTC clock.
 */

const TZ = "America/Toronto";

/**
 * Returns today's date in America/Toronto, formatted as `YYYY-MM-DD`.
 */
export function todayInToronto(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA returns YYYY-MM-DD natively
  return fmt.format(new Date());
}

/**
 * Returns the number of days between today (America/Toronto) and the given
 * `YYYY-MM-DD` date. Positive when the target is in the future, zero when
 * it's today, negative when in the past. Returns null on invalid input.
 */
export function daysUntil(scheduledDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) return null;
  const today = todayInToronto();
  // Parse as a date at midnight UTC — only the day matters for the diff.
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const targetMs = Date.parse(`${scheduledDate}T00:00:00Z`);
  if (Number.isNaN(todayMs) || Number.isNaN(targetMs)) return null;
  return Math.round((targetMs - todayMs) / (24 * 60 * 60 * 1000));
}
