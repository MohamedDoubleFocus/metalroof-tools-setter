import type { ChantierStatus } from "@/types/chantiers";

const LABELS: Record<ChantierStatus, { label: string; cls: string }> = {
  scheduled: {
    label: "Planifié",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  in_progress: {
    label: "En cours",
    cls: "bg-amber-50 text-amber-800 border-amber-200",
  },
  done: {
    label: "Terminé",
    cls: "bg-green-50 text-green-700 border-green-200",
  },
};

export default function ChantierStatusBadge({
  status,
}: {
  status: ChantierStatus;
}) {
  const { label, cls } = LABELS[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}
