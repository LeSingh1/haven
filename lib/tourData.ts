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

// MULTI-ROOM tour: every waypoint is its OWN real Gaussian-splat scene (a distinct
// room), hosted LOCALLY in public/splats so it serves same-origin (fast, no HF
// streaming dependency at demo time). SplatTour swaps the scene when you change
// rooms; a loading overlay covers each decode. TIGHT per-room `bounds` keep the
// camera in each scene's densely-captured zone so it stays sharp.
//
// Scenes are real academic captures: Deep Blending "playroom" (30k, sharp) +
// Mip-NeRF 360 room / kitchen / bonsai (7k). All 3DGS/COLMAP → Y-down, so a 180°
// X flip ([1,0,0,0]). spawn position/rotation are tuned from each scene's gaussian
// centroid (computed after the flip). Representative interiors, not captures of the
// exact unit (framed as such in the UI). rotation = [pitch, yaw, roll] in degrees.
function waypoints(): Waypoint[] {
  return [
    {
      id: 'wp-study', label: 'Study',
      splatUrl: '/splats/playroom.ply', splatQuat: [1, 0, 0, 0],
      position: [0, 0, 4], rotation: [0, 0, 0],
      bounds: { min: [-1.4, -0.6, 2.7], max: [1.4, 0.9, 4.4] },
      description: 'A bright home study — full bookshelves, a desk under the window, and a soft reading corner.',
    },
    {
      id: 'wp-living', label: 'Living Room',
      splatUrl: '/splats/room-7k.splat', splatQuat: [1, 0, 0, 0],
      position: [1.4, 0.8, 4.5], rotation: [0, 0, 0],
      bounds: { min: [-0.5, 0, 2], max: [3.4, 2.4, 5.5] },
      description: 'An open, step-free living space with room to turn a wheelchair.',
    },
    {
      id: 'wp-kitchen', label: 'Kitchen',
      splatUrl: '/splats/kitchen-7k.splat', splatQuat: [1, 0, 0, 0],
      position: [-0.2, 0.5, 2.6], rotation: [-12, 0, 0],
      bounds: { min: [-1.8, 0, -0.5], max: [1.2, 1.2, 3] },
      description: 'A full kitchen with reachable counters and clear floor space.',
    },
    {
      id: 'wp-nook', label: 'Reading Nook',
      splatUrl: '/splats/bonsai-7k.splat', splatQuat: [1, 0, 0, 0],
      position: [-0.3, 0.25, 1.8], rotation: [-16, 0, 0],
      bounds: { min: [-1, -0.2, -0.5], max: [0.5, 0.8, 2] },
      description: 'A quiet corner to sit and read among the plants.',
    },
  ];
}

const CREDIT =
  'Scenes: Deep Blending “playroom” (Hedman et al.) + Mip-NeRF 360 (Google) — real captures, research/non-commercial';

// One tour per listing, keyed by the listing id (used as the tourId). Top-level
// scene fields mirror the FIRST room so the viewer opens there.
const BY_ID: Record<string, TourMeta> = {};
mockListings.forEach((l) => {
  const rooms = waypoints();
  const first = rooms[0];
  BY_ID[l.id] = {
    id: l.id,
    listingId: l.id,
    address: `${l.address}, ${l.city}`,
    waypoints: rooms,
    splatUrl: first.splatUrl,
    splatQuat: first.splatQuat,
    spawn: { position: first.position, rotation: first.rotation },
    bounds: first.bounds,
    credit: CREDIT,
  };
});

export const TOURS: TourMeta[] = Object.values(BY_ID);

/** Look up a tour by id (the listing id). Returns null if unknown -> page 404s. */
export function getTour(id: string | undefined): TourMeta | null {
  return (id && BY_ID[id]) || null;
}
