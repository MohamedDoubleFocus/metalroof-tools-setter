import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, respondError } from "@/lib/auth/can";
import { supabase as admin } from "@/lib/supabase";
import { CHANTIER_TEAMS, type ChantierTeam } from "@/types/chantiers";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = new Set(["admin", "foreman", "sdr"]);
const VALID_TEAMS = new Set<ChantierTeam>(CHANTIER_TEAMS);

/**
 * GET /api/admin/users
 *
 * Returns the list of all profiles (with role + team). Admin only.
 */
export async function GET() {
  try {
    await requireAdmin();
    const { data, error } = await admin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ users: data });
  } catch (err) {
    return respondError(err);
  }
}

/**
 * POST /api/admin/users
 *
 * Body: { email, password, fullName?, role, team? }
 *
 * Creates an auth user via Supabase Admin API + inserts the profile row.
 * The new user can log in immediately with the password the admin sets.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    let body: {
      email?: string;
      password?: string;
      fullName?: string;
      role?: string;
      team?: string | null;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
    }

    const email = (body.email || "").trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Email invalide" },
        { status: 400 }
      );
    }

    const password = body.password || "";
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Mot de passe trop court (min 8 caractères)" },
        { status: 400 }
      );
    }

    const role = body.role || "";
    if (!VALID_ROLES.has(role)) {
      return NextResponse.json(
        { error: "Rôle invalide (admin / foreman / sdr)" },
        { status: 400 }
      );
    }

    const team =
      body.team && VALID_TEAMS.has(body.team as ChantierTeam)
        ? (body.team as ChantierTeam)
        : null;

    const fullName = (body.fullName || "").trim() || null;

    // 1. Create the auth user
    const { data: authData, error: authErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // skip email verification — admin trusts the email
        user_metadata: { full_name: fullName },
      });
    if (authErr || !authData.user) {
      return NextResponse.json(
        { error: authErr?.message || "Erreur création user Supabase Auth" },
        { status: 502 }
      );
    }

    // 2. Insert profile row
    const { data: profileData, error: profErr } = await admin
      .from("profiles")
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role,
        team,
      })
      .select()
      .single();

    if (profErr) {
      // Roll back the auth user to avoid orphans
      await admin.auth.admin.deleteUser(authData.user.id).catch(() => {});
      return NextResponse.json(
        { error: `Erreur création profile: ${profErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: profileData });
  } catch (err) {
    return respondError(err);
  }
}
