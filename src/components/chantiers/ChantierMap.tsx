"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import type { Chantier, ChantierStatus } from "@/types/chantiers";

const STATUS_COLOR: Record<ChantierStatus, string> = {
  scheduled: "#F59E0B", // yellow/amber
  in_progress: "#2563EB", // blue
  done: "#16A34A", // green
};

const STATUS_LABEL: Record<ChantierStatus, string> = {
  scheduled: "En attente",
  in_progress: "En cours",
  done: "Fini",
};

interface Props {
  chantiers: Chantier[];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatScheduled(date?: string): string {
  if (!date) return "Non planifié";
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("fr-CA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

export default function ChantierMap({ chantiers }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapDivRef.current) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Clé Google Maps manquante (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setOptions({ key: apiKey });
        const { Map, InfoWindow } = (await importLibrary(
          "maps"
        )) as google.maps.MapsLibrary;
        if (cancelled || !mapDivRef.current) return;

        mapRef.current = new Map(mapDivRef.current, {
          zoom: 9,
          center: { lat: 45.5017, lng: -73.5673 },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        infoWindowRef.current = new InfoWindow();
        setMapReady(true);
      } catch {
        setError("Erreur de chargement Google Maps");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Render markers whenever chantiers change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear existing markers
    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];

    const withCoords = chantiers.filter(
      (c) => typeof c.lat === "number" && typeof c.lng === "number"
    );

    if (withCoords.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    for (const c of withCoords) {
      const position = { lat: c.lat!, lng: c.lng! };
      bounds.extend(position);
      const fill = STATUS_COLOR[c.status];

      const marker = new google.maps.Marker({
        position,
        map,
        title: c.clientName,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: fill,
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
          scale: 9,
        },
        label:
          c.urgency === "urgent"
            ? {
                text: "!",
                color: "#FFFFFF",
                fontWeight: "bold",
                fontSize: "11px",
              }
            : undefined,
      });

      marker.addListener("click", () => {
        if (!infoWindowRef.current) return;
        const html = `
          <div style="font-family:Arial,sans-serif;font-size:13px;color:#111827;min-width:220px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px;">
              ${escapeHtml(c.clientName)}
              ${c.urgency === "urgent" ? '<span style="margin-left:6px;background:#fee2e2;color:#b91c1c;font-size:10px;padding:1px 6px;border-radius:4px;font-weight:bold;">URGENT</span>' : ""}
            </div>
            <div style="color:#6b7280;margin-bottom:6px;">
              ${escapeHtml(c.addressLine1)}${c.addressLine2 ? `<br/>${escapeHtml(c.addressLine2)}` : ""}
            </div>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${fill};"></span>
              <span style="font-weight:600;">${STATUS_LABEL[c.status]}</span>
            </div>
            <div style="color:#6b7280;margin-bottom:4px;">📅 ${formatScheduled(c.scheduledDate)}</div>
            <div style="color:#6b7280;margin-bottom:10px;">💰 ${formatAmount(c.totalAmount)}</div>
            <a href="/chantiers/${c.id}"
               style="display:inline-block;background:#9C082D;color:white;padding:6px 14px;border-radius:6px;text-decoration:none;font-weight:600;font-size:12px;">
              Voir la fiche →
            </a>
          </div>
        `;
        infoWindowRef.current.setContent(html);
        infoWindowRef.current.open({ anchor: marker, map });
      });

      markersRef.current.push(marker);
    }

    // Fit map to all markers (with sensible max zoom).
    map.fitBounds(bounds);
    const listener = google.maps.event.addListenerOnce(map, "idle", () => {
      if (map.getZoom() && map.getZoom()! > 14) map.setZoom(14);
    });
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [chantiers, mapReady]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        {error}
      </div>
    );
  }

  const missing = chantiers.filter((c) => c.lat == null || c.lng == null).length;

  return (
    <div className="space-y-2">
      <div
        ref={mapDivRef}
        className="w-full h-[calc(100vh-260px)] rounded-2xl border-2 border-gray-200"
      />

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR.scheduled }} />
          En attente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR.in_progress }} />
          En cours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR.done }} />
          Fini
        </span>
        <span className="flex items-center gap-1.5 text-red-700">
          <span className="w-3 h-3 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">!</span>
          Urgent
        </span>
        {missing > 0 && (
          <span className="text-gray-400 ml-auto">
            {missing} chantier{missing > 1 ? "s" : ""} sans coordonnées (géocodage en cours)
          </span>
        )}
      </div>
    </div>
  );
}
