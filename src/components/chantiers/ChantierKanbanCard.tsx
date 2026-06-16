"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { COLORS } from "@/lib/colors";
import type { Chantier } from "@/types/chantiers";
import TeamBadge from "./TeamBadge";
import { useTeamChiefNames } from "@/lib/teams/use-teams";

function formatScheduled(date?: string): string {
  if (!date) return "Non planifié";
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("fr-CA", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatAmount(n?: number): string | null {
  if (n == null) return null;
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

const STYLE_ICONS: Record<NonNullable<Chantier["style"]>, string> = {
  shingle_tile: "🇪🇺", // Style européen
  standing_seam: "▤", // Joint debout
};

const STYLE_LABELS: Record<NonNullable<Chantier["style"]>, string> = {
  shingle_tile: "Style européen",
  standing_seam: "Joint debout",
};

interface Props {
  chantier: Chantier;
  isDragOverlay?: boolean;
  /** When true, the submission badge is not displayed. */
  hideSubmission?: boolean;
  /** When true, the card renders as a plain link with no drag behaviour. */
  readOnly?: boolean;
}

export default function ChantierKanbanCard({
  chantier,
  isDragOverlay,
  hideSubmission = false,
  readOnly = false,
}: Props) {
  const sortable = useSortable({ id: chantier.id, disabled: readOnly });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;

  const style = readOnly
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  const color = chantier.colorKey ? COLORS[chantier.colorKey] : undefined;
  const amount = formatAmount(chantier.totalAmount);
  const isPinned = chantier.priority != null;
  const isUrgent = chantier.urgency === "urgent";
  const chiefNames = useTeamChiefNames();

  return (
    <div
      ref={readOnly ? undefined : setNodeRef}
      style={style}
      {...(readOnly ? {} : attributes)}
      {...(readOnly ? {} : listeners)}
      className={`
        group border-2 rounded-xl p-3
        ${readOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}
        ${
          isUrgent
            ? "bg-red-50 border-red-300 hover:border-red-500"
            : isPinned
              ? "bg-white border-amber-300 hover:border-accent"
              : "bg-white border-gray-200 hover:border-accent"
        }
        ${!readOnly && isDragging ? "opacity-30" : ""}
        ${isDragOverlay ? "shadow-2xl rotate-2 cursor-grabbing" : "hover:shadow-sm"}
        transition-all
      `}
    >
      {/* Top: urgency tag (if urgent) — very visible */}
      {isUrgent && (
        <div className="mb-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-bold uppercase tracking-wide">
          🔥 Urgent
        </div>
      )}

      {/* Client name + pinned indicator */}
      <div className="flex items-start gap-1.5 mb-1">
        <div className="font-bold text-sm text-gray-900 truncate flex-1 leading-tight">
          {chantier.clientName}
        </div>
        {isPinned && (
          <span title={`Priorité #${chantier.priority}`} className="text-amber-500 text-xs leading-none">
            📌
          </span>
        )}
      </div>

      {/* Address — single line, truncated */}
      <div className="text-xs text-gray-600 truncate mb-1.5">
        {chantier.addressLine1}
      </div>

      {/* Date install + amount */}
      <div className="flex items-center justify-between gap-2 text-xs text-gray-500 mb-2">
        <span className="truncate">📅 {formatScheduled(chantier.scheduledDate)}</span>
        {amount && <span className="font-semibold text-gray-700">{amount}</span>}
      </div>

      {/* Bottom: team + color dot + style + send markers */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <TeamBadge
          team={chantier.team}
          chiefName={chantier.team ? chiefNames[chantier.team] : undefined}
          compact
        />
        {color && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 rounded text-[10px] font-semibold text-gray-700"
            title={color.frenchName}
          >
            <span
              className="w-2.5 h-2.5 rounded-full border border-gray-300"
              style={{ backgroundColor: color.hex }}
            />
            {color.frenchName}
          </span>
        )}
        {chantier.style && (
          <span
            className="px-1.5 py-0.5 bg-gray-50 rounded text-[10px] font-semibold text-gray-700"
            title={STYLE_LABELS[chantier.style]}
          >
            {STYLE_ICONS[chantier.style]} {STYLE_LABELS[chantier.style]}
          </span>
        )}
        {chantier.warrantySentAt && (
          <span className="px-1 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-bold" title="Garantie envoyée">
            ✓G
          </span>
        )}
        {chantier.invoiceSentAt && (
          <span className="px-1 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-bold" title="Facture envoyée">
            ✓F
          </span>
        )}
      </div>

      {/* Open detail link — z-indexed above the draggable layer, click stops propagation */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
        <Link
          href={`/chantiers/${chantier.id}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] text-gray-500 hover:text-accent font-semibold"
        >
          Ouvrir →
        </Link>
        <div className="flex items-center gap-2">
          {!hideSubmission && chantier.submissionUrl && (
            <a
              href={chantier.submissionUrl}
              target="_blank"
              rel="noopener noreferrer"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-gray-500 hover:text-accent"
              title="Lien soumission"
            >
              📄 Soum.
            </a>
          )}
          {chantier.roofrUrl && (
            <a
              href={chantier.roofrUrl}
              target="_blank"
              rel="noopener noreferrer"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-gray-500 hover:text-accent"
              title="Rapport Roofr"
            >
              🏠 Roofr
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
