import { NextResponse } from "next/server";
import { requireAuth, respondError } from "@/lib/auth/can";

export const runtime = "nodejs";

/**
 * GET /api/me
 *
 * Returns the current user's profile (id, email, role, team, fullName).
 * Used by client components for role-based conditional UI.
 */
export async function GET() {
  try {
    const profile = await requireAuth();
    return NextResponse.json({ profile });
  } catch (err) {
    return respondError(err);
  }
}
