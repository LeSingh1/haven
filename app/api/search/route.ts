// app/api/search/route.ts — Part 1 finder endpoint. OWNED BY SHAURYA.
// Speech transcript -> SearchQuery (Claude, or nlp keyword fallback) -> filtered
// + ranked listings from the shared mockListings dataset -> spoken summary.
// Matches the frontend contract: returns SearchResponse | ApiError (HTTP 200).

import { hasClaude, extractSearchQuery } from '@/lib/claude';
import { parseHousingQuery } from '@/lib/nlp';
import { mockListings } from '@/lib/mockListings';
import type { SearchQuery, SearchResponse, ApiError, Listing } from '@/lib/types';

export const runtime = 'nodejs'; // Anthropic SDK needs the Node runtime

// ── Relevance ranking ───────────────────────────────────────────────────────
// Old behaviour sorted purely by the STATIC listing.matchScore, so two different
// loose queries surfaced the SAME homes. We now rank by per-query relevance and
// overwrite the displayed matchScore with an honest per-query "fit %", so a bed
// query, a wheelchair query, and an "affordable near BART" query each lead with a
// different, sensible home. Pure function over (query, listings).
const RENT_FLOOR = 925;
const RENT_CEIL = 1725; // actual min/max rents in mockListings
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const AFFORD = /\b(cheap|cheapest|affordable|budget|low[\s-]?cost|inexpensive)\b/i;
const EXPLICIT_PRICE = /\$|\d{3,}|under|below|less than|no more than|\bmax\b|at most|or less|or under|hundred|thousand/i;
const TRANSIT = /\b(bart|caltrain|vta|light\s*rail|transit|train|station|metro)\b/i;

// nlp.ts maps a bare "affordable"/"cheap" (no number) to maxRent=1300. Treat that
// as a SOFT signal — rank by cheapness across all homes, never a hard filter wall.
function isSoftRentCap(t: string): boolean {
  return AFFORD.test(t) && !EXPLICIT_PRICE.test(t);
}
function rentMentioned(t: string, q: SearchQuery): boolean {
  return q.maxRent != null || AFFORD.test(t) || /\b(under|below|less than|budget|price|rent)\b/.test(t);
}

// What SORTS the list — explicit stated-fit dominates; rent only counts if price
// was expressed (so a bare "two bedroom" is never silently reordered by price).
function relevanceScore(l: Listing, q: SearchQuery): number {
  const t = (q.transcript || '').toLowerCase();
  const soft = isSoftRentCap(t);
  let s = 0;
  if (q.minBeds !== undefined) {
    const d = l.beds - q.minBeds;
    s += d === 0 ? 40 : d > 0 ? Math.max(0, 16 - d * 8) : Math.max(0, 12 + d * 12);
  }
  if (q.accessibility?.length) {
    const hit = q.accessibility.filter((f) => l.accessibility.includes(f)).length;
    // coverage + a breadth bonus so the genuinely most-accessible homes lead
    s += (hit / q.accessibility.length) * 30 + Math.min(5, l.accessibility.length) * 4;
  }
  if (q.programs?.length) {
    s += (q.programs.filter((p) => l.programs.includes(p)).length / q.programs.length) * 18;
  }
  if (q.city && l.city.toLowerCase().includes(q.city.toLowerCase())) s += 10;
  if (rentMentioned(t, q)) {
    s += (soft || q.maxRent == null)
      ? clamp01((RENT_CEIL - l.rent) / (RENT_CEIL - RENT_FLOOR)) * 20
      : clamp01((q.maxRent! - l.rent) / q.maxRent!) * 12;
  }
  if (TRANSIT.test(t) && TRANSIT.test(l.description.toLowerCase())) s += 14;
  if (l.available === false) s -= 8;
  s += l.matchScore * 0.05; // tiny static-quality tiebreak only
  return s;
}

// What's DISPLAYED — an honest per-query fit %, decoupled from the sort score.
function fitScore(l: Listing, q: SearchQuery): number {
  const t = (q.transcript || '').toLowerCase();
  const soft = isSoftRentCap(t);
  const p: Array<[number, number]> = [];
  if (q.minBeds !== undefined) {
    const d = l.beds - q.minBeds;
    p.push([1.0, d === 0 ? 1 : d > 0 ? clamp01(1 - d * 0.34) : clamp01(1 + d * 0.8)]);
  }
  if (q.accessibility?.length) {
    const hit = q.accessibility.filter((f) => l.accessibility.includes(f)).length;
    p.push([1.0, clamp01(0.65 * (hit / q.accessibility.length) + 0.35 * clamp01(l.accessibility.length / 5))]);
  }
  if (q.programs?.length) {
    p.push([0.7, q.programs.filter((x) => l.programs.includes(x)).length / q.programs.length]);
  }
  if (rentMentioned(t, q)) {
    const rs = (soft || q.maxRent == null)
      ? clamp01((RENT_CEIL - l.rent) / (RENT_CEIL - RENT_FLOOR))
      : clamp01(0.8 + 0.2 * clamp01(((q.maxRent! - l.rent) / q.maxRent!) / 0.15));
    p.push([0.8, rs]);
  }
  if (TRANSIT.test(t)) p.push([0.6, TRANSIT.test(l.description.toLowerCase()) ? 1 : 0]);

  let acc = 0, w = 0;
  for (const [wt, sc] of p) { acc += wt * sc; w += wt; }
  let b = w ? acc / w : l.matchScore / 100; // no stated signals → static quality
  b = 0.97 * b + 0.03 * (l.matchScore / 100); // small quality prior stabilizes ties
  return clamp01(b);
}

const MIN_RESULTS = 10; // always show a full grid; the demo opens the first card

function filterAndRank(q: SearchQuery): Listing[] {
  const soft = isSoftRentCap((q.transcript || '').toLowerCase());
  const passes = (l: Listing): boolean => {
    if (q.maxRent && !soft && l.rent > q.maxRent) return false; // hard cap only when a number was spoken
    if (q.minBeds !== undefined && l.beds < q.minBeds) return false;
    if (q.city && !l.city.toLowerCase().includes(q.city.toLowerCase())) return false;
    // some(), not every(): over-specifying accessibility must never zero out results
    if (q.accessibility?.length && !q.accessibility.some((f) => l.accessibility.includes(f))) return false;
    if (q.programs?.length && !q.programs.some((p) => l.programs.includes(p))) return false;
    return true;
  };
  // Rank EVERY home by per-query relevance (best first).
  const ranked = mockListings
    .map((l) => ({
      listing: { ...l, matchScore: Math.round(45 + 54 * fitScore(l, q)) },
      r: relevanceScore(l, q),
      pass: passes(l),
    }))
    .sort((a, b) => b.r - a.r || b.listing.matchScore - a.listing.matchScore || a.listing.id.localeCompare(b.listing.id));
  // Genuine matches lead; backfill with the next-best homes so the grid is always
  // full (>= MIN_RESULTS). The strongest match is always #1 — the card to open.
  const matches = ranked.filter((x) => x.pass);
  const ordered =
    matches.length >= MIN_RESULTS
      ? matches
      : [...matches, ...ranked.filter((x) => !x.pass)].slice(0, MIN_RESULTS);
  return ordered.map((x) => x.listing);
}

function summarize(filtered: Listing[]): string {
  if (!filtered.length) {
    return "I didn't find any listings matching that. Try a higher budget, fewer requirements, or a city like Milpitas.";
  }
  const top = filtered[0];
  const bed = top.beds === 0 ? 'studio' : `${top.beds}-bedroom`;
  const access = top.accessibility.includes('wheelchair') ? ', wheelchair accessible' : '';
  const tour = top.hasTour ? ' It has a walkable 3D tour — want to step inside?' : '';
  const homes = filtered.length === 1 ? 'home' : 'homes';
  return `I found ${filtered.length} affordable ${homes}. Top match: ${top.address} at $${top.rent.toLocaleString()} a month, ${bed}${access}.${tour}`;
}

export async function POST(req: Request): Promise<Response> {
  let transcript = '';
  try {
    ({ transcript } = await req.json());
  } catch {
    /* handled below */
  }

  if (!transcript || !transcript.trim()) {
    const err: ApiError = {
      ok: false,
      message: 'empty_transcript',
      spokenFallback: "I didn't hear anything. Try saying a budget and how many bedrooms you need.",
    };
    return Response.json(err);
  }

  // Claude when a key is present; otherwise (or on failure) the shared nlp parser.
  let query: SearchQuery;
  if (hasClaude) {
    try {
      query = await extractSearchQuery(transcript);
    } catch (e) {
      console.error('[search] Claude failed, using nlp fallback:', e);
      query = parseHousingQuery(transcript);
    }
  } else {
    query = parseHousingQuery(transcript);
  }

  // Every listing is walkable — each opens a representative 3D tour keyed by its
  // own id (lib/tourData.ts builds a per-listing tour with that listing's address).
  const listings = filterAndRank(query).map((l) => ({ ...l, hasTour: true, tourId: l.id }));
  const resp: SearchResponse = {
    ok: true,
    listings,
    spokenSummary: summarize(listings),
    totalCount: listings.length,
  };
  return Response.json(resp);
}
