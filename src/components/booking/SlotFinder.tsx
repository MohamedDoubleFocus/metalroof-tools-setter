"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import SlotSuggestionCard from "./SlotSuggestionCard";
import { SlotSuggestion } from "@/types/booking";
import { getSettings } from "@/lib/booking/settings";

export default function SlotFinder() {
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SlotSuggestion[]>([]);
  const [daysScanned, setDaysScanned] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const apiInitialized = useRef(false);

  // Wire up Google Places Autocomplete to the address input
  useEffect(() => {
    if (!inputRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      // Autocomplete will simply not load; the field still works as plain text input.
      return;
    }

    let cancelled = false;
    let listener: google.maps.MapsEventListener | null = null;

    async function init() {
      try {
        if (!apiInitialized.current) {
          setOptions({ key: apiKey! });
          apiInitialized.current = true;
        }
        const { Autocomplete } = (await importLibrary(
          "places"
        )) as google.maps.PlacesLibrary;
        if (cancelled || !inputRef.current) return;

        const ac = new Autocomplete(inputRef.current, {
          componentRestrictions: { country: "ca" },
          fields: ["formatted_address", "geometry"],
          types: ["address"],
        });

        listener = ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (place.geometry?.location) {
            setCoords({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            });
          }
          if (place.formatted_address) {
            setAddress(place.formatted_address);
          }
        });
      } catch {
        // silent — fall back to plain input
      }
    }

    init();

    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, []);

  // If the user types after picking a place, invalidate the cached coords
  // so we don't book against the wrong address.
  const handleManualChange = (val: string) => {
    setAddress(val);
    setCoords(null);
  };

  const handleSearch = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setDaysScanned(null);

    try {
      const settings = getSettings();
      const res = await fetch("/api/booking/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          coords: coords ?? undefined,
          settings,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      setSuggestions(data.suggestions);
      setDaysScanned(data.daysScanned);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          ref={inputRef}
          type="text"
          value={address}
          onChange={(e) => handleManualChange(e.target.value)}
          placeholder="Adresse du nouveau client..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          autoComplete="off"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !address.trim()}
          className="px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent-light transition-colors disabled:opacity-50"
        >
          {loading ? "Analyse en cours..." : "Chercher"}
        </button>
      </div>

      {coords && (
        <p className="text-xs text-gray-400 -mt-3">
          Adresse localisée : {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </p>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Analyse des 15 prochains jours en cours...
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {daysScanned !== null && !loading && (
        <p className="text-sm text-gray-500">
          {suggestions.length} creneaux trouves sur les {daysScanned} prochains jours
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <SlotSuggestionCard key={`${s.date}-${s.startTime}`} suggestion={s} rank={i + 1} />
          ))}
        </div>
      )}

      {daysScanned !== null && suggestions.length === 0 && !loading && (
        <p className="text-sm text-gray-500">
          Aucun creneau disponible dans les 15 prochains jours pour cette adresse.
        </p>
      )}
    </div>
  );
}
