/**
 * Minimal CSV parsing for the lead bulk import: auto-detects the delimiter
 * (";", "," or tab), honours double-quoted fields (with "" escapes) and
 * strips a UTF-8 BOM. Returns the header row and data rows as raw strings.
 */

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  delimiter: string;
}

/**
 * Read a CSV File as text, tolerant of the encodings garages actually export.
 * Browsers' File.text() assumes UTF-8, so a Windows-1252 file (French Excel's
 * default « CSV ») turns accents into  replacement characters. We honour a
 * UTF-16/UTF-8 BOM, try a strict UTF-8 decode, and fall back to Windows-1252
 * only when the bytes are not valid UTF-8 (i.e. a legacy single-byte export).
 */
export async function readCsvText(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes[0] === 0xff && bytes[1] === 0xfe)
    return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff)
    return new TextDecoder("utf-16be").decode(bytes);

  try {
    // Strict UTF-8: throws on invalid sequences (a Windows-1252 accent byte).
    // A leading UTF-8 BOM is stripped here and again by parseCsv.
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export function detectDelimiter(headerLine: string): string {
  const candidates = [";", ",", "\t"];
  let best = ";";
  let bestCount = -1;
  for (const d of candidates) {
    const count = headerLine.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

export function parseCsv(text: string): ParsedCsv {
  const content = text.replace(/^﻿/, "");
  const firstLineEnd = content.indexOf("\n");
  const headerLine =
    firstLineEnd === -1 ? content : content.slice(0, firstLineEnd);
  const delimiter = detectDelimiter(headerLine.replace(/\r$/, ""));

  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    record.push(field);
    field = "";
  };
  const pushRecord = () => {
    pushField();
    // Skip fully empty lines.
    if (record.length > 1 || record[0].trim() !== "") records.push(record);
    record = [];
  };

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      pushField();
    } else if (c === "\n") {
      if (field.endsWith("\r")) field = field.slice(0, -1);
      pushRecord();
    } else {
      field += c;
    }
  }
  if (field.length > 0 || record.length > 0) {
    if (field.endsWith("\r")) field = field.slice(0, -1);
    pushRecord();
  }

  const [headers = [], ...rows] = records;
  return {
    headers: headers.map((h) => h.trim()),
    rows,
    delimiter,
  };
}

/** Import target fields, in display order. */
export const IMPORT_FIELDS = [
  "externalRef",
  "fullName",
  "phone",
  "email",
  "address",
  "postalCode",
  "city",
  "interestSummary",
  "sourceDetail",
  "notes",
  "tags",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  externalRef: "Référence externe",
  fullName: "Nom complet",
  phone: "Téléphone",
  email: "Email",
  address: "Adresse",
  postalCode: "Code postal",
  city: "Ville",
  interestSummary: "Projet / intérêt",
  sourceDetail: "Précision source",
  notes: "Notes",
  tags: "Tags",
};

export const IMPORT_FIELD_HINTS: Partial<Record<ImportField, string>> = {
  externalRef:
    "Identifiant unique de la ligne dans votre fichier — la clé la plus fiable pour ré-importer sans doublons.",
  fullName: "Obligatoire.",
  phone: "Sert à détecter les doublons (après normalisation).",
  email: "Sert à détecter les doublons.",
  tags: "Valeurs séparées par | ou /",
};

/** Header-name heuristics → target field. Order matters (first match wins). */
const AUTO_PATTERNS: [ImportField, RegExp][] = [
  ["externalRef", /^(id|ref|reference|référence|external|ext[_ ]?id|uid)$/i],
  ["fullName", /(nom.*complet|full.?name|^nom$|^name$|client|prospect|contact)/i],
  ["phone", /(t[eé]l[eé]?phone|portable|mobile|phone|tel|gsm)/i],
  ["email", /(e-?mail|courriel|mail)/i],
  ["postalCode", /(code.?postal|cp|zip)/i],
  ["city", /(ville|city|commune)/i],
  ["address", /(adresse|address|rue|voie)/i],
  ["interestSummary", /(projet|int[eé]r[eê]t|recherche|besoin|demande|interest)/i],
  ["sourceDetail", /(source|origine|canal|provenance)/i],
  ["notes", /(note|commentaire|remarque|comment)/i],
  ["tags", /(tag|segment|cat[eé]gorie|label)/i],
];

/** Guess a column mapping from CSV header names. */
export function autoMapColumns(
  headers: string[],
): Partial<Record<ImportField, number>> {
  const mapping: Partial<Record<ImportField, number>> = {};
  headers.forEach((header, index) => {
    const h = header.trim();
    if (!h) return;
    for (const [field, pattern] of AUTO_PATTERNS) {
      if (mapping[field] === undefined && pattern.test(h)) {
        mapping[field] = index;
        return;
      }
    }
  });
  return mapping;
}
