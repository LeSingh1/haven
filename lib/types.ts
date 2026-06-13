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
}

export type NavCommandType = 'goto' | 'look' | 'reset' | 'next' | 'prev';

export interface NavCommand {
  type: NavCommandType;
  waypointId?: string;
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
