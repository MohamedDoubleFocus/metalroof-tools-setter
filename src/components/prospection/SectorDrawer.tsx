"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import type { LatLng } from "@/types/prospection";

interface Props {
  onSave: (data: { name: string; polygon: LatLng[] }) => Promise<void> | void;
  onCancel?: () => void;
  initialCenter?: LatLng;
}

/**
 * Map view with Google Drawing Manager — lets the user draw a single polygon
 * over a neighborhood. Tap once to start, click each corner, double-click last
 * to close.
 *
 * Once drawn, the user can clear & redo, or save with a name.
 */
export default function SectorDrawer({
  onSave,
  onCancel,
  initialCenter,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const [polygonCoords, setPolygonCoords] = useState<LatLng[] | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Clé Google Maps manquante");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setOptions({ key: apiKey });
        const [{ Map }, drawing] = await Promise.all([
          importLibrary("maps") as Promise<google.maps.MapsLibrary>,
          importLibrary("drawing") as Promise<google.maps.DrawingLibrary>,
        ]);

        if (cancelled || !mapRef.current) return;

        // Try geolocation for initial center; fallback to provided or Montreal
        const fallbackCenter = initialCenter || { lat: 45.5017, lng: -73.5673 };
        const map = new Map(mapRef.current, {
          zoom: 16,
          center: fallbackCenter,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        // Try to refine center via geolocation (non-blocking)
        if (!initialCenter && typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              map.setCenter({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
              map.setZoom(17);
            },
            undefined,
            { timeout: 8000, maximumAge: 60000 }
          );
        }

        const dm = new drawing.DrawingManager({
          drawingMode: drawing.OverlayType.POLYGON,
          drawingControl: false,
          polygonOptions: {
            strokeColor: "#9C082D",
            strokeOpacity: 0.9,
            strokeWeight: 2,
            fillColor: "#9C082D",
            fillOpacity: 0.15,
            editable: true,
            draggable: false,
          },
          map,
        });
        drawingManagerRef.current = dm;

        dm.addListener("polygoncomplete", (poly: google.maps.Polygon) => {
          // Only allow a single polygon — clear any previous one
          if (polygonRef.current) polygonRef.current.setMap(null);
          polygonRef.current = poly;

          // Stop draw mode once we have a polygon
          dm.setDrawingMode(null);

          const updateCoords = () => {
            const path = poly.getPath();
            const out: LatLng[] = [];
            for (let i = 0; i < path.getLength(); i++) {
              const p = path.getAt(i);
              out.push({ lat: p.lat(), lng: p.lng() });
            }
            setPolygonCoords(out);
          };

          updateCoords();
          // Listen for edits
          poly.getPath().addListener("set_at", updateCoords);
          poly.getPath().addListener("insert_at", updateCoords);
          poly.getPath().addListener("remove_at", updateCoords);
        });
      } catch {
        setError("Erreur de chargement du dessin Google Maps");
      }
    })();

    return () => {
      cancelled = true;
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
        polygonRef.current = null;
      }
      drawingManagerRef.current?.setMap(null);
    };
  }, [initialCenter]);

  const handleClear = () => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }
    setPolygonCoords(null);
    drawingManagerRef.current?.setDrawingMode(
      google.maps.drawing.OverlayType.POLYGON
    );
  };

  const canSave = polygonCoords !== null && name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!polygonCoords || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), polygon: polygonCoords });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur sauvegarde");
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom du secteur (ex: Saint-Lambert Centre)"
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
      />

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
        <span className="font-semibold">📍 Comment dessiner :</span> Clique sur
        chaque coin du pâté de maisons. Termine avec un double-clic ou en
        cliquant sur le premier point. On va lister automatiquement toutes les
        rues à l&apos;intérieur.
      </div>

      <div
        ref={mapRef}
        className="w-full h-[calc(100vh-380px)] sm:h-[500px] rounded-2xl border border-gray-200"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={!polygonCoords}
          className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50"
        >
          Recommencer
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
          >
            Annuler
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent-light disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {saving ? "Création..." : "Enregistrer"}
        </button>
      </div>

      {polygonCoords && (
        <p className="text-xs text-gray-500 text-center">
          Polygone : {polygonCoords.length} points
        </p>
      )}
    </div>
  );
}
