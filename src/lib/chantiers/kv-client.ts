/**
 * Pure (no Redis / no Node imports) helpers re-usable from client components.
 *
 * Keep this file free of any server-side dependency — anything imported here
 * must be safe in the browser bundle.
 */

import type { Chantier } from "@/types/chantiers";

/**
 * Default queue ordering, per business rules:
 *   1. Chantiers with a `priority` set (pinned by drag) go first, smaller first.
 *   2. Then sort by `scheduledDate` ascending (missing dates go last).
 *   3. Then urgency: "urgent" before "non_urgent".
 *   4. Then `signedAt` ascending as the final fallback.
 */
export function sortQueueOrder(chantiers: Chantier[]): Chantier[] {
  return [...chantiers].sort((a, b) => {
    const aHasPriority = a.priority != null;
    const bHasPriority = b.priority != null;
    if (aHasPriority && !bHasPriority) return -1;
    if (!aHasPriority && bHasPriority) return 1;
    if (aHasPriority && bHasPriority) {
      if (a.priority !== b.priority) return (a.priority ?? 0) - (b.priority ?? 0);
    }

    const aDate = a.scheduledDate ?? "";
    const bDate = b.scheduledDate ?? "";
    if (aDate && !bDate) return -1;
    if (!aDate && bDate) return 1;
    if (aDate !== bDate) return aDate < bDate ? -1 : 1;

    const aUrgent = a.urgency === "urgent" ? 0 : 1;
    const bUrgent = b.urgency === "urgent" ? 0 : 1;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;

    return a.signedAt - b.signedAt;
  });
}
