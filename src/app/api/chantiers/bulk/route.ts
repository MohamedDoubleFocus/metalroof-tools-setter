import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createChantier, setChantierFields } from "@/lib/chantiers/kv";
import { normalizePhoneE164 } from "@/lib/codes";
import { geocodeAddress } from "@/lib/chantiers/geocode";
import type {
  ChantierStyle,
  ChantierUrgency,
  CreateChantierInput,
} from "@/types/chantiers";

export const runtime = "nodejs";
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_STYLES = new Set<ChantierStyle>(["shingle_tile", "standing_seam"]);
const VALID_URGENCY = new Set<ChantierUrgency>(["urgent", "non_urgent"]);

interface BulkItem {
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  addressLine1?: string;
  addressLine2?: string;
  submissionUrl?: string;
  style?: string;
  colorKey?: string;
  urgency?: string;
  signedAt?: number | string;
  scheduledDate?: string;
  totalAmount?: number;
  notes?: string;
}

interface BulkResult {
  index: number;
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * POST /api/chantiers/bulk
 *
 * Body: { items: BulkItem[] }
 * Returns: { results: BulkResult[], successCount, errorCount }
 *
 * Same validation as POST /api/chantiers but per-row, so a single bad row
 * doesn't kill the rest. Closer cookie required (middleware).
 */
export async function POST(request: NextRequest) {
  let body: { items?: BulkItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "items doit être un tableau non-vide" },
      { status: 400 }
    );
  }
  if (body.items.length > 500) {
    return NextResponse.json(
      { error: "Limite 500 chantiers par requête. Découpe en plusieurs lots." },
      { status: 400 }
    );
  }

  const results: BulkResult[] = [];

  // Sequential — Redis writes are cheap enough and we want predictable order
  // (no contention on the `chantiers:all` list).
  for (let i = 0; i < body.items.length; i++) {
    const item = body.items[i];
    try {
      const clientName = (item.clientName || "").trim();
      if (!clientName) throw new Error("clientName requis");

      const phone = normalizePhoneE164((item.clientPhone || "").trim());
      if (!phone) throw new Error("clientPhone invalide");

      const email = (item.clientEmail || "").trim().toLowerCase();
      if (email && !EMAIL_RE.test(email)) throw new Error("clientEmail invalide");

      const addressLine1 = (item.addressLine1 || "").trim();
      if (!addressLine1) throw new Error("addressLine1 requis");
      const addressLine2 = (item.addressLine2 || "").trim();

      let signedAt: number | undefined;
      if (typeof item.signedAt === "number") {
        signedAt = item.signedAt;
      } else if (typeof item.signedAt === "string") {
        const parsed = Date.parse(item.signedAt);
        if (!Number.isNaN(parsed)) signedAt = parsed;
      }

      const style =
        item.style && VALID_STYLES.has(item.style as ChantierStyle)
          ? (item.style as ChantierStyle)
          : undefined;
      const urgency =
        item.urgency && VALID_URGENCY.has(item.urgency as ChantierUrgency)
          ? (item.urgency as ChantierUrgency)
          : undefined;

      const input: CreateChantierInput = {
        clientName,
        clientPhone: phone,
        clientEmail: email || undefined,
        addressLine1,
        addressLine2: addressLine2 || undefined,
        submissionUrl: item.submissionUrl,
        style,
        colorKey: item.colorKey,
        urgency,
        signedAt,
        scheduledDate: item.scheduledDate,
        totalAmount: item.totalAmount,
        notes: item.notes,
      };

      const chantier = await createChantier(input);
      results.push({ index: i, ok: true, id: chantier.id });
    } catch (err) {
      results.push({
        index: i,
        ok: false,
        error: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }
  }

  const successCount = results.filter((r) => r.ok).length;

  // Background-geocode all newly created chantiers. Doesn't block the response.
  const createdIds = results
    .filter((r): r is BulkResult & { ok: true; id: string } => r.ok && !!r.id)
    .map((r, idx) => ({ id: r.id, item: body.items![results[idx].index] }));
  after(async () => {
    for (const { id, item } of createdIds) {
      const a1 = (item.addressLine1 || "").trim();
      const a2 = (item.addressLine2 || "").trim();
      if (!a1) continue;
      const coords = await geocodeAddress(a1, a2 || undefined);
      if (coords) {
        await setChantierFields(id, coords);
      }
    }
  });

  return NextResponse.json({
    results,
    successCount,
    errorCount: results.length - successCount,
  });
}
