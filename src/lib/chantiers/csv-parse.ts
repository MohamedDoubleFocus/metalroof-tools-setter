/**
 * Minimal CSV / TSV parser for the bulk-import page.
 *
 * Supports:
 * - Auto-detected delimiter (tab if first line has any tabs, comma otherwise)
 * - Quoted strings ("foo, bar") with embedded delimiter
 * - Doubled quotes ("she said ""hi""") inside quoted fields
 * - Header row mapped to known chantier fields
 *
 * Not designed for arbitrary CSV — kept simple on purpose. If users want
 * fancier imports later, swap in PapaParse.
 */

export const REQUIRED_HEADERS = [
  "clientName",
  "clientPhone",
  "addressLine1",
] as const;

export const OPTIONAL_HEADERS = [
  "clientEmail",
  "addressLine2",
  "submissionUrl",
  "style",
  "colorKey",
  "urgency",
  "signedAt",
  "scheduledDate",
  "totalAmount",
  "notes",
] as const;

export const KNOWN_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];
export type KnownHeader = (typeof KNOWN_HEADERS)[number];

export interface ParsedRow {
  index: number; // 1-based row number (after header)
  raw: string[]; // original cell values
  data: Partial<Record<KnownHeader, string>>;
  errors: string[];
}

export interface ParseResult {
  delimiter: "," | "\t";
  headers: string[];
  unknownHeaders: string[];
  missingRequired: string[];
  rows: ParsedRow[];
}

function detectDelimiter(line: string): "," | "\t" {
  if (line.includes("\t")) return "\t";
  return ",";
}

/**
 * Parse a single CSV line respecting quoted fields. The delimiter is passed
 * explicitly so we don't have to re-detect each line.
 */
function parseLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === delimiter) {
        cells.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
  }
  cells.push(cur);
  return cells.map((s) => s.trim());
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateRow(row: ParsedRow): void {
  const d = row.data;

  for (const h of REQUIRED_HEADERS) {
    if (!d[h] || !d[h]!.trim()) {
      row.errors.push(`${h} manquant`);
    }
  }

  if (d.clientEmail && !EMAIL_RE.test(d.clientEmail)) {
    row.errors.push("clientEmail invalide");
  }

  // Phone normalization happens server-side; just sanity-check digits count.
  if (d.clientPhone) {
    const digits = d.clientPhone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
      row.errors.push("clientPhone doit faire 10-15 chiffres");
    }
  }

  if (d.signedAt && !DATE_RE.test(d.signedAt) && Number.isNaN(Date.parse(d.signedAt))) {
    row.errors.push("signedAt doit être YYYY-MM-DD ou ISO");
  }

  if (d.scheduledDate && !DATE_RE.test(d.scheduledDate)) {
    row.errors.push("scheduledDate doit être YYYY-MM-DD");
  }

  if (d.totalAmount) {
    const n = Number(d.totalAmount.replace(/[\s$,]/g, "").replace(",", "."));
    if (Number.isNaN(n) || n < 0) {
      row.errors.push("totalAmount doit être un nombre positif");
    }
  }
}

export function parseChantiersCsv(input: string): ParseResult {
  const text = input.replace(/\r\n?/g, "\n").trim();
  if (!text) {
    return {
      delimiter: ",",
      headers: [],
      unknownHeaders: [],
      missingRequired: [...REQUIRED_HEADERS],
      rows: [],
    };
  }

  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const delimiter = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delimiter);

  const unknownHeaders = headers.filter(
    (h) => !KNOWN_HEADERS.includes(h as KnownHeader)
  );
  const missingRequired = REQUIRED_HEADERS.filter((h) => !headers.includes(h));

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = parseLine(lines[i], delimiter);
    const data: Partial<Record<KnownHeader, string>> = {};
    headers.forEach((h, j) => {
      if (KNOWN_HEADERS.includes(h as KnownHeader)) {
        const v = raw[j] ?? "";
        if (v) data[h as KnownHeader] = v;
      }
    });
    const row: ParsedRow = { index: i, raw, data, errors: [] };
    validateRow(row);
    rows.push(row);
  }

  return { delimiter, headers, unknownHeaders, missingRequired, rows };
}

/**
 * Normalize a row's `data` into the shape expected by createChantier.
 * Caller must check `row.errors.length === 0` first.
 */
export function rowToCreateInput(data: Partial<Record<KnownHeader, string>>) {
  let signedAt: number | undefined;
  if (data.signedAt) {
    const parsed = Date.parse(
      DATE_RE.test(data.signedAt) ? `${data.signedAt}T12:00:00` : data.signedAt
    );
    if (!Number.isNaN(parsed)) signedAt = parsed;
  }

  let totalAmount: number | undefined;
  if (data.totalAmount) {
    const n = Number(
      data.totalAmount.replace(/[\s$,]/g, "").replace(",", ".")
    );
    if (!Number.isNaN(n)) totalAmount = n;
  }

  return {
    clientName: data.clientName!,
    clientPhone: data.clientPhone!,
    clientEmail: data.clientEmail,
    addressLine1: data.addressLine1!,
    addressLine2: data.addressLine2,
    submissionUrl: data.submissionUrl,
    style: data.style,
    colorKey: data.colorKey,
    urgency: data.urgency,
    signedAt,
    scheduledDate: data.scheduledDate,
    totalAmount,
    notes: data.notes,
  };
}
