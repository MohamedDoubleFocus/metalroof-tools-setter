import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Supabase Auth callback for email confirmations + magic links.
 *
 * Currently we only use email+password (no email verification in v1), so
 * this handler is rarely hit. Kept around for when we enable magic link
 * password reset in a future iteration.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
