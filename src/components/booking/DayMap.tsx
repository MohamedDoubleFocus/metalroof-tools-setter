"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { CalendarEvent } from "@/types/booking";

interface Props {
  events: CalendarEvent[];
}

export default function DayMap({ events }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const initialized = useRef(false);

  const locatedEvents = events.filter((e) => e.lat && e.lng);

  useEffect(() => {
    if (!mapRef.current || locatedEvents.length === 0) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setMapError("Cle API Google Maps manquante (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)");
      return;
    }

    async function initMap() {
      try {
        if (!initialized.current) {
          setOptions({ key: apiKey! });
          initialized.current = true;
        }

        const { Map } = (await importLibrary("maps")) as google.maps.MapsLibrary;

        const bounds = new google.maps.LatLngBounds();

        const map = new Map(mapRef.current!, {
          zoom: 11,
          center: { lat: locatedEvents[0].lat!, lng: locatedEvents[0].lng! },
        });

        const path: google.maps.LatLngLiteral[] = [];

        locatedEvents.forEach((evt, idx) => {
          const pos = { lat: evt.lat!, lng: evt.lng! };
          bounds.extend(pos);
          path.push(pos);

          new google.maps.Marker({
            position: pos,
            map,
            label: {
              text: String(idx + 1),
              color: "white",
              fontWeight: "bold",
            },
            title: evt.summary,
          });
        });

        if (path.length > 1) {
          new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: "#9C082D",
            strokeOpacity: 0.8,
            strokeWeight: 3,
            map,
          });
        }

        map.fitBounds(bounds, 50);
      } catch {
        setMapError("Erreur lors du chargement de Google Maps");
      }
    }

    initMap();
  }, [locatedEvents]);

  if (locatedEvents.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400">
        Aucun rendez-vous avec une adresse localisable pour cette journee.
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
        {mapError}
      </div>
    );
  }

  return (
    <div ref={mapRef} className="w-full h-[500px] rounded-xl border border-gray-200" />
  );
}
