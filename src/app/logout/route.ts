import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

async function logout() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(
    new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
  );
}

export async function POST() {
  return logout();
}

export async function GET() {
  return logout();
}
