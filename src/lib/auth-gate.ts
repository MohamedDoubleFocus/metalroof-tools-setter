/**
 * Freelancer portal — passcode gate.
 *
 * The closer-side app now runs on Supabase Auth ([src/lib/auth/session.ts]),
 * but the white-labeled freelancer portal keeps its own shared-passcode
 * surface (different env var, different cookie, no overlap with closer auth).
 *
 * Designed to work in both the Edge runtime (middleware) and the Node
 * runtime (API route) — uses Web Crypto only.
 */

export const PORTAL_COOKIE = "rp-pass";
export const PASS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const PORTAL_COOKIE_PAYLOAD = "portal-ok";

async function hmacHex(value: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getSigningSecret(): string {
  return process.env.WEBHOOK_SECRET || "fallback-do-not-use-in-prod";
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function expectedPortalCookieValue(): Promise<string> {
  return hmacHex(PORTAL_COOKIE_PAYLOAD, getSigningSecret());
}

export async function isPortalCookieValid(
  cookieValue: string | undefined
): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await expectedPortalCookieValue();
  return constantTimeEqual(cookieValue, expected);
}

export function isPortalPasscodeCorrect(submitted: string): boolean {
  const expected = process.env.FREELANCER_PASSCODE;
  if (!expected) return false;
  return constantTimeEqual(submitted, expected);
}
