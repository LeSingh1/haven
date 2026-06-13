import type { Listing } from './types';

// Curated set of 10 affordable, accessible homes across the South Bay. Every one
// is tourable in 3D. Search filters + ranks within these 10 (see /api/search), so
// any query surfaces the best-fitting homes from this set.
export const mockListings: Listing[] = [
  // ── Milpitas ──────────────────────────────────────────────────────────────
  {
    id: 'lst-001',
    address: '421 Oak Street, Apt 2B',
    city: 'Milpitas', state: 'CA',
    rent: 1450, beds: 2, baths: 1, sqft: 820,
    accessibility: ['wheelchair', 'ground-floor', 'wide-doors', 'grab-bars'],
    programs: ['Section 8', 'LIHTC'],
    matchScore: 96, hasTour: true, tourId: 'lst-001',
    description: 'Spacious ground-floor 2BR with wide doorways and grab bars throughout. Quiet neighborhood, steps from Milpitas BART.',
    available: true,
  },
  {
    id: 'lst-002',
    address: '88 Calaveras Blvd, #310',
    city: 'Milpitas', state: 'CA',
    rent: 1200, beds: 1, baths: 1, sqft: 610,
    accessibility: ['elevator', 'wheelchair', 'hearing-loop'],
    programs: ['HUD', 'Section 8'],
    matchScore: 88, hasTour: true, tourId: 'lst-002',
    description: 'ADA-compliant 1BR with elevator access and hearing loop in lobby. On-site laundry, covered parking.',
    available: true,
  },
  {
    id: 'lst-008',
    address: '50 Ranch Drive, #12C',
    city: 'Milpitas', state: 'CA',
    rent: 1650, beds: 2, baths: 2, sqft: 950,
    accessibility: ['elevator', 'wheelchair', 'wide-doors', 'grab-bars', 'hearing-loop'],
    programs: ['HUD', 'Section 8', 'LIHTC'],
    matchScore: 91, hasTour: true, tourId: 'lst-008',
    description: 'Fully accessible 2BR/2BA with comprehensive ADA features. Community garden, fitness center, on-site management.',
    available: true,
  },

  // ── San Jose ────────────────────────────────────────────────────────────────
  {
    id: 'lst-012',
    address: '2050 Alum Rock Ave, #8',
    city: 'San Jose', state: 'CA',
    rent: 1125, beds: 1, baths: 1, sqft: 570,
    accessibility: ['elevator', 'ground-floor'],
    programs: ['Section 8', 'HUD'],
    matchScore: 80, hasTour: true, tourId: 'lst-012',
    description: 'Renovated 1BR in secure building. On-site laundry, small gym, near 680 freeway. Walk Score: 80.',
    available: true,
  },
  {
    id: 'lst-013',
    address: '1475 Foxworthy Ave',
    city: 'San Jose', state: 'CA',
    rent: 1595, beds: 2, baths: 2, sqft: 890,
    accessibility: ['elevator', 'wheelchair', 'grab-bars'],
    programs: ['Section 8', 'LIHTC'],
    matchScore: 86, hasTour: true, tourId: 'lst-013',
    description: 'Fully accessible 2BR/2BA. Each bedroom has en-suite grab bars. Pool, BBQ, gated parking.',
    available: true,
  },
  {
    id: 'lst-014',
    address: '3250 Story Rd, #112',
    city: 'San Jose', state: 'CA',
    rent: 925, beds: 0, baths: 1, sqft: 420,
    accessibility: ['elevator'],
    programs: ['LIHTC', 'HUD'],
    matchScore: 65, hasTour: true, tourId: 'lst-014',
    description: 'Studio with Murphy bed and updated kitchen. Income-restricted, income verification required. Transit Score: 91.',
    available: true,
  },

  // ── Santa Clara ───────────────────────────────────────────────────────────
  {
    id: 'lst-016',
    address: '2700 Augustine Dr, #3',
    city: 'Santa Clara', state: 'CA',
    rent: 1550, beds: 2, baths: 1, sqft: 800,
    accessibility: ['elevator', 'wheelchair'],
    programs: ['Section 8', 'LIHTC'],
    matchScore: 83, hasTour: true, tourId: 'lst-016',
    description: 'Spacious 2BR near the Apple campus. ADA-compliant building, pool, covered parking. Income-restricted.',
    available: true,
  },

  // ── Fremont ───────────────────────────────────────────────────────────────
  {
    id: 'lst-018',
    address: '39888 Mission Blvd, #7',
    city: 'Fremont', state: 'CA',
    rent: 1300, beds: 2, baths: 1, sqft: 750,
    accessibility: ['elevator', 'wheelchair', 'hearing-loop'],
    programs: ['HUD', 'Section 8'],
    matchScore: 81, hasTour: true, tourId: 'lst-018',
    description: 'Two-level 2BR in an accessible building. Hearing loop in the community room, near BART, large storage.',
    available: true,
  },
  {
    id: 'lst-019',
    address: '4480 Peralta Blvd, #22',
    city: 'Fremont', state: 'CA',
    rent: 1075, beds: 1, baths: 1, sqft: 520,
    accessibility: ['ground-floor', 'wide-doors'],
    programs: ['LIHTC'],
    matchScore: 69, hasTour: true, tourId: 'lst-019',
    description: 'Quiet 1BR on the ground floor in an established complex. Wide entrance, washer/dryer hookups, carport.',
    available: true,
  },
  {
    id: 'lst-020',
    address: '37000 Cedar Blvd, #305',
    city: 'Fremont', state: 'CA',
    rent: 1725, beds: 3, baths: 2, sqft: 1050,
    accessibility: ['elevator', 'wheelchair', 'wide-doors', 'grab-bars', 'braille-signage'],
    programs: ['HUD', 'Section 8', 'LIHTC'],
    matchScore: 90, hasTour: true, tourId: 'lst-020',
    description: 'Rare fully-accessible 3BR with braille signage. Community is deaf/blind friendly. 3 blocks to BART.',
    available: true,
  },
];
