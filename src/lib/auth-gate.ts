/**
 * Passcode gate for internal tools.
 *
 * Every page/route outside of the public client portal requires a shared
 * passcode. After a successful unlock the server sets a signed cookie that
 * the middleware verifies on subsequent requests.
 *
 * Designed to work in both the Edge runtime (middleware) and the Node
 * runtime (API route) — uses Web Crypto only.
 */

export const PASS_COOKIE = "mr-pass";
/** 30 days of validity — internal team doesn't want to re-enter daily. */
export const PASS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
/** Constant signed string. Keeps the cookie opaque to brute-forcers. */
const COOKIE_PAYLOAD = "ok";

/**
 * Returns the HMAC-SHA256 hex digest of `value` keyed by `secret`.
 * Implemented with Web Crypto so it runs on both Edge and Node.
 */
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
  // Reuse the existing WEBHOOK_SECRET — adding another env var for a single
  // shared internal passcode is friction without security benefit (one secret
  // is enough since both protect the same surface).
  return process.env.WEBHOOK_SECRET || "fallback-do-not-use-in-prod";
}

/** Returns the expected cookie value for the current secret. */
export async function expectedCookieValue(): Promise<string> {
  return hmacHex(COOKIE_PAYLOAD, getSigningSecret());
}

/** Constant-time string comparison — avoids timing side-channels. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Check whether a request cookie value matches the expected signed token. */
export async function isCookieValid(
  cookieValue: string | undefined
): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await expectedCookieValue();
  return constantTimeEqual(cookieValue, expected);
}

/** Validate the submitted passcode against the env var. */
export function isPasscodeCorrect(submitted: string): boolean {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return false;
  return constantTimeEqual(submitted, expected);
}
