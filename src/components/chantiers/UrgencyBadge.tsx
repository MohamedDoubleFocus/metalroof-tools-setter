import type { ChantierUrgency } from "@/types/chantiers";

interface Props {
  urgency: ChantierUrgency;
  /** Compact mode shows just the dot, no label. */
  compact?: boolean;
}

export default function UrgencyBadge({ urgency, compact = false }: Props) {
  if (urgency === "urgent") {
    if (compact) {
      return (
        <span
          className="inline-block w-2 h-2 rounded-full bg-red-500 shrink-0"
          title="Urgent"
        />
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold uppercase tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Urgent
      </span>
    );
  }
  if (compact) {
    return (
      <span
        className="inline-block w-2 h-2 rounded-full bg-gray-300 shrink-0"
        title="Non urgent"
      />
    );
  }
  return null;
}
