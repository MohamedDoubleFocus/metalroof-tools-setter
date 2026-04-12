import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/kie-ai";

export const runtime = "nodejs";

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Adresse requise" },
        { status: 400 }
      );
    }

    // Step 1: Geocode address → lat/lng
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_KEY}`;
    const geocodeRes = await fetch(geocodeUrl);
    const geocodeData = await geocodeRes.json();

    if (
      geocodeData.status !== "OK" ||
      !geocodeData.results ||
      geocodeData.results.length === 0
    ) {
      return NextResponse.json(
        { error: "Adresse introuvable. Vérifiez l'adresse et réessayez." },
        { status: 404 }
      );
    }

    const { lat, lng } = geocodeData.results[0].geometry.location;

    // Step 2: Check Street View coverage (free metadata call)
    const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_KEY}`;
    const metadataRes = await fetch(metadataUrl);
    const metadataData = await metadataRes.json();

    if (metadataData.status !== "OK") {
      return NextResponse.json(
        {
          error:
            "Aucune image Street View disponible pour cette adresse. Essayez de télécharger une photo manuellement.",
        },
        { status: 404 }
      );
    }

    // Step 3: Get Street View image
    const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x640&location=${lat},${lng}&pitch=-10&fov=80&key=${GOOGLE_KEY}&return_error_code=true`;
    const imageRes = await fetch(streetViewUrl);

    if (!imageRes.ok) {
      return NextResponse.json(
        { error: "Erreur lors de la récupération de l'image Street View." },
        { status: 500 }
      );
    }

    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    // Step 4: Upload to Kie.AI
    const imageUrl = await uploadImage(imageBuffer, "streetview.jpg");

    // Return both the preview (Street View direct URL) and the Kie.AI URL
    // For preview, we use the same Street View URL (smaller size for display)
    const previewUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${lat},${lng}&pitch=-10&fov=80&key=${GOOGLE_KEY}`;

    return NextResponse.json({ imageUrl, previewUrl });
  } catch (error) {
    console.error("Street View error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la recherche Street View",
      },
      { status: 500 }
    );
  }
}
