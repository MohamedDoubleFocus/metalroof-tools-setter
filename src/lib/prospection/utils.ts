/**
 * Pure utilities — safe to import from both client and server code.
 * (Anything in src/lib/prospection/kv.ts pulls in the `redis` package and
 * cannot be bundled for the browser.)
 */

import type { Lead, LeadStatus } from "@/types/prospection";

export function todayDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateKeyOf(timestampMs: number): string {
  const d = new Date(timestampMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function leadStatusCount(leads: Lead[]): Record<LeadStatus, number> {
  const out: Record<LeadStatus, number> = {
    absent: 0,
    meeting: 0,
    repasser: 0,
    suivi: 0,
    refus: 0,
  };
  for (const l of leads) out[l.status]++;
  return out;
}
