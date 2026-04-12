import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTravelTime } from "@/lib/booking/directions";
import { geocodeAddress } from "@/lib/booking/calendar";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { originLat, originLng, destLat, destLng } = await request.json();

  if (!originLat || !originLng || !destLat || !destLng) {
    return NextResponse.json(
      { error: "Coordonnees requises" },
      { status: 400 }
    );
  }

  try {
    const result = await getTravelTime(originLat, originLng, destLat, destLng);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur directions" },
      { status: 500 }
    );
  }
}

// GET for geocoding (used by settings)
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("geocode");
  if (!address) {
    return NextResponse.json({ error: "Adresse requise" }, { status: 400 });
  }

  const coords = await geocodeAddress(address);
  if (!coords) {
    return NextResponse.json({ error: "Adresse introuvable" }, { status: 404 });
  }

  return NextResponse.json(coords);
}
