"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/reports/StatusBadge";
import type { ReportOrder } from "@/types/reports";

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString("fr-CA", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [order, setOrder] = useState<ReportOrder | null>(null);
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
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const markDelivered = useCallback(async () => {
    if (!order) return;
    setActionPending(true);
    try {
      const res = await fetch(`/api/reports/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" }),
      });
      if (!res.ok) throw new Error("PATCH failed");
      const data = await res.json();
      setOrder(data.order);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionPending(false);
    }
  }, [order]);

  const handleDelete = useCallback(async () => {
    if (!order) return;
    if (
      !confirm(
        `Supprimer la commande pour "${order.closerLabel}" ?\n\nCette action est irréversible.`
      )
    ) {
      return;
    }
    setActionPending(true);
    try {
      const res = await fetch(`/api/reports/${order.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("DELETE failed");
      router.push("/reports");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
      setActionPending(false);
    }
  }, [order, router]);

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-400">Chargement...</div>
    );
  }
  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link
          href="/reports"
          className="text-sm text-gray-500 hover:text-accent"
        >
          ← Toutes les commandes
        </Link>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error || "Commande introuvable"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/reports"
          className="text-sm text-gray-500 hover:text-accent"
        >
          ← Toutes les commandes
        </Link>
        <div className="mt-3 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {order.closerLabel}
            </h1>
            <p className="text-gray-500 mt-1">{order.address}</p>
            {order.clientPhone && (
              <p className="text-sm text-gray-500 mt-1">
                📞{" "}
                <a
                  href={`tel:${order.clientPhone.replace(/\D/g, "")}`}
                  className="text-accent hover:underline"
                >
                  {order.clientPhone}
                </a>
              </p>
            )}
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2 text-sm">
        <p>
          <span className="font-semibold text-gray-700">Commandée :</span>{" "}
          <span className="text-gray-500">{formatDate(order.createdAt)}</span>
        </p>
        {order.completedAt && (
          <p>
            <span className="font-semibold text-gray-700">PDF reçu :</span>{" "}
            <span className="text-gray-500">
              {formatDate(order.completedAt)}
            </span>
          </p>
        )}
      </div>

      {order.notes && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
            Instructions envoyées
          </h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {order.notes}
          </p>
        </div>
      )}

      {order.referencePhotos.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
            Photos de référence
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {order.referencePhotos.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Référence ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* PDF section */}
      {order.status === "ready" || order.status === "delivered" ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-bold text-emerald-900">
              📄 Rapport prêt
            </h3>
            {order.pdfUrl && (
              <div className="flex items-center gap-2">
                <a
                  href={order.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100"
                >
                  ↗ Ouvrir
                </a>
                <a
                  href={order.pdfUrl}
                  download
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent-light"
                >
                  ⤓ Télécharger
                </a>
              </div>
            )}
          </div>

          {order.pdfUrl && (
            <div className="rounded-xl overflow-hidden border border-emerald-200 bg-white">
              <iframe
                src={`${order.pdfUrl}#toolbar=1&navpanes=0`}
                title="Aperçu du rapport"
                className="w-full h-[800px]"
              />
            </div>
          )}
          {order.status === "ready" && (
            <button
              onClick={markDelivered}
              disabled={actionPending}
              className="ml-3 inline-block px-5 py-2.5 bg-white border-2 border-emerald-300 text-emerald-800 rounded-xl text-sm font-bold hover:bg-emerald-50 disabled:opacity-50"
            >
              {actionPending ? "..." : "Marquer comme livré"}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center">
          <p className="text-sm text-gray-500">
            {order.status === "pending"
              ? "En attente que le freelancer prenne la commande."
              : "Le freelancer travaille actuellement sur le rapport."}
          </p>
        </div>
      )}

      <div className="pt-4 border-t border-gray-100">
        <button
          onClick={handleDelete}
          disabled={actionPending}
          className="px-4 py-2 bg-white border-2 border-rose-300 text-rose-700 rounded-xl text-sm font-bold hover:bg-rose-50 disabled:opacity-50"
        >
          🗑 Supprimer la commande
        </button>
      </div>
    </div>
  );
}
