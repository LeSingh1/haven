/**
 * lib/nlp.ts — client-side natural-language parser for housing voice queries.
 *
 * Converts free-form speech (or typed text) into a structured SearchQuery.
 * Handles number words, fuzzy synonyms, contractions, and common mishearings
 * so the speech model doesn't need to be perfect.
 */

import type { SearchQuery, AccessibilityFeature } from './types';

// ── Number words → digits ────────────────────────────────────────────────────
const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  'twenty one': 21, 'twenty two': 22, 'twenty five': 25,
  thirty: 30, forty: 40, fifty: 50, hundred: 100, thousand: 1000,
};

// ── Budget extraction ────────────────────────────────────────────────────────
const BUDGET_PATTERNS = [
  // "$1,500", "$1500", "1500 dollars", "1500 a month"
  /\$\s*([\d,]+)\s*(?:a\s*month|\/mo|per\s*month)?/i,
  // "under 1500", "below 1200", "less than 1400", "max 1800", "no more than 2000"
  /(?:under|below|less\s*than|no\s*more\s*than|max(?:imum)?|at\s*most)\s*\$?\s*([\d,]+)/i,
  // "1500 or less", "1200 or under"
  /([\d,]+)\s*(?:or\s*less|or\s*under|max)/i,
  // "around 1200", "about 1500", "roughly 1300"
  /(?:around|about|roughly|approximately)\s*\$?\s*([\d,]+)/i,
  // "fifteen hundred", "twelve hundred" → spoken price
  /\b(fifteen\s*hundred|twelve\s*hundred|thirteen\s*hundred|fourteen\s*hundred|sixteen\s*hundred|seventeen\s*hundred|eighteen\s*hundred|nineteen\s*hundred|twenty\s*hundred)\b/i,
  // "one thousand five hundred"
  /\bone\s*thousand\s*(?:and\s*)?(five|four|six|seven|eight|nine)\s*hundred\b/i,
];

const SPOKEN_PRICES: Record<string, number> = {
  'twelve hundred': 1200, 'thirteen hundred': 1300, 'fourteen hundred': 1400,
  'fifteen hundred': 1500, 'sixteen hundred': 1600, 'seventeen hundred': 1700,
  'eighteen hundred': 1800, 'nineteen hundred': 1900, 'twenty hundred': 2000,
  'one thousand five hundred': 1500, 'one thousand four hundred': 1400,
  'one thousand six hundred': 1600, 'one thousand two hundred': 1200,
  'one thousand eight hundred': 1800, 'two thousand': 2000,
};

function extractMaxRent(text: string): number | undefined {
  const lower = text.toLowerCase();

  // Spoken prices first
  for (const [phrase, value] of Object.entries(SPOKEN_PRICES)) {
    if (lower.includes(phrase)) return value;
  }

  // Cheap / affordable / budget synonyms → no hard cap, but flag to return lower-rent results
  if (/\b(?:cheap|cheapest|affordable|budget|low[\s-]cost|inexpensive)\b/i.test(text)) {
    return 1300; // reasonable "cheap" cap for Milpitas area
  }

  for (const pattern of BUDGET_PATTERNS) {
    const m = lower.match(pattern);
    if (m) {
      const raw = m[1].replace(/,/g, '');
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n > 200 && n < 20000) return n;
    }
  }
  return undefined;
}

// ── Bedroom extraction ───────────────────────────────────────────────────────
const BED_PATTERNS = [
  /(\d)\s*(?:bed(?:room)?s?|br|bdr|bdrm)/i,          // "2 bedrooms", "3br"
  /(?:bed(?:room)?s?|br)\s*(\d)/i,                    // "bedroom 2"
  /(one|two|three|four|five|six)\s*(?:bed(?:room)?s?|br)/i, // "two bedrooms"
];

function extractMinBeds(text: string): number | undefined {
  // Studio
  if (/\bstudio\b/i.test(text)) return 0;

  for (const pattern of BED_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      const raw = m[1].toLowerCase();
      if (WORD_NUMBERS[raw] !== undefined) return WORD_NUMBERS[raw];
      const n = parseInt(raw, 10);
      if (!isNaN(n)) return n;
    }
  }
  return undefined;
}

// ── Accessibility extraction ─────────────────────────────────────────────────
const ACCESSIBILITY_MAP: Array<[RegExp, AccessibilityFeature]> = [
  [/\b(?:wheelchair|wheel\s*chair|mobility|ada(?:\s*compliant)?|handicap(?:ped)?)\b/i, 'wheelchair'],
  [/\b(?:elevator|lift)\b/i, 'elevator'],
  [/\b(?:ground[\s-]floor|first[\s-]floor|no[\s-]stairs?|step[\s-]free|no\s*steps?)\b/i, 'ground-floor'],
  [/\b(?:wide[\s-]door(?:way)?s?|wide\s*entr(?:y|ance))\b/i, 'wide-doors'],
  [/\b(?:grab[\s-]bars?|safety[\s-]bars?)\b/i, 'grab-bars'],
  [/\b(?:hearing[\s-]loop|induction\s*loop|deaf[\s-]friendly)\b/i, 'hearing-loop'],
  [/\b(?:braille|visually[\s-]impaired|blind[\s-]friendly)\b/i, 'braille-signage'],
];

function extractAccessibility(text: string): AccessibilityFeature[] {
  return ACCESSIBILITY_MAP
    .filter(([re]) => re.test(text))
    .map(([, feature]) => feature);
}

// ── Program extraction ───────────────────────────────────────────────────────
const PROGRAM_PATTERNS: Array<[RegExp, string]> = [
  [/\bsection\s*8\b/i, 'Section 8'],
  [/\bhud\b/i, 'HUD'],
  [/\blihtc\b|\blow[\s-]income\s*(?:tax\s*credit)?\b|\baffordable\s*housing\s*program\b/i, 'LIHTC'],
  [/\bvoucher\b/i, 'Section 8'],
  [/\bsubsidized\b/i, 'HUD'],
];

function extractPrograms(text: string): string[] {
  const found = new Set<string>();
  for (const [re, program] of PROGRAM_PATTERNS) {
    if (re.test(text)) found.add(program);
  }
  return [...found];
}

// ── City extraction ──────────────────────────────────────────────────────────
const CITIES = ['milpitas', 'san jose', 'santa clara', 'sunnyvale', 'fremont', 'Newark', 'union city'];

function extractCity(text: string): string | undefined {
  const lower = text.toLowerCase();
  return CITIES.find((c) => lower.includes(c));
}

// ── Main parse function ──────────────────────────────────────────────────────

export interface ParsedQuery extends SearchQuery {
  raw: string;
  confidence: number; // 0–1 how much was understood
}

export function parseHousingQuery(raw: string): ParsedQuery {
  const maxRent = extractMaxRent(raw);
  const minBeds = extractMinBeds(raw);
  const accessibility = extractAccessibility(raw);
  const programs = extractPrograms(raw);
  const city = extractCity(raw);

  // Rough confidence: each extracted field adds to confidence
  const fields = [maxRent, minBeds, accessibility.length > 0, programs.length > 0, city].filter(Boolean);
  const confidence = Math.min(0.4 + fields.length * 0.15, 1);

  return {
    raw,
    transcript: raw,
    maxRent,
    minBeds,
    accessibility: accessibility.length ? accessibility : undefined,
    programs: programs.length ? programs : undefined,
    city,
    confidence,
  };
}

/**
 * Build a short spoken confirmation of what the model understood.
 * Keep it tight — just echo back the key constraints so user knows it worked.
 */
export function buildConfirmation(q: ParsedQuery): string {
  const parts: string[] = [];
  if (q.minBeds !== undefined) {
    parts.push(q.minBeds === 0 ? 'studio' : `${q.minBeds}-bedroom`);
  }
  if (q.maxRent) parts.push(`under $${q.maxRent.toLocaleString()}`);
  if (q.city) parts.push(`in ${q.city}`);
  if (q.accessibility?.length) parts.push(`wheelchair accessible`);
  if (q.programs?.length) parts.push(q.programs.join(', '));

  return parts.length
    ? `Searching for ${parts.join(', ')}.`
    : 'Searching for affordable homes near Milpitas.';
}
