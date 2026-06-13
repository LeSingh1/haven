// app/api/search/route.ts — Part 1 finder endpoint. OWNED BY SHAURYA.
// Speech transcript -> SearchQuery (Claude, or nlp keyword fallback) -> filtered
// + ranked listings from the shared mockListings dataset -> spoken summary.
// Matches the frontend contract: returns SearchResponse | ApiError (HTTP 200).

import { hasClaude, extractSearchQuery } from '@/lib/claude';
import { parseHousingQuery } from '@/lib/nlp';
import { mockListings } from '@/lib/mockListings';
import type { SearchQuery, SearchResponse, ApiError, Listing } from '@/lib/types';

export const runtime = 'nodejs'; // Anthropic SDK needs the Node runtime

function filterAndRank(q: SearchQuery): Listing[] {
  return mockListings
    .filter((l) => {
      if (q.maxRent && l.rent > q.maxRent) return false;
      if (q.minBeds !== undefined && l.beds < q.minBeds) return false;
      if (q.city && !l.city.toLowerCase().includes(q.city.toLowerCase())) return false;
      if (q.accessibility?.length && !q.accessibility.every((f) => l.accessibility.includes(f))) return false;
      if (q.programs?.length && !q.programs.some((p) => l.programs.includes(p))) return false;
      return true;
    })
    .sort((a, b) => b.matchScore - a.matchScore);
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

  const listings = filterAndRank(query);
  const resp: SearchResponse = {
    ok: true,
    listings,
    spokenSummary: summarize(listings),
    totalCount: listings.length,
  };
  return Response.json(resp);
}
