'use client';
import type { SearchQuery, SearchResponse, ApiError, NavParseResponse } from './types';
import { mockListings } from './mockListings';
import { parseHousingQuery, buildConfirmation } from './nlp';

// Backend routes are live (Shaurya). Set true to force the offline mock path.
const MOCK = false;

const mockDelay = (ms = 600) => new Promise<void>((r) => setTimeout(r, ms));

export async function search(raw: SearchQuery): Promise<SearchResponse | ApiError> {
  if (MOCK) {
    await mockDelay();

    // Parse natural language → structured constraints
    const q = parseHousingQuery(raw.transcript);

    const filtered = mockListings
      .filter((l) => {
        if (q.maxRent && l.rent > q.maxRent) return false;
        if (q.minBeds !== undefined && l.beds < q.minBeds) return false;
        if (q.city && !l.city.toLowerCase().includes(q.city.toLowerCase())) return false;
        if (q.accessibility?.length) {
          const hasAll = q.accessibility.every((f) => l.accessibility.includes(f));
          if (!hasAll) return false;
        }
        if (q.programs?.length) {
          const hasAny = q.programs.some((p) => l.programs.includes(p));
          if (!hasAny) return false;
        }
        return true;
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    if (filtered.length === 0) {
      const fallback =
        "I didn't find any listings matching that. Try a higher budget, fewer requirements, or say something like "
        + '"2 bedroom under 1500 in Milpitas".';
      return { ok: true, listings: [], spokenSummary: fallback, totalCount: 0 };
    }

    const top3 = filtered.slice(0, 3);

    // Build a natural spoken summary capped to top 3 results
    const confirmation = buildConfirmation(q);
    const intro = `${confirmation} I found ${filtered.length} result${filtered.length !== 1 ? 's' : ''}. `;
    const top = `Top match: ${top3[0].address} at $${top3[0].rent.toLocaleString()} per month, ${top3[0].beds === 0 ? 'studio' : `${top3[0].beds} bedroom`}. `;
    const second = top3[1]
      ? `Also: ${top3[1].address} at $${top3[1].rent.toLocaleString()}. `
      : '';
    const more = filtered.length > 2
      ? `And ${filtered.length - 2} more result${filtered.length - 2 !== 1 ? 's' : ''} below.`
      : '';

    return {
      ok: true,
      listings: filtered,
      spokenSummary: (intro + top + second + more).trim(),
      totalCount: filtered.length,
    };
  }

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(raw),
    });
    if (!res.ok) {
      const err = await res.json();
      return {
        ok: false,
        message: err.message ?? 'Search failed',
        spokenFallback: err.spokenFallback ?? "Sorry, I couldn't reach the server. Please try again.",
      };
    }
    return await res.json();
  } catch {
    return {
      ok: false,
      message: 'Network error',
      spokenFallback: "I'm having trouble connecting. Please check your internet and try again.",
    };
  }
}

export async function parseNav(
  transcript: string,
  waypoints: { id: string; label: string }[]
): Promise<NavParseResponse> {
  if (MOCK) {
    await mockDelay(300);
    const lower = transcript.toLowerCase();

    // Try each waypoint — match any word from its label
    const match = waypoints.find((w) =>
      w.label.toLowerCase().split(/\s+/).some((word) => lower.includes(word))
    );
    if (match) {
      return { ok: true, command: { type: 'goto', waypointId: match.id, speech: `Moving to ${match.label}.` } };
    }
    if (/\b(?:reset|start|beginning|entrance|front)\b/.test(lower)) {
      return { ok: true, command: { type: 'reset', speech: 'Returning to the entrance.' } };
    }
    if (/\b(?:next|forward|continue|ahead)\b/.test(lower)) {
      return { ok: true, command: { type: 'next', speech: 'Moving to the next stop.' } };
    }
    if (/\b(?:back|previous|prev|before|go back)\b/.test(lower)) {
      return { ok: true, command: { type: 'prev', speech: 'Going back.' } };
    }

    // Build the available waypoints hint from actual waypoints
    const labels = waypoints.map((w) => `"${w.label.toLowerCase()}"`).join(', ');
    return {
      ok: false,
      command: { type: 'reset', speech: '' },
      spokenFallback: `I didn't catch that. Try saying ${labels}, "next", or "back".`,
    };
  }

  try {
    const res = await fetch('/api/nav', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, waypoints }),
    });
    return await res.json();
  } catch {
    return {
      ok: false,
      command: { type: 'reset', speech: '' },
      spokenFallback: "I couldn't reach the navigation service.",
    };
  }
}
