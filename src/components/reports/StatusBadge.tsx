"use client";

import type { ReportStatus } from "@/types/reports";

interface Def {
  label: string;
  emoji: string;
  classes: string;
}

const DEFS: Record<ReportStatus, Def> = {
  pending: {
    label: "En attente",
    emoji: "⏳",
    classes: "bg-amber-100 text-amber-800 border-amber-200",
  },
  in_progress: {
    label: "En cours",
    emoji: "🛠",
    classes: "bg-sky-100 text-sky-800 border-sky-200",
  },
  ready: {
    label: "Prêt",
    emoji: "✅",
    classes: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  delivered: {
    label: "Livré",
    emoji: "📦",
    classes: "bg-gray-100 text-gray-700 border-gray-200",
  },
  unavailable: {
    label: "Indisponible",
    emoji: "⚠️",
    classes: "bg-red-100 text-red-800 border-red-200",
  },
};

export function getStatusDef(status: ReportStatus): Def {
  return DEFS[status];
}

export default function StatusBadge({ status }: { status: ReportStatus }) {
  const def = DEFS[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${def.classes}`}
    >
      <span>{def.emoji}</span>
      <span>{def.label}</span>
    </span>
  );
}
