/**
 * Google Geocoding API — turn a postal address into lat/lng.
 *
 * Server-only. Uses NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (the same key already
 * loaded client-side for Maps JS / Places). Returns null on any failure —
 * never throws — so geocoding errors can't block chantier creation.
 */

interface GeocodeResult {
  lat: number;
  lng: number;
}

export async function geocodeAddress(
  addressLine1: string,
  addressLine2?: string
): Promise<GeocodeResult | null> {
  const key =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.warn("[geocode] no API key configured — skipping");
    return null;
  }

  const address = [addressLine1, addressLine2].filter(Boolean).join(", ");
  if (!address.trim()) return null;

  const url =
    "https://maps.googleapis.com/maps/api/geocode/json" +
    `?address=${encodeURIComponent(address)}` +
    `&components=country:CA` +
    `&key=${key}`;

  try {
    const res = await fetch(url, {
      // Short timeout so we never block a request for too long.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn("[geocode] non-OK response", res.status);
      return null;
    }
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.length) {
      console.warn(
        "[geocode]",
        data.status,
        data.error_message ?? "no result"
      );
      return null;
    }
    const loc = data.results[0].geometry?.location;
    if (typeof loc?.lat !== "number" || typeof loc?.lng !== "number") {
      return null;
    }
    return { lat: loc.lat, lng: loc.lng };
  } catch (err) {
    console.warn("[geocode] fetch failed", err);
    return null;
  }
}
