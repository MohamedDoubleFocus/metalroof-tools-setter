"use client";

import type { LeadStatus } from "@/types/prospection";

interface Props {
  value: LeadStatus | null;
  onChange: (status: LeadStatus) => void;
  size?: "md" | "lg";
}

interface StatusDef {
  key: LeadStatus;
  label: string;
  emoji: string;
  /** Tailwind classes — bg, text, border, ring */
  selected: string;
  /** Tailwind classes for the unselected outline */
  unselected: string;
}

export const STATUS_DEFS: StatusDef[] = [
  {
    key: "absent",
    label: "Absent",
    emoji: "🚪",
    selected: "bg-sky-500 text-white border-sky-500 ring-sky-200",
    unselected: "bg-white text-sky-700 border-sky-300 hover:bg-sky-50",
  },
  {
    key: "meeting",
    label: "Meeting",
    emoji: "🤝",
    selected: "bg-emerald-500 text-white border-emerald-500 ring-emerald-200",
    unselected:
      "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50",
  },
  {
    key: "repasser",
    label: "Repasser",
    emoji: "🔁",
    selected: "bg-amber-400 text-amber-950 border-amber-400 ring-amber-200",
    unselected:
      "bg-white text-amber-800 border-amber-300 hover:bg-amber-50",
  },
  {
    key: "suivi",
    label: "Suivi",
    emoji: "📌",
    selected: "bg-orange-500 text-white border-orange-500 ring-orange-200",
    unselected:
      "bg-white text-orange-700 border-orange-300 hover:bg-orange-50",
  },
  {
    key: "refus",
    label: "Refus",
    emoji: "🚫",
    selected: "bg-rose-500 text-white border-rose-500 ring-rose-200",
    unselected: "bg-white text-rose-700 border-rose-300 hover:bg-rose-50",
  },
];

export function getStatusDef(status: LeadStatus): StatusDef {
  return STATUS_DEFS.find((s) => s.key === status) ?? STATUS_DEFS[0];
}

/**
 * Map status → marker color (for ProspectionMap pins).
 */
export function statusColorHex(status: LeadStatus): string {
  switch (status) {
    case "absent":
      return "#0EA5E9"; // sky-500
    case "meeting":
      return "#10B981"; // emerald-500
    case "repasser":
      return "#FBBF24"; // amber-400
    case "suivi":
      return "#F97316"; // orange-500
    case "refus":
      return "#F43F5E"; // rose-500
  }
}

export default function StatusPills({ value, onChange, size = "lg" }: Props) {
  const sizeClasses =
    size === "lg"
      ? "min-h-[80px] py-3 px-2 text-sm"
      : "min-h-[60px] py-2 px-2 text-xs";
  const emojiSize = size === "lg" ? "text-2xl" : "text-xl";

  return (
    <div className="grid grid-cols-5 gap-2">
      {STATUS_DEFS.map((def) => {
        const isActive = value === def.key;
        return (
          <button
            key={def.key}
            type="button"
            onClick={() => onChange(def.key)}
            className={`
              ${sizeClasses}
              flex flex-col items-center justify-center gap-1
              rounded-2xl border-2 font-bold transition-all
              ${isActive ? def.selected + " ring-4 shadow-md scale-[1.02]" : def.unselected}
            `}
          >
            <span className={emojiSize}>{def.emoji}</span>
            <span className="leading-tight">{def.label}</span>
          </button>
        );
      })}
    </div>
  );
}
