"use client";

import Link from "next/link";
import StatusBadge from "./StatusBadge";
import type { ReportOrder } from "@/types/reports";

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

export default function ReportOrderCard({ order }: { order: ReportOrder }) {
  return (
    <Link
      href={`/reports/${order.id}`}
      className="block bg-white rounded-2xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900 truncate">
            {order.closerLabel}
          </p>
          <p className="text-sm text-gray-500 truncate">{order.address}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{formatRelative(order.createdAt)}</span>
        {order.referencePhotos.length > 0 && (
          <span>📷 {order.referencePhotos.length}</span>
        )}
        {order.notes && <span className="truncate">📝 {order.notes}</span>}
      </div>
    </Link>
  );
}
