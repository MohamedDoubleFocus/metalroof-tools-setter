"use client";

import type { Lead } from "@/types/prospection";
import { getStatusDef } from "./StatusPills";

interface Props {
  lead: Lead;
  onClick?: (lead: Lead) => void;
}

function formatTime(ms?: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleString("fr-CA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

export default function LeadCard({ lead, onClick }: Props) {
  const def = getStatusDef(lead.status);
  const scheduleText =
    lead.status === "meeting" && lead.meetingAt
      ? `📅 ${formatTime(lead.meetingAt)}`
      : (lead.status === "repasser" || lead.status === "suivi") && lead.followUpAt
        ? `📅 ${formatTime(lead.followUpAt)}`
        : null;

  return (
    <button
      type="button"
      onClick={() => onClick?.(lead)}
      className="w-full text-left bg-white rounded-2xl border border-gray-200 p-4 hover:border-gray-300 active:bg-gray-50 transition-colors shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl ${def.selected.split(" ").filter((c) => c.startsWith("bg-")).join(" ")} text-white`}
        >
          {def.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="font-bold text-gray-900 truncate">
              {lead.address}
            </p>
            <span
              className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${def.selected.split(" ").filter((c) => c.startsWith("bg-") || c.startsWith("text-")).join(" ")}`}
            >
              {def.label}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span className="font-medium">{lead.knockerName}</span>
            <span>•</span>
            <span>{formatRelative(lead.createdAt)}</span>
          </div>

          {scheduleText && (
            <p className="text-xs font-semibold text-gray-700 mt-1">
              {scheduleText}
            </p>
          )}

          {lead.notes && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
              {lead.notes}
            </p>
          )}
        </div>

        {lead.photoUrl && (
          <div className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lead.photoUrl}
              alt="Toiture"
              className="w-14 h-14 object-cover rounded-lg border border-gray-200"
            />
          </div>
        )}
      </div>
    </button>
  );
}
