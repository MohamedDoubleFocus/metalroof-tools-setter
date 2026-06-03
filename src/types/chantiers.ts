/**
 * Types for the jobsite-tracking module (suivi de chantiers).
 *
 * A Chantier becomes the post-sale source of truth: once a contract is
 * signed, a chantier is created. It tracks the install workflow (scheduled
 * → in_progress → done), and is the launchpad for sending the warranty +
 * the final invoice to the client.
 */

export type ChantierStatus = "scheduled" | "in_progress" | "done";

export interface Chantier {
  id: string;

  // ─── Client info (pre-fills warranty + invoice + SMS) ─────────────
  clientName: string;
  clientPhone: string; // E.164
  clientEmail?: string; // optional — required only to send invoice / warranty by email
  addressLine1: string; // street + number (or full single-line address)
  addressLine2?: string; // city + QC + postal code (optional)

  // ─── Workflow ────────────────────────────────────────────────────
  status: ChantierStatus;
  signedAt: number; // contract signature — default queue order
  scheduledDate?: string; // YYYY-MM-DD, set later, triggers SMS J-7/J-2
  priority?: number; // override (smaller = higher). null = sort by signedAt

  // ─── Money ───────────────────────────────────────────────────────
  totalAmount?: number;

  // ─── Misc ────────────────────────────────────────────────────────
  notes?: string;

  // ─── Audit ───────────────────────────────────────────────────────
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;

  // ─── SMS tracking (idempotency for the cron) ─────────────────────
  smsJ7SentAt?: number;
  smsJ2SentAt?: number;

  // ─── Documents sent ──────────────────────────────────────────────
  warrantySentAt?: number;
  invoiceSentAt?: number;
  invoicePdfUrl?: string; // Vercel Blob archive
}

export interface CreateChantierInput {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  addressLine1: string;
  addressLine2?: string;
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
  status?: ChantierStatus;
  signedAt?: number;
  scheduledDate?: string | null;
  priority?: number | null;
  totalAmount?: number | null;
  notes?: string | null;
}
