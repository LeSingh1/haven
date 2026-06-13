// lib/houseFacts.ts — rich, demo-ready facts for a listing, derived deterministically
// from the existing Listing data (no Math.random, so SSR and client agree). Stands in
// for a real Zillow detail payload; the House info panel + Q&A both read from here.
import type { Listing } from './types';

export interface Realtor {
  name: string;
  agency: string;
  phone: string;
}

export interface HouseFacts {
  estimatedValue: number; // market valuation (USD)
  monthlyRent: number;
  deposit: number;
  beds: number;
  baths: number;
  sqft: number;
  rooms: number; // beds + baths + living + kitchen
  yearBuilt: number;
  parking: string;
  laundry: string;
  petPolicy: string;
  pricePerSqft: number;
  realtor: Realtor;
  highlights: string[];
}

const REALTORS: Realtor[] = [
  { name: 'Maria Delgado', agency: 'South Bay Affordable Homes', phone: '(408) 555-0142' },
  { name: 'James Okonkwo', agency: 'Bayview Accessible Living', phone: '(408) 555-0188' },
  { name: 'Priya Nair', agency: 'Dignity Housing Partners', phone: '(510) 555-0119' },
  { name: 'Daniel Reyes', agency: 'Valley Access Realty', phone: '(669) 555-0173' },
];

const ACCESS_LABEL: Record<string, string> = {
  wheelchair: 'Wheelchair accessible',
  elevator: 'Elevator access',
  'ground-floor': 'Ground floor, no stairs',
  'wide-doors': 'Wide doorways',
  'grab-bars': 'Grab bars installed',
  'hearing-loop': 'Hearing loop',
  'braille-signage': 'Braille signage',
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function getHouseFacts(l: Listing): HouseFacts {
  const h = hash(l.id);
  const d = l.description.toLowerCase();
  const estimatedValue = Math.round((l.rent * 12 * 16) / 1000) * 1000; // ~16x gross rent
  const parking = /carport/.test(d) ? 'Carport'
    : /assigned parking/.test(d) ? 'Assigned'
    : /covered parking|garage|parking/.test(d) ? 'Covered'
    : 'Street';
  const laundry = /laundry in unit|washer\/dryer|hookups|in unit/.test(d) ? 'In-unit'
    : /on-site laundry|laundry/.test(d) ? 'On-site'
    : 'Shared';
  const petPolicy = /pet-friendly|pet friendly/.test(d) ? 'Pets welcome' : 'Ask realtor';

  const highlights: string[] = [];
  for (const f of l.accessibility) if (ACCESS_LABEL[f]) highlights.push(ACCESS_LABEL[f]);
  if (l.programs.length) highlights.push(`Accepts ${l.programs.join(', ')}`);
  if (/bart|caltrain|vta|light rail|transit/.test(d)) highlights.push('Near transit');

  return {
    estimatedValue,
    monthlyRent: l.rent,
    deposit: Math.round(l.rent * 1.5),
    beds: l.beds,
    baths: l.baths,
    sqft: l.sqft,
    rooms: l.beds + l.baths + 2,
    yearBuilt: 1958 + (h % 55),
    parking,
    laundry,
    petPolicy,
    pricePerSqft: Math.round(estimatedValue / l.sqft),
    realtor: REALTORS[h % REALTORS.length],
    highlights,
  };
}

/** Compact plain-text brief of everything we know — fed to Claude for Q&A. */
export function houseBrief(l: Listing): string {
  const f = getHouseFacts(l);
  const bed = l.beds === 0 ? 'studio' : `${l.beds}-bedroom`;
  return [
    `Address: ${l.address}, ${l.city}, ${l.state}`,
    `Type: ${bed}, ${l.baths} bath, ${l.sqft} sq ft (~${f.rooms} rooms)`,
    `Rent: $${l.rent}/month. Security deposit: $${f.deposit}. Estimated market value: $${f.estimatedValue.toLocaleString()} ($${f.pricePerSqft}/sq ft).`,
    `Year built: ${f.yearBuilt}. Parking: ${f.parking}. Laundry: ${f.laundry}. Pets: ${f.petPolicy}.`,
    `Accessibility: ${l.accessibility.length ? l.accessibility.join(', ') : 'none listed'}.`,
    `Housing programs accepted: ${l.programs.length ? l.programs.join(', ') : 'none'}.`,
    `Availability: ${l.available ? 'available now' : 'not currently available'}.`,
    `Listing description: ${l.description}`,
    `Listing agent: ${f.realtor.name}, ${f.realtor.agency}, ${f.realtor.phone}.`,
  ].join('\n');
}
