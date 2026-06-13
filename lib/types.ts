// lib/types.ts — frozen contract between Shivam (frontend) and Shaurya (backend)
// DO NOT EDIT — both teammates import from here.

export type AccessibilityFeature =
  | 'wheelchair'
  | 'elevator'
  | 'ground-floor'
  | 'wide-doors'
  | 'grab-bars'
  | 'hearing-loop'
  | 'braille-signage';

export interface Listing {
  id: string;
  address: string;
  city: string;
  state: string;
  rent: number;          // monthly USD
  beds: number;
  baths: number;
  sqft: number;
  accessibility: AccessibilityFeature[];
  programs: string[];    // e.g. 'Section 8', 'HUD', 'LIHTC'
  matchScore: number;    // 0–100
  hasTour: boolean;
  tourId?: string;
  imageUrl?: string;
  description: string;
  available: boolean;
}

export interface SearchQuery {
  transcript: string;
  maxRent?: number;
  minBeds?: number;
  accessibility?: AccessibilityFeature[];
  programs?: string[];
  city?: string;
}

export interface SearchResponse {
  ok: true;
  listings: Listing[];
  spokenSummary: string;
  totalCount: number;
}

export interface ApiError {
  ok: false;
  message: string;
  spokenFallback: string;
}

export interface Waypoint {
  id: string;
  label: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  description?: string;
}

export interface TourMeta {
  id: string;
  listingId: string;
  address: string;
  waypoints: Waypoint[];
  // ── splat fields (added by Shaurya for the 3D tour; optional so existing
  //    frontend/mock code is unaffected) ──
  /** URL of the Gaussian splat (.ply/.spz/.splat) — local /splats/* or a remote CDN. */
  splatUrl?: string;
  /** Initial camera pose. */
  spawn?: { position: [number, number, number]; rotation?: [number, number, number] };
  /** Splat orientation quaternion [x,y,z,w]. Different capture pipelines use
   *  different up-axes: 3DGS/COLMAP scenes are Y-down (need a 180° X flip,
   *  [1,0,0,0]); Marble/Forge .spz are Y-up (identity, [0,0,0,1]). Defaults to
   *  the 180° X flip. */
  splatQuat?: [number, number, number, number];
  /** Movement clamp so the user can't fly out of the scene. */
  bounds?: { min: [number, number, number]; max: [number, number, number] };
  /** Attribution line for the splat source (shown in the tour UI). */
  credit?: string;
}

// goto/look/reset/next/prev are the original waypoint actions; turn/tilt/move/
// zoom are relative camera motions so the whole home is explorable by voice.
export type NavCommandType =
  | 'goto'
  | 'look'
  | 'reset'
  | 'next'
  | 'prev'
  | 'turn'   // rotate the view in place (yaw)
  | 'tilt'   // look up / down (pitch)
  | 'move'   // glide without turning
  | 'zoom'   // dolly in / out
  | 'unknown';

export type NavDirection =
  | 'left'
  | 'right'
  | 'around' // 180°
  | 'up'
  | 'down'
  | 'forward'
  | 'back'
  | 'in'
  | 'out';

export interface NavCommand {
  type: NavCommandType;
  /** Set only for "goto" — the target waypoint id. */
  waypointId?: string;
  /** Set for turn/tilt/move/zoom — which way. */
  direction?: NavDirection;
  /** Magnitude: degrees for turn/tilt, meters for move, step factor for zoom. */
  amount?: number;
  /** Short, warm spoken confirmation. */
  speech: string;
}

export interface NavParseResponse {
  ok: boolean;
  command: NavCommand;
  spokenFallback?: string;
}

export interface SplatTourHandle {
  apply(cmd: NavCommand): void;
}

export type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface VoiceState {
  status: VoiceStatus;
  transcript: string;
  interim: string;
}
