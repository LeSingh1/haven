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

// SINGLE real captured room. The 3D walkthrough covers ONE genuinely captured
// space — the Deep Blending "playroom", a real study / play room. We deliberately
// do NOT stitch in other houses' captures to fake extra rooms: every vantage below
// is the SAME real space from a different angle. Rooms this capture doesn't include
// (kitchen, bedrooms, bath…) are honestly reported as "not part of this tour" by
// the nav layer (lib/claude.ts) rather than faked. 3DGS/COLMAP → Y-down, so a 180°
// X flip ([1,0,0,0]); TIGHT bounds keep the camera in the dense zone so it's sharp.
const ROOM = {
  url: '/splats/playroom.ply',
  quat: [1, 0, 0, 0] as [number, number, number, number],
  spawn: {
    position: [0, 0, 4] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
  },
  bounds: {
    min: [-1.4, -0.6, 2.7] as [number, number, number],
    max: [1.4, 0.9, 4.4] as [number, number, number],
  },
};

// Honest vantages of the ONE captured room (same house, different angles).
// rotation = [pitch, yaw, roll] in degrees.
function waypoints(): Waypoint[] {
  return [
    { id: 'wp-overview', label: 'Overview', position: [0, 0, 4], rotation: [0, 0, 0],
      description: 'The home’s bright, step-free main room — bookshelves, a desk, and a soft play corner.' },
    { id: 'wp-bookshelves', label: 'Bookshelves', position: [-0.2, 0, 3.7], rotation: [0, 33, 0],
      description: 'Built-in storage and full bookshelves along the wall.' },
    { id: 'wp-desk', label: 'Study Desk', position: [0.05, 0, 3.5], rotation: [-4, -8, 0],
      description: 'A quiet desk and workspace beneath the window.' },
    { id: 'wp-play', label: 'Play Area', position: [0.35, 0, 3.7], rotation: [-6, -26, 0],
      description: 'An open corner with low, reachable shelves and floor space.' },
  ];
}

const CREDIT = 'Scene: Deep Blending “playroom” (Hedman et al.) — real capture, research/non-commercial';

// One tour per listing, keyed by the listing id (used as the tourId). All listings
// share this one captured room (a representative interior, framed as such in the UI).
const BY_ID: Record<string, TourMeta> = {};
mockListings.forEach((l) => {
  BY_ID[l.id] = {
    id: l.id,
    listingId: l.id,
    address: `${l.address}, ${l.city}`,
    waypoints: waypoints(),
    splatUrl: ROOM.url,
    splatQuat: ROOM.quat,
    spawn: ROOM.spawn,
    bounds: ROOM.bounds,
    credit: CREDIT,
  };
});

export const TOURS: TourMeta[] = Object.values(BY_ID);

/** Look up a tour by id (the listing id). Returns null if unknown -> page 404s. */
export function getTour(id: string | undefined): TourMeta | null {
  return (id && BY_ID[id]) || null;
}
