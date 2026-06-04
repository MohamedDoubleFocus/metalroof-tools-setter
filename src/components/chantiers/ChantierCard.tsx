import Link from "next/link";
import type { Chantier } from "@/types/chantiers";
import ChantierStatusBadge from "./ChantierStatusBadge";
import UrgencyBadge from "./UrgencyBadge";
import { COLORS } from "@/lib/colors";

function formatDate(ts: number | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-CA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatScheduled(date?: string): string {
  if (!date) return "Non planifiée";
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("fr-CA", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatAmount(n?: number): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

interface Props {
  chantier: Chantier;
  /** Visual rank in the queue (1-based). Only shown for "scheduled". */
  queuePosition?: number;
}

export default function ChantierCard({ chantier, queuePosition }: Props) {
  return (
    <Link
      href={`/chantiers/${chantier.id}`}
      className="block bg-white border-2 border-gray-200 rounded-2xl p-4 hover:border-accent hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        {queuePosition != null && chantier.status === "scheduled" && (
          <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center">
            #{queuePosition}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 truncate">
              {chantier.clientName}
            </h3>
            <ChantierStatusBadge status={chantier.status} />
            <UrgencyBadge urgency={chantier.urgency} />
            {chantier.colorKey && COLORS[chantier.colorKey] && (
              <span
                className="inline-block w-3 h-3 rounded-full border border-gray-300"
                style={{ backgroundColor: COLORS[chantier.colorKey].hex }}
                title={COLORS[chantier.colorKey].frenchName}
              />
            )}
            {chantier.warrantySentAt && (
              <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                ✓ Garantie
              </span>
            )}
            {chantier.invoiceSentAt && (
              <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                ✓ Facture
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 truncate mt-0.5">
            {chantier.addressLine1}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {chantier.addressLine2}
          </p>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
            <span>
              <span className="text-gray-400">Signé&nbsp;:</span>{" "}
              {formatDate(chantier.signedAt)}
            </span>
            <span>
              <span className="text-gray-400">Install&nbsp;:</span>{" "}
              {formatScheduled(chantier.scheduledDate)}
            </span>
            <span>
              <span className="text-gray-400">Total&nbsp;:</span>{" "}
              {formatAmount(chantier.totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
