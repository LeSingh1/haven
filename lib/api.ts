'use client';
import type { SearchQuery, SearchResponse, ApiError, NavParseResponse } from './types';
import { mockListings } from './mockListings';

// Flip to false when Shaurya's backend routes are live — one-line swap.
const MOCK = true;

// Small artificial delay to simulate network latency in mock mode.
const mockDelay = (ms = 600) => new Promise<void>((r) => setTimeout(r, ms));

export async function search(query: SearchQuery): Promise<SearchResponse | ApiError> {
  if (MOCK) {
    await mockDelay();
    // Simple mock filter: rank by matchScore descending.
    const filtered = mockListings
      .filter((l) => {
        if (query.maxRent && l.rent > query.maxRent) return false;
        if (query.minBeds && l.beds < query.minBeds) return false;
        return true;
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    const top = filtered.slice(0, 3);
    const spokenSummary =
      filtered.length === 0
        ? "I couldn't find any listings matching your request. Try adjusting your budget or bedroom count."
        : `I found ${filtered.length} affordable home${filtered.length !== 1 ? 's' : ''} near Milpitas. ` +
          `Top match: ${top[0].address} at $${top[0].rent.toLocaleString()} per month, ` +
          `${top[0].beds} bedroom${top[0].beds !== 1 ? 's' : ''}. ` +
          (filtered.length > 1
            ? `Also showing ${top[1].address} at $${top[1].rent.toLocaleString()}` +
              (filtered.length > 2 ? ` and ${filtered.length - 2} more result${filtered.length - 2 !== 1 ? 's' : ''}.` : '.')
            : '');

    return { ok: true, listings: filtered, spokenSummary, totalCount: filtered.length };
  }

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
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
    // Naive mock: match transcript to waypoint label by keyword.
    const lower = transcript.toLowerCase();
    const match = waypoints.find((w) => lower.includes(w.label.toLowerCase().split(' ')[0]));
    if (match) {
      return {
        ok: true,
        command: { type: 'goto', waypointId: match.id, speech: `Moving to ${match.label}.` },
      };
    }
    if (lower.includes('reset') || lower.includes('start') || lower.includes('beginning')) {
      return { ok: true, command: { type: 'reset', speech: 'Returning to the entrance.' } };
    }
    if (lower.includes('next')) {
      return { ok: true, command: { type: 'next', speech: 'Moving to the next stop.' } };
    }
    if (lower.includes('back') || lower.includes('previous') || lower.includes('prev')) {
      return { ok: true, command: { type: 'prev', speech: 'Going back.' } };
    }
    return {
      ok: false,
      command: { type: 'reset', speech: '' },
      spokenFallback: `I didn't catch that. Try saying "living room", "kitchen", "bedroom", or "next".`,
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
