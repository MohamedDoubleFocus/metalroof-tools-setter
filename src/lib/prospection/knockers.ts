/**
 * Roster of door knockers.
 *
 * To add/remove someone, edit this file and re-deploy. They will then appear
 * in the identification dropdown on first visit to /prospection.
 *
 * The `id` is used as the storage key (in Redis & localStorage); the `name`
 * is shown in the UI. Don't change the `id` of an existing knocker — their
 * historical leads are keyed on it.
 */

export interface Knocker {
  id: string;
  name: string;
}

export const KNOCKERS: Knocker[] = [
  { id: "mohamed", name: "Mohamed" },
  { id: "knocker2", name: "Akram" },
  { id: "knocker3", name: "Billal" },
  { id: "knocker4", name: "Abderrahmane" }

];

export function getKnockerById(id: string): Knocker | undefined {
  return KNOCKERS.find((k) => k.id === id);
}

export function getKnockerName(id: string): string {
  return getKnockerById(id)?.name ?? id;
}
