/**
 * Helpers for working with street names.
 *
 * Goal: produce a stable normalized form so "Rue Saint-Denis" and
 * "rue saint denis" and "Rue Saint Denis" all collide on the same Street entity.
 */

/**
 * Lowercase, strip accents, collapse whitespace and hyphens, strip leading
 * "rue ", "boul. ", "avenue ", etc. Used as the canonical street key.
 */
export function normalizeStreetName(raw: string): string {
  if (!raw) return "";
  let s = raw.trim().toLowerCase();

  // Remove accents (combining diacritical marks U+0300..U+036F)
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");

  // Strip common French street type prefixes
  s = s.replace(
    /^(rue|boulevard|boul\.?|avenue|av\.?|chemin|ch\.?|route|rte\.?|rang|montee|cote|place|impasse|allee|carre|terrasse|cul-de-sac|cul de sac)\s+/i,
    ""
  );

  // Replace hyphens and underscores with spaces
  s = s.replace(/[-_]+/g, " ");

  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

/**
 * Build a deterministic id for a street inside a sector.
 */
export function streetId(sectorId: string, normalizedName: string): string {
  return `${sectorId}::${normalizedName}`;
}
