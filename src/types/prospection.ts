/**
 * Types for the door-to-door prospection module.
 *
 * - Lead    : a prospect logged by a knocker during door-to-door
 * - Sector  : a geographical zone (polygon) where the team is currently working
 * - Street  : a street auto-fetched from OpenStreetMap inside a sector, with done state
 */

export type LeadStatus =
  | "absent"
  | "meeting"
  | "repasser"
  | "suivi"
  | "refus";

export interface Lead {
  id: string;
  knockerId: string; // matches KNOCKERS[].id in lib/prospection/knockers.ts
  knockerName: string; // denormalized for display
  // Client info (optional but encouraged — esp. for Meeting/Suivi statuses)
  clientName?: string;
  clientPhone?: string; // E.164 if normalized, raw otherwise
  // Address
  address: string; // formatted, e.g. "1234 Rue Saint-Denis, Montréal, QC"
  streetName: string; // normalized for street tracking, e.g. "rue saint-denis"
  houseNumber: string; // civic number, e.g. "1234"
  lat: number;
  lng: number;
  status: LeadStatus;
  meetingAt?: number; // timestamp ms — when status=meeting
  followUpAt?: number; // timestamp ms — when status=repasser or suivi
  notes?: string;
  photoUrl?: string;
  sectorId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Sector {
  id: string;
  name: string;
  polygon: LatLng[];
  /** Free-form notes for the sector — context, demographics, follow-up info, etc. */
  notes?: string;
  createdAt: number;
  updatedAt?: number; // populated whenever notes / name / etc. change after creation
  createdBy: string; // knockerId
  createdByName: string;
  streetIds: string[]; // normalized street names within this sector
}

export interface Street {
  id: string; // `${sectorId}::${normalizedName}`
  sectorId: string;
  name: string; // original name, e.g. "Rue Saint-Denis"
  normalizedName: string; // for indexing
  geometry: LatLng[]; // polyline coords from OSM
  doneAt?: number;
  doneBy?: string; // knockerId
  doneByName?: string;
}

/**
 * Assignment of a sector to a knocker on a specific day.
 * Multiple assignments per day are allowed (e.g. 2 knockers on the same sector,
 * or 1 knocker on multiple sectors).
 */
export interface SectorAssignment {
  id: string;
  sectorId: string;
  sectorName: string;     // denormalized for list display
  knockerId: string;
  knockerName: string;    // denormalized
  date: string;           // YYYY-MM-DD
  createdAt: number;
  createdBy: string;      // knockerId who assigned (often same as knockerId)
}

// ─── API request/response shapes ────────────────────────────────────────

export interface CreateLeadInput {
  knockerId: string;
  clientName?: string;
  clientPhone?: string;
  address: string;
  streetName: string;
  houseNumber: string;
  lat: number;
  lng: number;
  status: LeadStatus;
  meetingAt?: number;
  followUpAt?: number;
  notes?: string;
  photoUrl?: string;
  sectorId?: string;
}

export interface UpdateLeadInput {
  clientName?: string;
  clientPhone?: string;
  status?: LeadStatus;
  meetingAt?: number | null;
  followUpAt?: number | null;
  notes?: string;
  photoUrl?: string;
}

export interface CreateSectorInput {
  name: string;
  polygon: LatLng[];
  knockerId: string;
  notes?: string;
}

export interface UpdateSectorInput {
  name?: string;
  notes?: string | null; // null clears the field
}

export interface CreateAssignmentInput {
  sectorId: string;
  knockerId: string;     // qui est attribué au secteur
  date: string;          // YYYY-MM-DD
  createdBy: string;     // knockerId de la personne qui crée l'attribution
}

export interface ReverseGeocodeResult {
  streetName: string;
  houseNumber: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}
