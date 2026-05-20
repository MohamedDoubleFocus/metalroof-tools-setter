import { NextRequest, NextResponse } from "next/server";
import {
  createSector,
  listSectors,
  createStreetsBulk,
  setSectorStreetIds,
} from "@/lib/prospection/kv";
import { fetchStreetsInPolygon } from "@/lib/prospection/overpass";
import { getKnockerById } from "@/lib/prospection/knockers";
import type { CreateSectorInput, LatLng } from "@/types/prospection";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/prospection/sectors
 * Returns all sectors (light — without their full street list).
 */
export async function GET() {
  try {
    const sectors = await listSectors();
    return NextResponse.json({ sectors });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prospection/sectors
 *
 * Body:
 *   { name: string, polygon: LatLng[], knockerId: string }
 *
 * Flow:
 *   1. Validate input
 *   2. Create the sector in Redis
 *   3. Query Overpass API for streets inside the polygon
 *   4. Store streets, link them back to the sector
 *   5. Return the sector + the street count
 */
export async function POST(request: NextRequest) {
  let body: Partial<CreateSectorInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name requis" }, { status: 400 });
  }
  if (!body.knockerId || !getKnockerById(body.knockerId)) {
    return NextResponse.json(
      { error: "knockerId requis et valide" },
      { status: 400 }
    );
  }
  if (
    !Array.isArray(body.polygon) ||
    body.polygon.length < 3 ||
    !body.polygon.every(
      (p) =>
        typeof (p as LatLng).lat === "number" &&
        typeof (p as LatLng).lng === "number"
    )
  ) {
    return NextResponse.json(
      { error: "polygon doit etre un tableau de >=3 points {lat,lng}" },
      { status: 400 }
    );
  }

  try {
    // 1. Create sector (empty street list for now)
    const sector = await createSector({
      name: body.name,
      polygon: body.polygon as LatLng[],
      knockerId: body.knockerId,
    });

    // 2. Query Overpass API
    let osmStreets;
    try {
      osmStreets = await fetchStreetsInPolygon(body.polygon as LatLng[]);
    } catch (err) {
      // Sector is created but Overpass failed — return so user can see the polygon
      return NextResponse.json({
        sector,
        streetCount: 0,
        warning:
          "Secteur cree mais la liste de rues n'a pas pu etre recuperee : " +
          (err instanceof Error ? err.message : "erreur OSM"),
      });
    }

    // 3. Store streets and link them to the sector
    if (osmStreets.length > 0) {
      const streetIds = await createStreetsBulk(sector.id, osmStreets);
      await setSectorStreetIds(sector.id, streetIds);
      sector.streetIds = streetIds;
    }

    return NextResponse.json({
      sector,
      streetCount: osmStreets.length,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Erreur creation secteur",
      },
      { status: 500 }
    );
  }
}
