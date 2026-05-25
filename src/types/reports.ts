/**
 * Types for the roofing-report ordering module (closer ↔ freelancer).
 */

export type ReportStatus =
  | "pending" // closer just created it; freelancer hasn't picked it up
  | "in_progress" // freelancer started working on it
  | "ready" // freelancer uploaded the PDF; awaiting closer pickup
  | "delivered"; // closer downloaded / marked as done

export interface ReportOrder {
  id: string; // UUID
  // ─── Closer-only fields (NEVER sent to the freelancer side) ──────────
  closerLabel: string; // internal identifier, e.g. "Désiré Armand Prévost"
  clientPhone?: string; // for closer to follow up later
  createdByLabel?: string; // optional knocker/closer name, future multi-user

  // ─── Shared fields (visible to freelancer too, white-labeled side) ───
  address: string;
  lat?: number;
  lng?: number;
  notes?: string; // special instructions for the freelancer
  referencePhotos: string[]; // Vercel Blob URLs uploaded by the closer

  // ─── Workflow state ──────────────────────────────────────────────────
  status: ReportStatus;
  pdfUrl?: string; // Vercel Blob URL uploaded by the freelancer
  createdAt: number;
  updatedAt: number;
  completedAt?: number; // when status becomes "ready"
}

/** Body accepted by POST /api/reports (closer-side). */
export interface CreateReportOrderInput {
  closerLabel: string;
  clientPhone?: string;
  createdByLabel?: string;
  address: string;
  lat?: number;
  lng?: number;
  notes?: string;
  referencePhotos?: string[];
}

/** Body accepted by PATCH /api/reports/[id]. */
export interface UpdateReportOrderInput {
  status?: ReportStatus;
  pdfUrl?: string;
  notes?: string;
  closerLabel?: string;
  clientPhone?: string;
}

/**
 * A redacted version of ReportOrder that hides closer-private info.
 * This is what gets serialized to the freelancer side.
 */
export interface FreelancerOrderView {
  id: string;
  address: string;
  lat?: number;
  lng?: number;
  notes?: string;
  referencePhotos: string[];
  status: ReportStatus;
  pdfUrl?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

/** Redact a ReportOrder for the freelancer side. */
export function redactForFreelancer(order: ReportOrder): FreelancerOrderView {
  return {
    id: order.id,
    address: order.address,
    lat: order.lat,
    lng: order.lng,
    notes: order.notes,
    referencePhotos: order.referencePhotos,
    status: order.status,
    pdfUrl: order.pdfUrl,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    completedAt: order.completedAt,
  };
}
