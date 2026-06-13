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
  bounds: { min: [-1.3, -0.6, 2.3], max: [1.3, 0.9, 4.3] },
};

// Real-capture waypoints in the room's frame: stand near the entry and TURN to
// face each area — staying in the dense zone keeps every view sharp. Voice
// goto/next/prev/reset and free walking (arrows/WASD) all work on top of these.
function waypoints(): Waypoint[] {
  return [
    { id: 'wp-entrance', label: 'Entrance', position: [0, 0, 4], rotation: [0, 0, 0],
      description: 'Step-free entry with a clear, wide path straight inside.' },
    { id: 'wp-living', label: 'Living Room', position: [0, 0, 3], rotation: [0, 0, 0],
      description: 'Open living space with room for a wheelchair turning radius.' },
    { id: 'wp-kitchen', label: 'Kitchen', position: [0, 0, 3.3], rotation: [0, -32, 0],
      description: 'Turn right toward the accessible kitchen with reachable counters.' },
    { id: 'wp-bedroom', label: 'Bedroom', position: [0, 0, 3.3], rotation: [0, 32, 0],
      description: 'Turn left toward the quiet bedroom with an accessible bath nearby.' },
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
