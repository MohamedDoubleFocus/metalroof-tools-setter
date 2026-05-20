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
  createdAt: number;
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

// ─── API request/response shapes ────────────────────────────────────────

export interface CreateLeadInput {
  knockerId: string;
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
}

export interface ReverseGeocodeResult {
  streetName: string;
  houseNumber: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}
