// lib/tourData.ts — tour metadata for the 3D walkable homes. OWNED BY SHAURYA.
// Uses the shared TourMeta shape (lib/types.ts). Five indoor scenes are STREAMED
// directly from a public Hugging Face dataset (dylanebert/3dgs) — CORS-verified,
// so no large files live in the repo. Spark loads .splat over https natively.
//
// LICENSE / ATTRIBUTION: academic research scenes — Mip-NeRF 360 (Google) and
// Deep Blending (Hedman et al.). Fine for a NON-COMMERCIAL hackathon demo WITH
// attribution (see each `credit`); not for commercial shipping. To use a faithful
// or owned scene instead, point splatUrl at /splats/<file>.spz (a Luma/Marble export).
//
// REFINE A SCENE: spawn/bounds/waypoints are reasonable DEFAULTS; the coordinate
// frame differs per scene. Open a tour, walk with arrow keys, press "p" to log
// camera.position + camera.quaternion, and paste better numbers below.

import type { TourMeta, Waypoint } from './types';

const HF = 'https://huggingface.co/datasets/dylanebert/3dgs/resolve/main';
const MIPNERF = 'Scene: Mip-NeRF 360 (Google) — research/non-commercial, via dylanebert/3dgs';
const DEEPBLEND = 'Scene: Deep Blending (Hedman et al.) — research, via dylanebert/3dgs';

// Generic, accessibility-themed waypoints reused per home. Positions are spread
// guesses (each scene is one room) — voice "next/prev/reset/goto" all work, and
// arrow keys let you walk freely regardless.
function waypoints(): Waypoint[] {
  return [
    { id: 'wp-entrance', label: 'Entrance', position: [0, 0, 4], rotation: [0, 0, 0],
      description: 'Step-free entry with a clear, wide path inside.' },
    { id: 'wp-living', label: 'Living Room', position: [0, 0, 1.5], rotation: [0, 0, 0],
      description: 'Open living space with room for a wheelchair turning radius.' },
    { id: 'wp-kitchen', label: 'Kitchen', position: [3, 0, 2], rotation: [0, -35, 0],
      description: 'Accessible kitchen area with reachable counters.' },
    { id: 'wp-bedroom', label: 'Bedroom', position: [-3, 0, 2.5], rotation: [0, 35, 0],
      description: 'Quiet bedroom with an accessible bath nearby.' },
  ];
}

function homeTour(
  id: string,
  listingId: string,
  address: string,
  file: string,
  credit: string
): TourMeta {
  return {
    id,
    listingId,
    address,
    waypoints: waypoints(),
    splatUrl: `${HF}/${file}`,
    spawn: { position: [0, 0, 4], rotation: [0, 0, 0] },
    bounds: { min: [-15, -8, -15], max: [15, 8, 15] },
    credit,
  };
}

// Five streamable indoor homes, mapped to listings in lib/mockListings.ts.
export const TOURS: TourMeta[] = [
  homeTour('tour-001', 'lst-001', '421 Oak Street, Apt 2B, Milpitas', 'room/room-7k.splat', MIPNERF),
  homeTour('tour-002', 'lst-008', '50 Ranch Drive, #12C, Milpitas', 'playroom/playroom-7k.splat', DEEPBLEND),
  homeTour('tour-003', 'lst-013', '1475 Foxworthy Ave, San Jose', 'kitchen/kitchen-7k.splat', MIPNERF),
  homeTour('tour-004', 'lst-004', '1200 Dixon Landing Rd, #44, Milpitas', 'counter/counter-7k.splat', MIPNERF),
  homeTour('tour-005', 'lst-020', '37000 Cedar Blvd, #305, Fremont', 'bonsai/bonsai-7k-mini.splat', MIPNERF),
];

const BY_ID: Record<string, TourMeta> = Object.fromEntries(TOURS.map((t) => [t.id, t]));

/** Look up a tour by id (returns null if unknown — the page calls notFound()). */
export function getTour(id: string | undefined): TourMeta | null {
  return (id && BY_ID[id]) || null;
}
