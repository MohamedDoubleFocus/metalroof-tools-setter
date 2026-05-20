"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { statusColorHex } from "./StatusPills";
import type { Lead, Sector, Street } from "@/types/prospection";

interface Props {
  leads: Lead[];
  /** Optional: active sector to overlay (polygon + streets) */
  sector?: Sector | null;
  streets?: Street[];
  /** Optional callback when a street polyline is tapped */
  onStreetClick?: (street: Street) => void;
}

/**
 * Google Map showing:
 *   - One pin per lead, colored by status
 *   - Optional polygon for the active sector
 *   - Optional polylines per street (green = done, gray = todo)
 *
 * Pattern follows src/components/booking/DayMap.tsx (functional loader).
 */
export default function ProspectionMap({
  leads,
  sector = null,
  streets = [],
  onStreetClick,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<google.maps.MVCObject[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Build map once
  useEffect(() => {
    if (!mapRef.current) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Clé Google Maps manquante (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        if (!initialized.current) {
          setOptions({ key: apiKey });
          initialized.current = true;
        }
        const { Map } = (await importLibrary("maps")) as google.maps.MapsLibrary;
        if (cancelled || !mapRef.current) return;

        const center =
          leads[0]
            ? { lat: leads[0].lat, lng: leads[0].lng }
            : sector?.polygon[0]
              ? sector.polygon[0]
              : { lat: 45.5017, lng: -73.5673 }; // Montreal fallback

        mapInstance.current = new Map(mapRef.current, {
          zoom: 14,
          center,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
      } catch {
        setError("Erreur de chargement Google Maps");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [leads, sector]);

  // Render overlays whenever data changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear previous overlays
    overlaysRef.current.forEach((o) => {
      const m = o as unknown as { setMap?: (m: google.maps.Map | null) => void };
      m.setMap?.(null);
    });
    overlaysRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasBounds = false;

    // Sector polygon (drawn first, under everything)
    if (sector?.polygon && sector.polygon.length >= 3) {
      const poly = new google.maps.Polygon({
        paths: sector.polygon,
        strokeColor: "#9C082D",
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: "#9C082D",
        fillOpacity: 0.05,
        clickable: false,
        map,
      });
      overlaysRef.current.push(poly);
      sector.polygon.forEach((p) => {
        bounds.extend(p);
        hasBounds = true;
      });
    }

    // Street polylines
    for (const street of streets) {
      if (street.geometry.length < 2) continue;
      const done = !!street.doneAt;
      const line = new google.maps.Polyline({
        path: street.geometry,
        strokeColor: done ? "#10B981" : "#94A3B8",
        strokeOpacity: done ? 0.9 : 0.6,
        strokeWeight: done ? 5 : 3,
        clickable: !!onStreetClick,
        map,
      });
      if (onStreetClick) {
        line.addListener("click", () => onStreetClick(street));
      }
      overlaysRef.current.push(line);
    }

    // Lead pins
    for (const lead of leads) {
      const color = statusColorHex(lead.status);
      const marker = new google.maps.Marker({
        position: { lat: lead.lat, lng: lead.lng },
        map,
        title: `${lead.address}\n${lead.knockerName} — ${lead.status}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
      });
      overlaysRef.current.push(marker);
      bounds.extend({ lat: lead.lat, lng: lead.lng });
      hasBounds = true;
    }

    if (hasBounds) {
      map.fitBounds(bounds, 60);
    }
  }, [leads, sector, streets, onStreetClick]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-[calc(100vh-180px)] sm:h-[600px] rounded-2xl border border-gray-200"
    />
  );
}
