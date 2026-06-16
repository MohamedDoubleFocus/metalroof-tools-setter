"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { FreelancerOrderView, ReportStatus } from "@/types/reports";

type GroupKey = "pending" | "in_progress" | "ready" | "unavailable";

const GROUPS: Array<{ key: GroupKey; label: string; accent: string }> = [
  {
    key: "pending",
    label: "To do",
    accent: "border-amber-300 bg-amber-50",
  },
  {
    key: "in_progress",
    label: "In progress",
    accent: "border-sky-300 bg-sky-50",
  },
  {
    key: "ready",
    label: "Done",
    accent: "border-emerald-300 bg-emerald-50",
  },
  {
    key: "unavailable",
    label: "Unavailable",
    accent: "border-red-300 bg-red-50",
  },
];

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function PortalHomePage() {
  const [orders, setOrders] = useState<FreelancerOrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/reports")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setOrders(data.orders as FreelancerOrderView[]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      [o.address, o.notes].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [orders, search]);

  const byGroup = useMemo(() => {
    const out: Record<ReportStatus, FreelancerOrderView[]> = {
      pending: [],
      in_progress: [],
      ready: [],
      delivered: [],
      unavailable: [],
    };
    for (const o of filtered) out[o.status].push(o);
    // Newest first within each group
    for (const key of Object.keys(out) as ReportStatus[]) {
      out[key].sort((a, b) => b.createdAt - a.createdAt);
    }
    return out;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Roofing report queue
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pick up an order, generate the PDF report, upload it back.
        </p>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search address or notes..."
        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:border-slate-600 focus:outline-none"
      />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {GROUPS.map((group) => {
            const items = byGroup[group.key];
            return (
              <section
                key={group.key}
                className={`rounded-2xl border ${group.accent} p-4`}
              >
                <h2 className="font-bold text-slate-800 mb-3 flex items-center justify-between">
                  <span>{group.label}</span>
                  <span className="text-xs font-semibold text-slate-500">
                    {items.length}
                  </span>
                </h2>
                {items.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    No orders
                  </p>
                ) : (
                  <div className="space-y-2">
                    {items.map((o) => (
                      <Link
                        key={o.id}
                        href={`/portal/${o.id}`}
                        className="block bg-white border border-slate-200 rounded-xl p-3 hover:border-slate-400 transition-colors"
                      >
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {o.address}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatRelative(o.createdAt)}
                          {o.referencePhotos.length > 0 && (
                            <span> · 📷 {o.referencePhotos.length}</span>
                          )}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
