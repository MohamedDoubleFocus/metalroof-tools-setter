/**
 * Code generation for the client portal.
 *
 * Format: 6 alphanumeric chars, uppercase, excluding ambiguous characters
 * (0/O, 1/I/L) to make codes easy to read in SMS.
 *
 * Alphabet size: 31 chars → 31^6 ≈ 887M combinations.
 * Brute force: with 30 req/5min rate limit per IP, ~10K guesses/day per IP.
 * Probability of finding a valid code in 1 day with 1 IP = 10K / 887M ≈ 0.001%.
 */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

export function generateCode(): string {
  let out = "";
  // Use crypto random for uniformity
  const bytes = new Uint8Array(CODE_LENGTH);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < CODE_LENGTH; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

const CODE_REGEX = new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`);

export function isValidCodeFormat(code: string): boolean {
  return CODE_REGEX.test(code);
}

/**
 * Normalize a phone number to E.164 format for North America.
 * Returns null if the number cannot be normalized.
 */
export function normalizePhoneE164(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  // Already has + and full international
  if (input.startsWith("+") && /^\+[1-9]\d{1,14}$/.test(input)) return input;
  return null;
}
