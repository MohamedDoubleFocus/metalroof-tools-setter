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

const COLUMNS: Array<{ key: ChantierStatus; label: string; tone: string }> = [
  { key: "scheduled", label: "En attente", tone: "bg-amber-50 border-amber-200" },
  { key: "in_progress", label: "En cours", tone: "bg-blue-50 border-blue-200" },
  { key: "done", label: "Fini", tone: "bg-green-50 border-green-200" },
];

interface Props {
  chantiers: Chantier[];
  filters: FiltersState;
  onChange: (updated: Chantier[]) => void;
}

interface DroppableColumnProps {
  column: (typeof COLUMNS)[number];
  items: Chantier[];
}

function DroppableColumn({ column, items }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  return (
    <div
      ref={setNodeRef}
      className={`
        flex-1 min-w-[260px] max-w-md flex flex-col rounded-2xl border-2
        ${column.tone}
        ${isOver ? "ring-2 ring-accent ring-offset-2" : ""}
      `}
    >
      <div className="px-4 py-3 border-b border-current/10 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">
          {column.label}
        </h3>
        <span className="text-xs font-bold text-gray-600 bg-white/60 px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>
      <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="p-2 flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-280px)]">
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">
              Aucun chantier
            </p>
          ) : (
            items.map((c) => (
              <ChantierKanbanCard key={c.id} chantier={c} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function ChantierKanban({ chantiers, filters, onChange }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Apply filters to what's rendered in each column. Drag math also uses
  // the filtered subset — that's consistent with what the user sees.
  const visible = useMemo(
    () => applyFilters(chantiers, filters),
    [chantiers, filters]
  );

  const byStatus = useMemo(() => {
    const grouped: Record<ChantierStatus, Chantier[]> = {
      scheduled: [],
      in_progress: [],
      done: [],
    };
    for (const c of visible) grouped[c.status].push(c);
    for (const k of Object.keys(grouped) as ChantierStatus[]) {
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
    const { active, over } = e;
    if (!over) return;

    const draggedId = String(active.id);
    const overId = String(over.id);

    // Find dragged chantier
    const dragged = chantiers.find((c) => c.id === draggedId);
    if (!dragged) return;

    // Determine target column: either the column key directly, or the card's column
    const isColumnId = COLUMNS.some((col) => col.key === overId);
    const overCard = !isColumnId ? chantiers.find((c) => c.id === overId) : null;
    const targetStatus: ChantierStatus = isColumnId
      ? (overId as ChantierStatus)
      : overCard?.status ?? dragged.status;

    // Cross-column move: update status, clear priority (status drives sort then).
    if (targetStatus !== dragged.status) {
      const updated = chantiers.map((c) =>
        c.id === draggedId
          ? { ...c, status: targetStatus, priority: undefined }
          : c
      );
      onChange(updated);
      await fetch(`/api/chantiers/${draggedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, priority: null }),
      });
      return;
    }

    // Same-column reorder: pin via priority assignment.
    if (!overCard || overCard.id === draggedId) return;
    const columnIds = byStatus[targetStatus].map((c) => c.id);
    const fromIdx = columnIds.indexOf(draggedId);
    const toIdx = columnIds.indexOf(overCard.id);
    if (fromIdx < 0 || toIdx < 0) return;

    // Build new order
    const newOrder = [...columnIds];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, draggedId);

    // Optimistic UI: assign new priority 1..N
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
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <DroppableColumn key={col.key} column={col} items={byStatus[col.key]} />
        ))}
      </div>

      <DragOverlay>
        {activeChantier && (
          <div className="w-72">
            <ChantierKanbanCard chantier={activeChantier} isDragOverlay />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
