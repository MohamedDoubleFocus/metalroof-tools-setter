"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import FreelancerUploadForm from "@/components/reports/FreelancerUploadForm";
import type { FreelancerOrderView, ReportStatus } from "@/types/reports";

const STATUS_LABEL: Record<ReportStatus, { label: string; cls: string }> = {
  pending: {
    label: "To do",
    cls: "bg-amber-100 text-amber-800 border-amber-200",
  },
  in_progress: {
    label: "In progress",
    cls: "bg-sky-100 text-sky-800 border-sky-200",
  },
  ready: {
    label: "Submitted",
    cls: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  delivered: {
    label: "Delivered",
    cls: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export default function PortalOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [order, setOrder] = useState<FreelancerOrderView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${id}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = useCallback(async () => {
    if (!order) return;
    setActionPending(true);
    try {
      const res = await fetch(`/api/reports/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      if (!res.ok) throw new Error("PATCH failed");
      const data = await res.json();
      setOrder(data.order);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setActionPending(false);
    }
  }, [order]);

  if (loading) {
    return <div className="text-center py-10 text-slate-400">Loading…</div>;
  }
  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link href="/portal" className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to queue
        </Link>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error || "Order not found"}
        </div>
      </div>
    );
  }

  const status = STATUS_LABEL[order.status];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/portal"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to queue
        </Link>
        <div className="mt-3 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {order.address}
            </h1>
            {order.lat && order.lng && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${order.lat},${order.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Open in Google Maps
              </a>
            )}
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${status.cls}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      {order.notes && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Special instructions
          </h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">
            {order.notes}
          </p>
        </div>
      )}

      {order.referencePhotos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Reference photos
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {order.referencePhotos.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-slate-400"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Reference ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Workflow actions */}
      {order.status === "pending" && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 text-center">
          <p className="text-sm mb-3">Ready to work on this order?</p>
          <button
            onClick={handleStart}
            disabled={actionPending}
            className="px-6 py-2.5 bg-white text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-100 disabled:opacity-50"
          >
            {actionPending ? "..." : "Mark as in progress"}
          </button>
        </div>
      )}

      {order.status === "in_progress" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <FreelancerUploadForm orderId={order.id} onUploaded={load} />
        </div>
      )}

      {(order.status === "ready" || order.status === "delivered") &&
        order.pdfUrl && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <p className="text-sm text-emerald-900 mb-2 font-semibold">
              ✅ Report submitted
            </p>
            <a
              href={order.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-emerald-700 hover:underline"
            >
              View uploaded PDF →
            </a>
          </div>
        )}
    </div>
  );
}
