import { NextRequest, NextResponse } from "next/server";
import { requireSDROrAdmin, respondError } from "@/lib/auth/can";

export const runtime = "nodejs";

/**
 * POST /api/prospection/reverse-geocode
 *
 * Body: { lat: number, lng: number }
 *
 * Calls Google Geocoding API server-side (so the GOOGLE_MAPS_API_KEY stays
 * private). Returns the parsed street name + house number + formatted address.
 *
 * Used by the "Detect my location" button on the lead form: the knocker is
 * standing in front of the house, taps the button, and the street is
 * pre-filled. They just need to type the civic number.
 */
export async function POST(request: NextRequest) {
  try {
    await requireSDROrAdmin();
  } catch (err) {
    return respondError(err);
  }
  let body: { lat?: number; lng?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { lat, lng } = body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json(
      { error: "lat et lng requis (numbers)" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY non configure" },
      { status: 500 }
    );
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=fr&result_type=street_address|premise|route&key=${apiKey}`;

  let data: {
    status: string;
    results?: Array<{
      formatted_address: string;
      address_components?: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
    }>;
  };

  try {
    const res = await fetch(url);
    data = await res.json();
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Erreur reseau Google: " +
          (err instanceof Error ? err.message : "inconnu"),
      },
      { status: 502 }
    );
  }

  if (data.status !== "OK" || !data.results?.[0]) {
    return NextResponse.json(
      {
        error: `Geocodage echoue (${data.status})`,
      },
      { status: 404 }
    );
  }

  const first = data.results[0];
  const components = first.address_components ?? [];

  const streetNumber =
    components.find((c) => c.types.includes("street_number"))?.long_name ??
    "";
  const route =
    components.find((c) => c.types.includes("route"))?.long_name ?? "";

  return NextResponse.json({
    streetName: route,
    houseNumber: streetNumber,
    formattedAddress: first.formatted_address,
    lat,
    lng,
  });
}
