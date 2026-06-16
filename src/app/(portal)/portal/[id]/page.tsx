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
  unavailable: {
    label: "Unavailable",
    cls: "bg-red-100 text-red-800 border-red-200",
  },
};

export default function PortalOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [order, setOrder] = useState<FreelancerOrderView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState("");
  const [unavailableSubmitting, setUnavailableSubmitting] = useState(false);
  const [unavailableError, setUnavailableError] = useState<string | null>(null);

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

  const handleMarkUnavailable = useCallback(async () => {
    if (!order) return;
    const reason = unavailableReason.trim();
    if (!reason) {
      setUnavailableError("Please describe why the report cannot be created.");
      return;
    }
    setUnavailableSubmitting(true);
    setUnavailableError(null);
    try {
      const res = await fetch(`/api/reports/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "unavailable",
          unavailableReason: reason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "PATCH failed");
      }
      setOrder(data.order);
      setShowUnavailableModal(false);
      setUnavailableReason("");
    } catch (err) {
      setUnavailableError(err instanceof Error ? err.message : "Error");
    } finally {
      setUnavailableSubmitting(false);
    }
  }, [order, unavailableReason]);

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

      {order.status === "unavailable" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-red-900 mb-2">
            ⚠️ Report marked as unavailable
          </p>
          {order.unavailableReason && (
            <p className="text-sm text-red-800 whitespace-pre-wrap">
              {order.unavailableReason}
            </p>
          )}
          <p className="text-xs text-red-700 mt-3">
            The Metal Roof team has been notified.
          </p>
        </div>
      )}

      {/* "Report unavailable" entry point — visible while there is still work to do */}
      {(order.status === "pending" || order.status === "in_progress") && (
        <div className="pt-2">
          <button
            onClick={() => {
              setShowUnavailableModal(true);
              setUnavailableError(null);
            }}
            className="text-sm text-red-600 hover:text-red-700 hover:underline font-semibold"
          >
            ⚠️ Report unavailable
          </button>
          <p className="mt-1 text-xs text-slate-500">
            Use if the report is truly impossible to produce (e.g. no imagery
            available, demolished, wrong address).
          </p>
        </div>
      )}

      {/* Modal — reason capture */}
      {showUnavailableModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-3"
          onClick={() => {
            if (!unavailableSubmitting) setShowUnavailableModal(false);
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-5 sm:p-6 space-y-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Mark as unavailable
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tell the Metal Roof team why this report can&apos;t be produced.
                They&apos;ll get notified immediately.
              </p>
            </div>
            <textarea
              value={unavailableReason}
              onChange={(e) => setUnavailableReason(e.target.value)}
              rows={4}
              autoFocus
              placeholder="e.g. No satellite imagery for this address — the building is too recent."
              disabled={unavailableSubmitting}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-red-500 focus:outline-none resize-y"
            />
            {unavailableError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                {unavailableError}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowUnavailableModal(false)}
                disabled={unavailableSubmitting}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkUnavailable}
                disabled={unavailableSubmitting || !unavailableReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {unavailableSubmitting ? "Sending..." : "Confirm unavailable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
