// lib/commandTypes.ts — shared types for the app-wide voice command brain.
// Kept separate from lib/claude.ts (which imports the server-only Anthropic SDK)
// so client code (lib/command.ts, the shells) can import these types safely.

export type AppAction =
  | 'search' // describe a home to find (finder)
  | 'open_house' // open / view / tour a specific result
  | 'go_page' // navigate to another screen
  | 'tour_nav' // move/look in the 3D space (tour) — handled by the nav parser
  | 'question' // ask about the home — handled by Q&A
  | 'book' // book a viewing and/or call the realtor
  | 'none';

export type AppPage = 'finder' | 'dashboard' | 'home';

/** What the shells know about the user's current context, sent with each command. */
export interface AppCommandContext {
  page: 'finder' | 'tour';
  /** Current search results (finder) so "the first / cheapest / Milpitas one" resolves to an id. */
  listings?: { id: string; address: string; city: string; rent: number; beds: number }[];
  /** The listing being toured (tour). */
  listingId?: string;
}

export interface AppCommand {
  action: AppAction;
  /** Set only for open_house — a real listing id from the provided results. */
  houseId?: string;
  /** Set only for go_page. */
  page?: AppPage;
  /** Set for book — any time the user mentioned ("this weekend", "tomorrow"). */
  preferredTime?: string;
  /** Short, warm spoken confirmation. */
  speech: string;
}
