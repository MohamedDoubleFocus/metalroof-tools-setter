/**
 * Field crew (équipe) metadata. The `key` is a stable identifier that
 * matches the literal type ChantierTeam used on Chantier.team — renaming
 * the chief never breaks chantiers that are already attached to the team.
 */

import type { ChantierTeam } from "./chantiers";

export interface TeamEmployee {
  /** Stable id — generated when added. */
  id: string;
  name: string;
}

export interface Team {
  key: ChantierTeam;
  /** Editable display name (typically the chief / lead). Defaults to the key. */
  chiefName: string;
  employees: TeamEmployee[];
  notes?: string;
  updatedAt: number;
}

export interface UpdateTeamInput {
  chiefName?: string;
  employees?: TeamEmployee[];
  notes?: string | null;
}
