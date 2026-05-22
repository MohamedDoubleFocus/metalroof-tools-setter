import { NextRequest, NextResponse } from "next/server";
import {
  PASS_COOKIE,
  PASS_COOKIE_MAX_AGE_SECONDS,
  expectedCookieValue,
  isPasscodeCorrect,
} from "@/lib/auth-gate";

export const runtime = "nodejs";

/**
 * POST /api/auth/passcode
 *
 * Verifies the submitted shared passcode against APP_PASSCODE. On success,
 * sets the signed cookie that the middleware checks on subsequent requests.
 *
 * Body: { code: string }
 */
export async function POST(request: NextRequest) {
  if (!process.env.APP_PASSCODE) {
    return NextResponse.json(
      { error: "APP_PASSCODE non configuré côté serveur" },
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

  if (!isPasscodeCorrect(code)) {
    // Tiny delay to slow down brute-force a bit. Combined with the 6-char
    // numeric passcode, this remains acceptable for an internal tool.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Code incorrect" }, { status: 401 });
  }

  const token = await expectedCookieValue();
  const response = NextResponse.json({ success: true });
  response.cookies.set(PASS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PASS_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

/**
 * DELETE /api/auth/passcode — manual lock (clears the cookie).
 * Not wired into the UI yet but available for future "Verrouiller" button.
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(PASS_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
