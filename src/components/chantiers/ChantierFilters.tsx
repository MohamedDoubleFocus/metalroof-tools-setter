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
  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <input
        type="search"
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        placeholder="Rechercher client, adresse..."
        className="flex-1 min-w-[200px] px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-accent focus:outline-none"
      />

      <select
        value={value.style}
        onChange={(e) =>
          onChange({
            ...value,
            style: e.target.value as FiltersState["style"],
          })
        }
        className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm bg-white focus:border-accent focus:outline-none"
      >
        <option value="all">Tous styles</option>
        <option value="shingle_tile">Style européen</option>
        <option value="standing_seam">Joint debout</option>
      </select>

      <select
        value={value.colorKey}
        onChange={(e) => onChange({ ...value, colorKey: e.target.value })}
        className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm bg-white focus:border-accent focus:outline-none"
      >
        <option value="all">Toutes couleurs</option>
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
        className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm bg-white focus:border-accent focus:outline-none"
      >
        <option value="all">Toutes urgences</option>
        <option value="urgent">Urgent uniquement</option>
        <option value="non_urgent">Non urgent</option>
      </select>

      {(value.search ||
        value.style !== "all" ||
        value.colorKey !== "all" ||
        value.urgency !== "all") && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="text-xs text-gray-500 hover:text-accent underline-offset-2 hover:underline"
        >
          Effacer
        </button>
      )}
    </div>
  );
}
