// lib/tourData.ts — tour metadata for the 3D walkable homes. OWNED BY SHAURYA.
// Uses the shared TourMeta shape (lib/types.ts). EVERY listing is walkable: we
// build one tour per listing, cycling through five real indoor Gaussian splats
// STREAMED from a public Hugging Face dataset (dylanebert/3dgs, CORS-verified).
// Each tour shows that listing's own address; the splat is a representative
// interior (not a capture of that exact unit — framed as such in the UI).
//
// LICENSE / ATTRIBUTION: academic research scenes — Mip-NeRF 360 (Google) and
// Deep Blending (Hedman et al.). Fine for a NON-COMMERCIAL hackathon demo WITH
// attribution (see `credit`); not for commercial shipping. Swap a listing's
// splatUrl for a Luma/Marble capture (/splats/<file>.spz) to make it faithful.

import type { TourMeta, Waypoint } from './types';
import { mockListings } from './mockListings';

// Walkable interior — a REAL photographed capture (NOT an AI-generated room), so
// it reads like an actual home. Hosted LOCALLY (public/splats/room.splat) so it
// serves off the same origin (instant on localhost, edge-CDN on Vercel). We keep
// the walker near the spawn with TIGHT `bounds` so the view stays sharp and never
// smears off the captured path. A loading overlay (SplatTour) covers the decode.
interface Scene {
  url: string;
  credit: string;
  splatQuat: [number, number, number, number];
  spawn: { position: [number, number, number]; rotation: [number, number, number] };
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

// Mip-NeRF 360 "room" — a real captured living space (3DGS/COLMAP → Y-down, hence
// the 180° X flip). Tight bounds pin the camera to the densely-captured zone.
const REAL_ROOM: Scene = {
  url: '/splats/playroom.ply',
  credit: 'Scene: Deep Blending “playroom” (Hedman et al.) — real 30k capture, research/non-commercial',
  splatQuat: [1, 0, 0, 0],
  spawn: { position: [0, 0, 4], rotation: [0, 0, 0] },
  // Enough room to roam and feel movement, while still keeping the camera inside
  // the densely-captured zone (so it stays sharp and never smears off-path).
  bounds: { min: [-1.4, -0.6, 2.7], max: [1.4, 0.9, 4.4] },
};

// Waypoints are REAL, hand-tuned vantages of this captured room (verified lit and
// sharp). Each frames a distinct feature, so clicking/saying one actually FLIES
// you to that spot — not just a small pan. (The scene is one real room, so the
// labels name what's actually there rather than fictional kitchens/bedrooms.)
// rotation = [pitch, yaw, roll] in degrees. Voice goto/next/prev/reset + turn/
// tilt/move/zoom and free walking all compose on top of these.
function waypoints(): Waypoint[] {
  return [
    { id: 'wp-entrance', label: 'Entrance', position: [0, 0, 4], rotation: [0, 0, 0],
      description: 'Step inside — a bright, open, step-free room with a clear path.' },
    { id: 'wp-bookshelves', label: 'Bookshelves', position: [-0.2, 0, 3.7], rotation: [0, 60, 0],
      description: 'Built-in storage and full bookshelves along the left wall.' },
    { id: 'wp-desk', label: 'Study Desk', position: [0.05, 0, 3.5], rotation: [-4, -8, 0],
      description: 'A quiet desk and workspace beneath the window.' },
    { id: 'wp-play', label: 'Play Corner', position: [0.35, 0, 3.7], rotation: [-6, -26, 0],
      description: 'An open corner with low, reachable shelves and floor space.' },
  ];
}

// One tour per listing, keyed by the listing id (used as the tourId).
const BY_ID: Record<string, TourMeta> = {};
mockListings.forEach((l) => {
  const s = REAL_ROOM;
  BY_ID[l.id] = {
    id: l.id,
    listingId: l.id,
    address: `${l.address}, ${l.city}`,
    waypoints: waypoints(),
    splatUrl: s.url,
    splatQuat: s.splatQuat,
    spawn: s.spawn,
    bounds: s.bounds,
    credit: s.credit,
  };
});

export const TOURS: TourMeta[] = Object.values(BY_ID);

/** Look up a tour by id (the listing id). Returns null if unknown -> page 404s. */
export function getTour(id: string | undefined): TourMeta | null {
  return (id && BY_ID[id]) || null;
}
