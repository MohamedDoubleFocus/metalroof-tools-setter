import type { ChantierTeam } from "@/types/chantiers";

/**
 * Visual identity per crew. Keep distinct color families so a glance at the
 * Kanban tells you who's on what. Keys map to STABLE team identifiers, not
 * to display names — the chief's name is editable separately and passed in
 * via the `chiefName` prop.
 */
const TEAM_STYLES: Record<
  ChantierTeam,
  { bg: string; text: string; border: string; dot: string }
> = {
  Nikita: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  MAX: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  PAVEL: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  OMAR: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
};

interface Props {
  team: ChantierTeam | undefined;
  /** Editable display name (chief). Falls back to the team key if not provided. */
  chiefName?: string;
  /** Compact = just a colored dot + short label. Use in tight card layouts. */
  compact?: boolean;
}

export default function TeamBadge({ team, chiefName, compact = false }: Props) {
  if (!team) return null;
  const style = TEAM_STYLES[team];
  const label = chiefName?.trim() || team;
  if (compact) {
    return (
      <span
        title={`Équipe ${label}`}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${style.bg} ${style.text} text-[10px] font-bold uppercase tracking-wide`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {label}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-bold ${style.bg} ${style.text} ${style.border}`}
    >
      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
      Équipe {label}
    </span>
  );
}

export { TEAM_STYLES };
