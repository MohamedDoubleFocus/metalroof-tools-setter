import { NextRequest, NextResponse } from "next/server";
import {
  PORTAL_COOKIE,
  PASS_COOKIE_MAX_AGE_SECONDS,
  expectedPortalCookieValue,
  isPortalPasscodeCorrect,
} from "@/lib/auth-gate";

export const runtime = "nodejs";

/**
 * POST /api/auth/portal-passcode
 *
 * Verifies the submitted freelancer passcode against FREELANCER_PASSCODE.
 * On success, sets the signed PORTAL_COOKIE that the middleware checks on
 * subsequent requests on the freelancer-facing domain.
 *
 * Body: { code: string }
 */
export async function POST(request: NextRequest) {
  if (!process.env.FREELANCER_PASSCODE) {
    return NextResponse.json(
      { error: "FREELANCER_PASSCODE non configuré côté serveur" },
      { status: 500 }
    );
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const code = (body.code || "").trim();
  if (!code) {
    return NextResponse.json({ error: "Code requis" }, { status: 400 });
  }

  if (!isPortalPasscodeCorrect(code)) {
    // Slow brute force without making real users wait too long.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Code incorrect" }, { status: 401 });
  }

  const token = await expectedPortalCookieValue();
  const response = NextResponse.json({ success: true });
  response.cookies.set(PORTAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PASS_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

/** DELETE — manual sign-out, clears the cookie. */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(PORTAL_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
