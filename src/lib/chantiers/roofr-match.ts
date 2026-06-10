/**
 * Fuzzy address matching used by the Roofr PDF import flow.
 *
 * Strategy: token-set similarity (Sørensen-Dice) on meaningful words +
 * bonuses for civic number and postal code matches. Designed to work even
 * when neither side has a postal code (common case in Quebec data).
 *
 * Score breakdown (max 100):
 *   - Meaningful token overlap (Sørensen-Dice × 65)  → 0..65
 *   - Civic number match (leading digits identical)  → +20
 *   - Postal code match (both have one + identical)  → +15
 *
 * Decision:
 *   - score ≥ 75 → high-confidence (auto-attach by default)
 *   - 50–74      → suggested (require human review)
 *   - < 50       → no match
 */

import type { Chantier } from "@/types/chantiers";

// ─── Normalization ───────────────────────────────────────────────────────

/**
 * Common French/Quebec street-type abbreviations expanded to their full form.
 * Applied AFTER accent stripping and lowercasing so the regex is plain ASCII.
 */
const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bchem\.?\b/g, "chemin"],
  [/\bch\.?\b/g, "chemin"],
  [/\bave?\.?\b/g, "avenue"],
  [/\bav\.?\b/g, "avenue"],
  [/\bblvd\.?\b/g, "boulevard"],
  [/\bboul\.?\b/g, "boulevard"],
  [/\bbd\.?\b/g, "boulevard"],
  [/\bbld\.?\b/g, "boulevard"],
  [/\bsts?\.?\b/g, "saint"],
  [/\bste\.?\b/g, "sainte"],
  [/\bmtl\b/g, "montreal"],
  [/\btsse\.?\b/g, "terrasse"],
  [/\bplace\b/g, "place"],
  [/\bpl\.?\b/g, "place"],
  [/\brue\b/g, "rue"],
  [/\brg\.?\b/g, "rang"],
];

/**
 * Strip diacritics (é → e, à → a, etc.) using Unicode NFD decomposition.
 */
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** Lowercase, strip accents, expand abbreviations, collapse whitespace. */
export function normalizeAddress(input: string): string {
  let s = stripAccents(input).toLowerCase();
  // Strip the .pdf extension if present (Roofr PDFs come with it in the title).
  s = s.replace(/\.pdf\b/g, "");
  // Strip trailing noise common in Roofr titles: ", quebec, canada", ", canada"
  s = s.replace(/,?\s*quebec\s*,?\s*canada\s*$/g, "");
  s = s.replace(/,?\s*canada\s*$/g, "");
  s = s.replace(/,?\s*quebec\s*$/g, "");
  // Strip ALL punctuation (incl. hyphens) — replace with spaces so
  // "Saint-Eustache" and "Saint Eustache" tokenize identically.
  s = s.replace(/[^\w\s]/g, " ");
  s = s.replace(/-/g, " ");
  for (const [re, repl] of ABBREVIATIONS) {
    s = s.replace(re, repl);
  }
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// ─── Component extraction ────────────────────────────────────────────────

const POSTAL_CODE_RE = /([a-z]\d[a-z])\s?(\d[a-z]\d)/i;
// Civic = leading digits (optionally with letter suffix like "1187a").
const LEADING_CIVIC_RE = /^(\d+[a-z]?)\s/i;

/**
 * Stop words to exclude from token-set similarity. These are common French
 * address connectors / boilerplate that appear on basically every address —
 * counting them would inflate every score artificially.
 */
const STOP_WORDS = new Set([
  // Street types (already distinctive via abbreviation expansion)
  "rue",
  "avenue",
  "chemin",
  "boulevard",
  "place",
  "rang",
  "terrasse",
  "impasse",
  "montee",
  "croissant",
  "highridge",
  "road",
  "av",
  // Saint prefix (very common, doesn't distinguish)
  "saint",
  "sainte",
  "st",
  "ste",
  // Articles & connectors
  "des",
  "du",
  "de",
  "la",
  "le",
  "les",
  "d",
  "l",
  // Geographic noise
  "quebec",
  "qc",
  "canada",
]);

function extractPostalCode(normalized: string): string | null {
  const m = normalized.match(POSTAL_CODE_RE);
  if (!m) return null;
  return `${m[1].toLowerCase()}${m[2].toLowerCase()}`;
}

function extractCivic(normalized: string): string | null {
  const m = normalized.match(LEADING_CIVIC_RE);
  if (!m) return null;
  return m[1].toLowerCase();
}

/**
 * Split into meaningful tokens — drop stop words, very short tokens, and
 * pure-numeric tokens (civic is handled separately as a bonus).
 */
function meaningfulTokens(normalized: string): Set<string> {
  return new Set(
    normalized
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2)
      .filter((t) => !STOP_WORDS.has(t))
      .filter((t) => !/^\d+$/.test(t)) // pure numbers (civic, postal digits)
  );
}

function diceCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  return (2 * intersection) / (a.size + b.size);
}

// ─── Scoring ─────────────────────────────────────────────────────────────

export interface ChantierAddressFeatures {
  raw: string;
  normalized: string;
  postal: string | null;
  civic: string | null;
  tokens: Set<string>;
}

export function featuresOf(rawAddress: string): ChantierAddressFeatures {
  const normalized = normalizeAddress(rawAddress);
  return {
    raw: rawAddress,
    normalized,
    postal: extractPostalCode(normalized),
    civic: extractCivic(normalized),
    tokens: meaningfulTokens(normalized),
  };
}

export function featuresOfChantier(c: Chantier): ChantierAddressFeatures {
  const combined = [c.addressLine1, c.addressLine2].filter(Boolean).join(" ");
  return featuresOf(combined);
}

export interface MatchScore {
  score: number; // 0..100
  postalMatch: boolean;
  civicMatch: boolean;
  tokenDice: number; // 0..1
}

export function scoreMatch(
  csv: ChantierAddressFeatures,
  chantier: ChantierAddressFeatures
): MatchScore {
  let score = 0;

  // Token-set similarity is the main signal (max 65 points).
  const tokenDice = diceCoefficient(csv.tokens, chantier.tokens);
  score += Math.round(tokenDice * 65);

  // Civic match is a strong anchor (max 20 points).
  const civicMatch =
    !!csv.civic && !!chantier.civic && csv.civic === chantier.civic;
  if (civicMatch) score += 20;

  // Postal match is a tiebreaker bonus (max 15 points).
  const postalMatch =
    !!csv.postal && !!chantier.postal && csv.postal === chantier.postal;
  if (postalMatch) score += 15;

  return { score, postalMatch, civicMatch, tokenDice };
}

// ─── Public API ──────────────────────────────────────────────────────────

export type MatchVerdict = "auto" | "review" | "none";

export interface MatchProposal {
  /** Original CSV row index (0-based). */
  rowIndex: number;
  /** The raw address from the PDF title. */
  csvAddress: string;
  /** The Roofr URL from the CSV. */
  roofrUrl: string;
  /** Best chantier candidate, if any. */
  bestChantierId: string | null;
  bestChantierLabel: string | null;
  bestChantierAddress: string | null;
  /** Whether the best chantier already has a roofrUrl set. */
  alreadyHasRoofr: boolean;
  score: MatchScore | null;
  verdict: MatchVerdict;
  /** Top 3 candidates (incl. best) for review UX. */
  candidates: Array<{
    chantierId: string;
    label: string;
    address: string;
    score: number;
  }>;
}

export interface CsvRow {
  address: string;
  roofrUrl: string;
}

/**
 * Score every CSV row against every chantier and produce a verdict.
 */
export function buildProposals(
  rows: CsvRow[],
  chantiers: Chantier[]
): MatchProposal[] {
  const chantierFeatures = chantiers.map((c) => ({
    chantier: c,
    features: featuresOfChantier(c),
  }));

  return rows.map((row, rowIndex) => {
    const csvFeat = featuresOf(row.address);

    // Score against every chantier
    const scored = chantierFeatures
      .map(({ chantier, features }) => ({
        chantier,
        score: scoreMatch(csvFeat, features),
      }))
      .sort((a, b) => b.score.score - a.score.score);

    const top = scored.slice(0, 3);
    const best = top[0];
    const bestScore = best?.score.score ?? 0;

    let verdict: MatchVerdict;
    if (bestScore >= 75) verdict = "auto";
    else if (bestScore >= 50) verdict = "review";
    else verdict = "none";

    return {
      rowIndex,
      csvAddress: row.address,
      roofrUrl: row.roofrUrl,
      bestChantierId: best?.chantier.id ?? null,
      bestChantierLabel: best?.chantier.clientName ?? null,
      bestChantierAddress: best
        ? [best.chantier.addressLine1, best.chantier.addressLine2]
            .filter(Boolean)
            .join(", ")
        : null,
      alreadyHasRoofr: !!best?.chantier.roofrUrl,
      score: best?.score ?? null,
      verdict,
      candidates: top.map((t) => ({
        chantierId: t.chantier.id,
        label: t.chantier.clientName,
        address: [t.chantier.addressLine1, t.chantier.addressLine2]
          .filter(Boolean)
          .join(", "),
        score: t.score.score,
      })),
    };
  });
}
