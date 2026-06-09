/**
 * Fuzzy address matching used by the Roofr PDF import flow.
 *
 * Given a list of {address, roofrUrl} entries (from a Google Sheets export
 * of all Drive PDFs) and the full list of chantiers, we score each row
 * against every chantier and pick the best match.
 *
 * Score breakdown (max 100):
 *   - Postal code match (both have one + identical)  → +60
 *   - Civic number match (leading digits identical)  → +20
 *   - First street word match (after the civic)      → +10
 *   - Levenshtein similarity on the normalized rest  → 0..10
 *
 * Decision:
 *   - score ≥ 80 → high-confidence (auto-attach by default)
 *   - 50–79      → suggested (require human review)
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
  // Strip punctuation except spaces, hyphens, and alphanumerics.
  s = s.replace(/[^\w\s-]/g, " ");
  for (const [re, repl] of ABBREVIATIONS) {
    s = s.replace(re, repl);
  }
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// ─── Component extraction ────────────────────────────────────────────────

const POSTAL_CODE_RE = /([a-z]\d[a-z])\s?(\d[a-z]\d)/i;
const LEADING_CIVIC_RE = /^(\d+(?:-\d+)?[a-z]?)\s/i;

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

/** First non-numeric, non-civic word — usually the street type or name. */
function extractFirstStreetWord(normalized: string): string | null {
  const withoutCivic = normalized.replace(LEADING_CIVIC_RE, "").trim();
  const firstWord = withoutCivic.split(" ")[0];
  return firstWord || null;
}

// ─── Levenshtein (memory-efficient row-rolling variant) ──────────────────

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1, // insertion
        prev[j] + 1, // deletion
        prev[j - 1] + cost // substitution
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/** Normalize Levenshtein into a 0..10 score (10 = identical). */
function similarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 10;
  const dist = levenshtein(a, b);
  const sim = 1 - dist / max;
  return Math.max(0, Math.round(sim * 10));
}

// ─── Scoring ─────────────────────────────────────────────────────────────

export interface ChantierAddressFeatures {
  raw: string;
  normalized: string;
  postal: string | null;
  civic: string | null;
  firstStreetWord: string | null;
}

export function featuresOf(rawAddress: string): ChantierAddressFeatures {
  const normalized = normalizeAddress(rawAddress);
  return {
    raw: rawAddress,
    normalized,
    postal: extractPostalCode(normalized),
    civic: extractCivic(normalized),
    firstStreetWord: extractFirstStreetWord(normalized),
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
  firstStreetMatch: boolean;
  similarity: number; // 0..10
}

export function scoreMatch(
  csv: ChantierAddressFeatures,
  chantier: ChantierAddressFeatures
): MatchScore {
  let score = 0;
  const postalMatch =
    !!csv.postal && !!chantier.postal && csv.postal === chantier.postal;
  if (postalMatch) score += 60;
  const civicMatch =
    !!csv.civic && !!chantier.civic && csv.civic === chantier.civic;
  if (civicMatch) score += 20;
  const firstStreetMatch =
    !!csv.firstStreetWord &&
    !!chantier.firstStreetWord &&
    csv.firstStreetWord === chantier.firstStreetWord;
  if (firstStreetMatch) score += 10;
  const similarity = similarityScore(csv.normalized, chantier.normalized);
  score += similarity;
  return { score, postalMatch, civicMatch, firstStreetMatch, similarity };
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
    if (bestScore >= 80) verdict = "auto";
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
