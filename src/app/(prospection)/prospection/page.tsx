"use client";

import { useCallback, useEffect, useState } from "react";
import { useKnocker } from "@/lib/prospection/use-knocker";
import KnockerGate from "@/components/prospection/KnockerGate";
import LeadForm from "@/components/prospection/LeadForm";
import LeadsList from "@/components/prospection/LeadsList";
import ProspectionMap from "@/components/prospection/ProspectionMap";
import SectorList from "@/components/prospection/SectorList";
import BottomNav, {
  type ProspectionTab,
} from "@/components/prospection/BottomNav";
import type { Lead } from "@/types/prospection";

function todayDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ProspectionPage() {
  const { ready, knocker, setKnocker, clearKnocker } = useKnocker();

  const [tab, setTab] = useState<ProspectionTab>("add");
  const [refreshSignal, setRefreshSignal] = useState(0);

  // For the map tab: lazily load all leads (today across team)
  const [mapLeads, setMapLeads] = useState<Lead[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapScope, setMapScope] = useState<"mine" | "all">("all");

  // Sync tab with URL query (so bookmarking/sharing works and back button feels right)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (
      t === "add" ||
      t === "today" ||
      t === "map" ||
      t === "sectors"
    ) {
      setTab(t);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (tab === "add") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    window.history.replaceState(null, "", url.toString());
  }, [tab]);

  // Fetch map leads when entering the map tab or when knocker scope changes
  useEffect(() => {
    if (tab !== "map" || !knocker) return;
    let cancelled = false;
    setMapLoading(true);
    const params = new URLSearchParams();
    params.set("date", todayDateKey());
    if (mapScope === "mine") params.set("knockerId", knocker.id);
    fetch(`/api/prospection/leads?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setMapLeads(data.leads as Lead[]);
      })
      .catch(() => {})
      .finally(() => !cancelled && setMapLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab, knocker, mapScope, refreshSignal]);

  const handleLeadSubmitted = useCallback(() => {
    // Bump the refresh signal so other tabs (Today / Map) reload when visited,
    // but DON'T change the active tab — the knocker stays on the form to add
    // the next lead. The form shows its own success toast.
    setRefreshSignal((n) => n + 1);
  }, []);

  // Loading state during localStorage hydration
  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Force identification on first visit
  if (!knocker) {
    return <KnockerGate onSelect={setKnocker} />;
  }

  return (
    <>
      {/* Top bar with knocker chip — present on all tabs */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-gray-900">
            {tab === "add" && "Nouveau lead"}
            {tab === "today" && "Aujourd'hui"}
            {tab === "map" && "Carte"}
            {tab === "sectors" && "Secteurs"}
          </h1>
          <button
            onClick={() => {
              if (confirm(`Changer d'utilisateur ? Tu es ${knocker.name}.`)) {
                clearKnocker();
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-bold text-gray-700"
          >
            <div className="w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center text-[10px]">
              {knocker.name.charAt(0)}
            </div>
            {knocker.name}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* ─── ADD ─────────────────────────────────────── */}
        {tab === "add" && (
          <LeadForm
            knockerId={knocker.id}
            onSubmitted={handleLeadSubmitted}
          />
        )}

        {/* ─── TODAY ─────────────────────────────────── */}
        {tab === "today" && (
          <LeadsList knocker={knocker} refreshSignal={refreshSignal} />
        )}

        {/* ─── MAP ────────────────────────────────────── */}
        {tab === "map" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {mapLeads.length} lead{mapLeads.length > 1 ? "s" : ""} aujourd&apos;hui
              </p>
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setMapScope("mine")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    mapScope === "mine"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  Les miens
                </button>
                <button
                  onClick={() => setMapScope("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    mapScope === "all"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  Équipe
                </button>
              </div>
            </div>
            {mapLoading ? (
              <div className="text-center py-10 text-gray-400">Chargement de la carte...</div>
            ) : (
              <ProspectionMap leads={mapLeads} />
            )}
          </div>
        )}

        {/* ─── SECTORS ────────────────────────────────── */}
        {tab === "sectors" && <SectorList knocker={knocker} />}
      </main>

      <BottomNav tab={tab} onChange={setTab} />
    </>
  );
}
