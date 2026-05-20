"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

export interface AddressValue {
  address: string; // formatted full address
  streetName: string; // route component
  houseNumber: string;
  lat: number;
  lng: number;
}

interface Props {
  value: AddressValue | null;
  onChange: (value: AddressValue | null) => void;
  /** Initial bounds bias (e.g. center on user's region) */
  biasCenter?: { lat: number; lng: number };
}

/**
 * Combined input:
 *   1) "📍 Detect my location" button → geolocates the device, calls
 *      /api/prospection/reverse-geocode, pre-fills the street name. The
 *      knocker just types the civic number after.
 *   2) Google Places Autocomplete on the street field — restricted to Canada,
 *      so suggestions stay tight to Québec municipalities.
 *
 * The geolocation path is the FAST path most knockers will use in the field;
 * the autocomplete is the FALLBACK when geo is denied or inaccurate.
 */

let googleLoaded = false;
let googleLoading: Promise<typeof google.maps> | null = null;

async function loadGoogleMaps(): Promise<typeof google.maps> {
  if (googleLoaded && typeof google !== "undefined") return google.maps;
  if (googleLoading) return googleLoading;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY missing");
  }

  googleLoading = (async () => {
    setOptions({ key });
    await importLibrary("places");
    googleLoaded = true;
    return google.maps;
  })();

  return googleLoading;
}

export default function AddressAutocomplete({
  value,
  onChange,
  biasCenter,
}: Props) {
  const [streetInput, setStreetInput] = useState(value?.streetName ?? "");
  const [houseInput, setHouseInput] = useState(value?.houseNumber ?? "");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [autocompleteReady, setAutocompleteReady] = useState(false);
  const streetInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Refs to read the latest input values from inside Google's place_changed
  // listener — the listener is registered once at mount and would otherwise
  // capture stale values via closure.
  const houseInputRef = useRef(houseInput);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    houseInputRef.current = houseInput;
  }, [houseInput]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync inputs when parent resets the value (e.g. form reset after submit)
  useEffect(() => {
    setStreetInput(value?.streetName ?? "");
    setHouseInput(value?.houseNumber ?? "");
  }, [value]);

  // Initialize Google Places Autocomplete on the street input
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadGoogleMaps();
        if (cancelled || !streetInputRef.current) return;

        const ac = new google.maps.places.Autocomplete(streetInputRef.current, {
          componentRestrictions: { country: "ca" },
          fields: ["address_components", "formatted_address", "geometry"],
          types: ["address"],
        });

        if (biasCenter) {
          const bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(biasCenter.lat - 0.1, biasCenter.lng - 0.1),
            new google.maps.LatLng(biasCenter.lat + 0.1, biasCenter.lng + 0.1)
          );
          ac.setBounds(bounds);
        }

        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (!place.geometry?.location) return;

          const comps = place.address_components ?? [];
          const streetNumber =
            comps.find((c) => c.types.includes("street_number"))?.long_name ??
            "";
          const route =
            comps.find((c) => c.types.includes("route"))?.long_name ?? "";

          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          // CRITICAL: read latest house input via ref (not closure)
          const currentHouse = houseInputRef.current;
          // Prefer what the user already typed; only fall back to Google's value
          // if the user hasn't typed anything yet.
          const finalHouse = currentHouse?.trim() ? currentHouse : streetNumber;

          setStreetInput(route);
          if (!currentHouse?.trim() && streetNumber) {
            setHouseInput(streetNumber);
          }

          onChangeRef.current({
            address:
              finalHouse && route
                ? `${finalHouse} ${route}`
                : (place.formatted_address ?? route),
            streetName: route,
            houseNumber: finalHouse,
            lat,
            lng,
          });
        });

        autocompleteRef.current = ac;
        setAutocompleteReady(true);
      } catch {
        // Autocomplete unavailable — user can still use manual + geo
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDetectLocation = useCallback(async () => {
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          const res = await fetch("/api/prospection/reverse-geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Géocodage inverse échoué");
          }
          const data = await res.json();
          setStreetInput(data.streetName || "");
          // Pre-fill house number only if geocoder gave one. Most of the time
          // it doesn't (we're standing on the sidewalk, not on a numbered point),
          // so we leave the house field for the knocker to type manually.
          if (data.houseNumber) setHouseInput(data.houseNumber);

          onChange({
            address: data.formattedAddress,
            streetName: data.streetName,
            houseNumber: data.houseNumber || houseInput,
            lat,
            lng,
          });
        } catch (err) {
          setGeoError(
            err instanceof Error ? err.message : "Erreur géocodage inverse"
          );
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError(
            "Permission refusée. Active la géolocalisation dans ton navigateur."
          );
        } else if (err.code === err.TIMEOUT) {
          setGeoError("Délai dépassé. Réessaie ou tape l'adresse à la main.");
        } else {
          setGeoError("Impossible d'obtenir ta position.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [houseInput, onChange]);

  // When user manually edits the house number, merge it back into the value
  // (only if we have a street already locked in via geo/autocomplete)
  const handleHouseChange = useCallback(
    (val: string) => {
      setHouseInput(val);
      if (value && value.lat && value.lng) {
        onChange({
          ...value,
          houseNumber: val,
          address: val
            ? `${val} ${value.streetName}`.trim()
            : value.streetName,
        });
      }
    },
    [value, onChange]
  );

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleDetectLocation}
        disabled={geoLoading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-white rounded-xl font-semibold text-sm hover:bg-accent-light transition-colors disabled:bg-gray-300"
      >
        {geoLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Détection en cours...
          </>
        ) : (
          <>
            <span className="text-base">📍</span>
            Détecter ma position
          </>
        )}
      </button>

      {geoError && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-xs">
          {geoError}
        </div>
      )}

      <div className="text-xs text-gray-400 text-center">— ou —</div>

      <div className="grid grid-cols-[110px_1fr] gap-2">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            N° civique
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={houseInput}
            onChange={(e) => handleHouseChange(e.target.value)}
            placeholder="1234"
            className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Rue {!autocompleteReady && "(chargement...)"}
          </label>
          <input
            ref={streetInputRef}
            type="text"
            value={streetInput}
            onChange={(e) => setStreetInput(e.target.value)}
            placeholder="Saint-Denis"
            className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {value && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
          <span className="font-semibold">Adresse confirmée :</span>{" "}
          {value.address}
        </div>
      )}
    </div>
  );
}
