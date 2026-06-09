/**
 * Types for the jobsite-tracking module (suivi de chantiers).
 *
 * A Chantier becomes the post-sale source of truth: once a contract is
 * signed, a chantier is created. It tracks the install workflow (scheduled
 * → in_progress → done), and is the launchpad for sending the warranty +
 * the final invoice to the client.
 */

import type { RoofStyle } from "@/types";

export type ChantierStatus = "scheduled" | "in_progress" | "done";

/** Only the two roof styles actually offered to clients today. */
export type ChantierStyle = Extract<RoofStyle, "shingle_tile" | "standing_seam">;

export type ChantierUrgency = "urgent" | "non_urgent";

export interface Chantier {
  id: string;

  // ─── Client info (pre-fills warranty + invoice + SMS) ─────────────
  clientName: string;
  clientPhone: string; // E.164
  clientEmail?: string;
  addressLine1: string;
  addressLine2?: string;

  // ─── Geocoded location (auto-populated at create/update) ──────────
  lat?: number;
  lng?: number;

  // ─── Project details ─────────────────────────────────────────────
  submissionUrl?: string;
  roofrUrl?: string; // link to the Roofr report
  style?: ChantierStyle;
  colorKey?: string; // matches a key in src/lib/colors.ts COLORS
  urgency: ChantierUrgency;

  // ─── Workflow ────────────────────────────────────────────────────
  status: ChantierStatus;
  signedAt: number;
  scheduledDate?: string; // YYYY-MM-DD
  priority?: number; // when set, pins above non-pinned chantiers

  // ─── Money ───────────────────────────────────────────────────────
  totalAmount?: number;

  // ─── Misc ────────────────────────────────────────────────────────
  notes?: string;

  // ─── Audit ───────────────────────────────────────────────────────
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;

  // ─── SMS tracking ────────────────────────────────────────────────
  smsJ7SentAt?: number;
  smsJ2SentAt?: number;

  // ─── Documents sent ──────────────────────────────────────────────
  warrantySentAt?: number;
  invoiceSentAt?: number;
  invoicePdfUrl?: string;
}

export interface CreateChantierInput {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  addressLine1: string;
  addressLine2?: string;
  submissionUrl?: string;
  roofrUrl?: string;
  style?: ChantierStyle;
  colorKey?: string;
  urgency?: ChantierUrgency;
  signedAt?: number;
  scheduledDate?: string;
  priority?: number;
  totalAmount?: number;
  notes?: string;
}

export interface UpdateChantierInput {
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  submissionUrl?: string | null;
  roofrUrl?: string | null;
  style?: ChantierStyle | null;
  colorKey?: string | null;
  urgency?: ChantierUrgency;
  status?: ChantierStatus;
  signedAt?: number;
  scheduledDate?: string | null;
  priority?: number | null;
  totalAmount?: number | null;
  notes?: string | null;
}
