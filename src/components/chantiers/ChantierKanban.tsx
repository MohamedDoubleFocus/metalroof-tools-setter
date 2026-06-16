"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { sortQueueOrder } from "@/lib/chantiers/kv-client";
import type { Chantier, ChantierStatus } from "@/types/chantiers";
import ChantierKanbanCard from "./ChantierKanbanCard";
import { applyFilters, type FiltersState } from "./ChantierFilters";

/**
 * Kanban columns.
 *
 * The 3 month buckets (Juin / Juillet / Août+) are visual subdivisions of
 * the `scheduled` status — chantiers are classified into a bucket based on
 * their `scheduledDate`. Drag between month columns updates scheduledDate;
 * drag to "En attente" clears it. Status only flips when crossing into
 * "En cours" (in_progress) or "Fini" (done).
 */

type ColumnKey =
  | "scheduled_none"
  | "june"
  | "july"
  | "august_plus"
  | "in_progress"
  | "done";

interface Column {
  key: ColumnKey;
  label: string;
  tone: string;
  /** The Chantier.status this column maps to. */
  status: ChantierStatus;
  /** If set, drag-in should set scheduledDate to this YYYY-MM-DD. */
  defaultDate?: string;
}

// Hardcoded for the current season — change these to roll the buckets forward.
const YEAR = 2026;
const COLUMNS: Column[] = [
  {
    key: "scheduled_none",
    label: "En attente",
    tone: "bg-amber-50 border-amber-200",
    status: "scheduled",
  },
  {
    key: "june",
    label: "Juin",
    tone: "bg-sky-50 border-sky-200",
    status: "scheduled",
    defaultDate: `${YEAR}-06-01`,
  },
  {
    key: "july",
    label: "Juillet",
    tone: "bg-violet-50 border-violet-200",
    status: "scheduled",
    defaultDate: `${YEAR}-07-01`,
  },
  {
    key: "august_plus",
    label: "Août ou plus tard",
    tone: "bg-fuchsia-50 border-fuchsia-200",
    status: "scheduled",
    defaultDate: `${YEAR}-08-01`,
  },
  {
    key: "in_progress",
    label: "En cours",
    tone: "bg-blue-50 border-blue-200",
    status: "in_progress",
  },
  {
    key: "done",
    label: "Fini",
    tone: "bg-green-50 border-green-200",
    status: "done",
  },
];

/**
 * Bucket a chantier into one of the 6 columns based on status and
 * scheduledDate.
 */
function columnFor(c: Chantier): ColumnKey {
  if (c.status === "in_progress") return "in_progress";
  if (c.status === "done") return "done";
  // scheduled
  if (!c.scheduledDate) return "scheduled_none";
  // scheduledDate is YYYY-MM-DD
  const parts = c.scheduledDate.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (year === YEAR && month === 6) return "june";
  if (year === YEAR && month === 7) return "july";
  // Aug+: anything from Aug YEAR onwards, or any future year
  if (year > YEAR || (year === YEAR && month >= 8)) return "august_plus";
  // Past dates (before June YEAR) — show in En attente so they're not lost
  return "scheduled_none";
}

interface Props {
  chantiers: Chantier[];
  filters: FiltersState;
  onChange: (updated: Chantier[]) => void;
  /** When true, drag-and-drop is disabled — cards just clickable. */
  readOnly?: boolean;
  /** When true, the submission link badge is hidden on cards. */
  hideSubmission?: boolean;
}

interface DroppableColumnProps {
  column: Column;
  items: Chantier[];
  hideSubmission?: boolean;
}

function DroppableColumn({ column, items, hideSubmission }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  return (
    <div
      ref={setNodeRef}
      className={`
        flex-shrink-0 w-[260px] sm:w-[280px] flex flex-col rounded-2xl border-2
        ${column.tone}
        ${isOver ? "ring-2 ring-accent ring-offset-2" : ""}
      `}
    >
      <div className="px-3 py-2.5 border-b border-current/10 flex items-center justify-between rounded-t-2xl">
        <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wide truncate">
          {column.label}
        </h3>
        <span className="text-xs font-bold text-gray-600 bg-white/70 px-2 py-0.5 rounded-full shrink-0 ml-2">
          {items.length}
        </span>
      </div>
      <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="p-2 flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-300px)] min-h-[120px]">
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              Aucun chantier
            </p>
          ) : (
            items.map((c) => (
              <ChantierKanbanCard
                key={c.id}
                chantier={c}
                hideSubmission={hideSubmission}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function ChantierKanban({
  chantiers,
  filters,
  onChange,
  readOnly = false,
  hideSubmission = false,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const visible = useMemo(
    () => applyFilters(chantiers, filters),
    [chantiers, filters]
  );

  const byColumn = useMemo(() => {
    const grouped: Record<ColumnKey, Chantier[]> = {
      scheduled_none: [],
      june: [],
      july: [],
      august_plus: [],
      in_progress: [],
      done: [],
    };
    for (const c of visible) grouped[columnFor(c)].push(c);
    for (const k of Object.keys(grouped) as ColumnKey[]) {
      grouped[k] = sortQueueOrder(grouped[k]);
    }
    return grouped;
  }, [visible]);

  const activeChantier = activeId
    ? chantiers.find((c) => c.id === activeId)
    : null;

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    if (readOnly) return; // foreman: drag is a no-op
    const { active, over } = e;
    if (!over) return;

    const draggedId = String(active.id);
    const overId = String(over.id);

    const dragged = chantiers.find((c) => c.id === draggedId);
    if (!dragged) return;

    // Determine target column: either a column key directly, or another card's column.
    const targetColumn = COLUMNS.find((col) => col.key === overId) ?? null;
    const overCard = !targetColumn
      ? chantiers.find((c) => c.id === overId)
      : null;
    const target =
      targetColumn ??
      (overCard ? COLUMNS.find((col) => col.key === columnFor(overCard)) : null);
    if (!target) return;

    const currentColumn = columnFor(dragged);

    // Same-column reorder → priority pin.
    if (target.key === currentColumn) {
      if (!overCard || overCard.id === draggedId) return;
      const columnIds = byColumn[target.key].map((c) => c.id);
      const fromIdx = columnIds.indexOf(draggedId);
      const toIdx = columnIds.indexOf(overCard.id);
      if (fromIdx < 0 || toIdx < 0) return;

      const newOrder = [...columnIds];
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, draggedId);

      const updated = chantiers.map((c) => {
        const idx = newOrder.indexOf(c.id);
        if (idx < 0) return c;
        return { ...c, priority: idx + 1 };
      });
      onChange(updated);

      await fetch("/api/chantiers/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: newOrder }),
      });
      return;
    }

    // Cross-column move: figure out the patch to apply.
    const patch: {
      status?: ChantierStatus;
      scheduledDate?: string | null;
      priority?: null;
    } = { priority: null };

    if (target.status !== dragged.status) {
      patch.status = target.status;
    }

    // Month buckets set scheduledDate; "En attente" clears it.
    if (target.key === "scheduled_none") {
      patch.scheduledDate = null;
    } else if (target.defaultDate) {
      // Only override if moving INTO a different month bucket (don't overwrite
      // a fine-grained date when dropping into the same bucket).
      const currentMonth = dragged.scheduledDate?.slice(0, 7);
      const targetMonth = target.defaultDate.slice(0, 7);
      if (currentMonth !== targetMonth) {
        patch.scheduledDate = target.defaultDate;
      }
    }

    const updated = chantiers.map((c) =>
      c.id === draggedId
        ? {
            ...c,
            status: patch.status ?? c.status,
            scheduledDate:
              patch.scheduledDate === undefined
                ? c.scheduledDate
                : patch.scheduledDate ?? undefined,
            priority: undefined,
          }
        : c
    );
    onChange(updated);

    await fetch(`/api/chantiers/${draggedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-3 px-3 sm:mx-0 sm:px-0 snap-x snap-mandatory sm:snap-none">
        {COLUMNS.map((col) => (
          <div key={col.key} className="snap-start sm:snap-none">
            <DroppableColumn
              column={col}
              items={byColumn[col.key]}
              hideSubmission={hideSubmission}
            />
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeChantier && (
          <div className="w-[260px]">
            <ChantierKanbanCard chantier={activeChantier} isDragOverlay />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
