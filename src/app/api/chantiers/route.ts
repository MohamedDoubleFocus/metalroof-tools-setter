import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import {
  createChantier,
  listAllChantiers,
  setChantierFields,
} from "@/lib/chantiers/kv";
import { normalizePhoneE164 } from "@/lib/codes";
import { geocodeAddress } from "@/lib/chantiers/geocode";
import {
  requireAdmin,
  requireForemanOrAdmin,
  respondError,
} from "@/lib/auth/can";
import {
  CHANTIER_TEAMS,
  type ChantierTeam,
  type CreateChantierInput,
} from "@/types/chantiers";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_STYLES = new Set(["shingle_tile", "standing_seam"]);
const VALID_URGENCY = new Set(["urgent", "non_urgent"]);
const VALID_TEAMS = new Set<ChantierTeam>(CHANTIER_TEAMS);

export async function GET() {
  try {
    await requireForemanOrAdmin();
    const chantiers = await listAllChantiers();

    // Background backfill: any chantier missing lat/lng gets geocoded after
    // the response. Doesn't slow the list call; first map open after this
    // will see most/all coords filled in.
    after(async () => {
      const missing = chantiers.filter(
        (c) => (c.lat == null || c.lng == null) && c.addressLine1
      );
      for (const c of missing) {
        const coords = await geocodeAddress(c.addressLine1, c.addressLine2);
        if (coords) {
          await setChantierFields(c.id, coords);
        }
      }
    });

    return NextResponse.json({ chantiers });
  } catch (err) {
    return respondError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    return respondError(err);
  }
  let body: Partial<CreateChantierInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const clientName = (body.clientName || "").trim();
  if (!clientName) {
    return NextResponse.json(
      { error: "Nom du client requis" },
      { status: 400 }
    );
  }

  const phone = normalizePhoneE164((body.clientPhone || "").trim());
  if (!phone) {
    return NextResponse.json(
      { error: "Numéro de téléphone invalide" },
      { status: 400 }
    );
  }

  const email = (body.clientEmail || "").trim().toLowerCase();
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Email invalide" },
      { status: 400 }
    );
  }

  const addressLine1 = (body.addressLine1 || "").trim();
  if (!addressLine1) {
    return NextResponse.json(
      { error: "Adresse requise" },
      { status: 400 }
    );
  }
  const addressLine2 = (body.addressLine2 || "").trim();

  const style =
    body.style && VALID_STYLES.has(body.style) ? body.style : undefined;
  const urgency =
    body.urgency && VALID_URGENCY.has(body.urgency) ? body.urgency : undefined;
  const team =
    body.team && VALID_TEAMS.has(body.team as ChantierTeam)
      ? (body.team as ChantierTeam)
      : undefined;

  try {
    const chantier = await createChantier({
      clientName,
      clientPhone: phone,
      clientEmail: email || undefined,
      addressLine1,
      addressLine2: addressLine2 || undefined,
      submissionUrl: body.submissionUrl,
      roofrUrl: body.roofrUrl,
      style,
      colorKey: body.colorKey,
      urgency,
      team,
      signedAt: body.signedAt,
      scheduledDate: body.scheduledDate,
      priority: body.priority,
      totalAmount: body.totalAmount,
      notes: body.notes,
    });

    // Geocode in the background — never blocks the response.
    after(async () => {
      const coords = await geocodeAddress(addressLine1, addressLine2);
      if (coords) {
        await setChantierFields(chantier.id, coords);
      }
    });

    return NextResponse.json({ chantier });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Erreur création chantier",
      },
      { status: 500 }
    );
  }
}
