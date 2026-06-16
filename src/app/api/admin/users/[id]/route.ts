import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, respondError } from "@/lib/auth/can";
import { supabase as admin } from "@/lib/supabase";
import { CHANTIER_TEAMS, type ChantierTeam } from "@/types/chantiers";

export const runtime = "nodejs";

const VALID_ROLES = new Set(["admin", "foreman", "sdr"]);
const VALID_TEAMS = new Set<ChantierTeam>(CHANTIER_TEAMS);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireAdmin();
    const { id } = await params;

    let body: {
      fullName?: string | null;
      role?: string;
      team?: string | null;
      password?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
    }

    // Safety: an admin shouldn't be able to revoke their own admin role
    if (id === me.id && body.role && body.role !== "admin") {
      return NextResponse.json(
        { error: "Tu ne peux pas retirer ton propre rôle admin" },
        { status: 400 }
      );
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.fullName !== undefined)
      patch.full_name = body.fullName?.trim() || null;
    if (body.role !== undefined) {
      if (!VALID_ROLES.has(body.role)) {
        return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
      }
      patch.role = body.role;
    }
    if (body.team !== undefined) {
      if (body.team === null) patch.team = null;
      else if (VALID_TEAMS.has(body.team as ChantierTeam)) patch.team = body.team;
      else {
        return NextResponse.json({ error: "Équipe invalide" }, { status: 400 });
      }
    }

    const { data, error } = await admin
      .from("profiles")
      .update(patch)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Optional: reset password
    if (body.password && body.password.length >= 8) {
      const { error: pwErr } = await admin.auth.admin.updateUserById(id, {
        password: body.password,
      });
      if (pwErr) {
        return NextResponse.json(
          {
            user: data,
            warning: `Profil mis à jour mais erreur reset password: ${pwErr.message}`,
          },
          { status: 207 }
        );
      }
    }

    return NextResponse.json({ user: data });
  } catch (err) {
    return respondError(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireAdmin();
    const { id } = await params;

    if (id === me.id) {
      return NextResponse.json(
        { error: "Tu ne peux pas supprimer ton propre compte" },
        { status: 400 }
      );
    }

    // Delete profile first, then auth user (cascade on FK from profiles.id)
    const { error: profErr } = await admin
      .from("profiles")
      .delete()
      .eq("id", id);
    if (profErr) throw new Error(profErr.message);

    const { error: authErr } = await admin.auth.admin.deleteUser(id);
    if (authErr) {
      // Profile is already gone — log the error but consider it deleted.
      console.error("[admin/users delete] auth.admin.deleteUser:", authErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return respondError(err);
  }
}
