"use client";

import { COLORS, COLOR_KEYS } from "@/lib/colors";
import type { Chantier } from "@/types/chantiers";

export interface FiltersState {
  search: string;
  style: "all" | "shingle_tile" | "standing_seam";
  colorKey: "all" | string;
  urgency: "all" | "urgent" | "non_urgent";
}

export const EMPTY_FILTERS: FiltersState = {
  search: "",
  style: "all",
  colorKey: "all",
  urgency: "all",
};

export function applyFilters(
  chantiers: Chantier[],
  filters: FiltersState
): Chantier[] {
  let out = chantiers;
  if (filters.style !== "all") {
    out = out.filter((c) => c.style === filters.style);
  }
  if (filters.colorKey !== "all") {
    out = out.filter((c) => c.colorKey === filters.colorKey);
  }
  if (filters.urgency !== "all") {
    out = out.filter((c) => c.urgency === filters.urgency);
  }
  const q = filters.search.trim().toLowerCase();
  if (q) {
    out = out.filter((c) => {
      const blob = [
        c.clientName,
        c.clientPhone,
        c.clientEmail,
        c.addressLine1,
        c.addressLine2,
        c.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }
  return out;
}

interface Props {
  value: FiltersState;
  onChange: (next: FiltersState) => void;
}

export default function ChantierFilters({ value, onChange }: Props) {
  const hasFilters =
    value.search ||
    value.style !== "all" ||
    value.colorKey !== "all" ||
    value.urgency !== "all";

  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-3 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2 sm:flex-wrap">
      <input
        type="search"
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        placeholder="Rechercher client, adresse..."
        className="w-full sm:flex-1 sm:min-w-[200px] px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
      />

      <div className="grid grid-cols-3 sm:flex sm:items-center sm:gap-2 gap-2">
        <select
          value={value.style}
          onChange={(e) =>
            onChange({
              ...value,
              style: e.target.value as FiltersState["style"],
            })
          }
          className="px-2 sm:px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-white focus:border-accent focus:outline-none min-w-0"
        >
          <option value="all">Styles</option>
          <option value="shingle_tile">Européen</option>
          <option value="standing_seam">Joint debout</option>
        </select>

        <select
          value={value.colorKey}
          onChange={(e) => onChange({ ...value, colorKey: e.target.value })}
          className="px-2 sm:px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-white focus:border-accent focus:outline-none min-w-0"
        >
          <option value="all">Couleurs</option>
          {COLOR_KEYS.map((key) => (
            <option key={key} value={key}>
              {COLORS[key].frenchName}
            </option>
          ))}
        </select>

        <select
          value={value.urgency}
          onChange={(e) =>
            onChange({
              ...value,
              urgency: e.target.value as FiltersState["urgency"],
            })
          }
          className="px-2 sm:px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-white focus:border-accent focus:outline-none min-w-0"
        >
          <option value="all">Urgence</option>
          <option value="urgent">🔥 Urgent</option>
          <option value="non_urgent">Non urgent</option>
        </select>
      </div>

      {hasFilters && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="w-full sm:w-auto text-xs text-gray-500 hover:text-accent underline-offset-2 hover:underline py-1"
        >
          Effacer les filtres
        </button>
      )}
    </div>
  );
}
