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

// The walkable interior. Hosted LOCALLY (public/splats/room.splat) so it serves
// off the same origin — instant on localhost, edge-CDN on Vercel — instead of
// streaming the 34MB file from Hugging Face (~45s on venue wifi, plus a CORS/HF
// uptime dependency at demo time). Source: Mip-NeRF 360 "room" scene (1.13M
// gaussians) from dylanebert/3dgs. A loading overlay (SplatTour) covers the
// few-second decode so the viewer never shows a bare black screen.
const ROOM_SPLAT = '/splats/room.splat';
const MIPNERF = 'Scene: Mip-NeRF 360 (Google) — research/non-commercial, via dylanebert/3dgs';

// Accessibility-themed waypoints. The scene is a single captured room, so we
// "tour" it by standing in the well-captured CENTRAL column (x≈0, z 2.8–4) and
// turning to face different areas — moving far sideways (old x=±3) flew the
// camera outside the splat's captured volume and rendered black. Voice
// goto/next/prev/reset and free walking (arrows/WASD) all work on top of these.
function waypoints(): Waypoint[] {
  return [
    { id: 'wp-entrance', label: 'Entrance', position: [0, 0, 4], rotation: [0, 0, 0],
      description: 'Step-free entry with a clear, wide path straight inside.' },
    { id: 'wp-living', label: 'Living Room', position: [0, 0, 2.8], rotation: [0, 0, 0],
      description: 'Open living space with room for a wheelchair turning radius.' },
    { id: 'wp-kitchen', label: 'Kitchen', position: [0, 0, 3.2], rotation: [0, -38, 0],
      description: 'Turn right toward the accessible kitchen with reachable counters.' },
    { id: 'wp-bedroom', label: 'Bedroom', position: [0, 0, 3.2], rotation: [0, 40, 0],
      description: 'Turn left toward the quiet bedroom with an accessible bath nearby.' },
  ];
}

// One tour per listing, keyed by the listing id (used as the tourId).
const BY_ID: Record<string, TourMeta> = {};
mockListings.forEach((l) => {
  // Every listing uses the locally-hosted "room" scene: it renders cleanly at the
  // generic spawn [0,0,4] and loads fast. Other captures need a hand-tuned spawn
  // pose to frame correctly (their coordinate frames differ); room guarantees a
  // clean render so no tour is ever a black screen.
  BY_ID[l.id] = {
    id: l.id,
    listingId: l.id,
    address: `${l.address}, ${l.city}`,
    waypoints: waypoints(),
    splatUrl: ROOM_SPLAT,
    spawn: { position: [0, 0, 4], rotation: [0, 0, 0] },
    // Keep the walker inside the well-captured volume so they can't wander into
    // the black void around the edges of the capture.
    bounds: { min: [-2.5, -1, -1], max: [2.5, 1.5, 5] },
    credit: MIPNERF,
  };
});

export const TOURS: TourMeta[] = Object.values(BY_ID);

/** Look up a tour by id (the listing id). Returns null if unknown -> page 404s. */
export function getTour(id: string | undefined): TourMeta | null {
  return (id && BY_ID[id]) || null;
}
