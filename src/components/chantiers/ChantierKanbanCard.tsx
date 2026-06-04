"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { COLORS } from "@/lib/colors";
import type { Chantier } from "@/types/chantiers";
import UrgencyBadge from "./UrgencyBadge";

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
}

export default function ChantierKanbanCard({ chantier, isDragOverlay }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chantier.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const color = chantier.colorKey ? COLORS[chantier.colorKey] : undefined;
  const amount = formatAmount(chantier.totalAmount);
  const isPinned = chantier.priority != null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        group bg-white border-2 rounded-xl p-3 cursor-grab active:cursor-grabbing
        ${isPinned ? "border-amber-300" : "border-gray-200"}
        ${isDragging ? "opacity-30" : ""}
        ${isDragOverlay ? "shadow-2xl rotate-2 cursor-grabbing" : "hover:border-accent hover:shadow-sm"}
        transition-all
      `}
    >
      {/* Top: client name + urgency */}
      <div className="flex items-start gap-1.5 mb-1">
        <div className="font-bold text-sm text-gray-900 truncate flex-1 leading-tight">
          {chantier.clientName}
        </div>
        {isPinned && (
          <span title={`Priorité #${chantier.priority}`} className="text-amber-500 text-xs leading-none">
            📌
          </span>
        )}
        <UrgencyBadge urgency={chantier.urgency} compact />
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

      {/* Bottom: color dot + style + send markers */}
      <div className="flex items-center gap-1.5 flex-wrap">
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
        {chantier.submissionUrl && (
          <a
            href={chantier.submissionUrl}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] text-gray-500 hover:text-accent"
            title="Lien soumission"
          >
            📄 Soumission
          </a>
        )}
      </div>
    </div>
  );
}
