// scripts/test-keyword-nav.ts — exercises the deterministic keyword nav fallback
// (the safety net used when Claude is unavailable). Run: npx tsx scripts/test-keyword-nav.ts
import { keywordNav } from '../lib/claude';

const WP = [
  { id: 'wp-entrance', label: 'Entrance' },
  { id: 'wp-living', label: 'Living Room' },
  { id: 'wp-kitchen', label: 'Kitchen' },
  { id: 'wp-bedroom', label: 'Bedroom' },
];

type Exp = { type: string; direction?: string; waypointId?: string };
const cases: [string, Exp][] = [
  ['take me to the kitchen', { type: 'goto', waypointId: 'wp-kitchen' }],
  ['show me the bedroom', { type: 'goto', waypointId: 'wp-bedroom' }],
  ['go to the living room', { type: 'goto', waypointId: 'wp-living' }],
  ['kitchen', { type: 'goto', waypointId: 'wp-kitchen' }],
  ['turn around', { type: 'turn', direction: 'around' }],
  ['spin around', { type: 'turn', direction: 'around' }],
  ['look behind me', { type: 'turn', direction: 'around' }],
  ['turn left', { type: 'turn', direction: 'left' }],
  ['look to your right', { type: 'turn', direction: 'right' }],
  ['turn right 90 degrees', { type: 'turn', direction: 'right' }],
  ['look up', { type: 'tilt', direction: 'up' }],
  ['look up at the ceiling', { type: 'tilt', direction: 'up' }],
  ['look down', { type: 'tilt', direction: 'down' }],
  ['move forward', { type: 'move', direction: 'forward' }],
  ['step forward', { type: 'move', direction: 'forward' }],
  ['back up', { type: 'move', direction: 'back' }],
  ['step back', { type: 'move', direction: 'back' }],
  ['reverse', { type: 'move', direction: 'back' }],
  ['scoot left', { type: 'move', direction: 'left' }],
  ['slide to the right', { type: 'move', direction: 'right' }],
  ['zoom in', { type: 'zoom', direction: 'in' }],
  ['get closer', { type: 'zoom', direction: 'in' }],
  ['zoom out', { type: 'zoom', direction: 'out' }],
  ['pull back', { type: 'zoom', direction: 'out' }],
  ['next', { type: 'next' }],
  ['continue', { type: 'next' }],
  ['keep going', { type: 'next' }],
  ['go back', { type: 'prev' }],
  ['previous room', { type: 'prev' }],
  ['start over', { type: 'reset' }],
  ['reset', { type: 'reset' }],
  ['look around', { type: 'look' }],
  ['is this place pet friendly', { type: 'unknown' }],
];

let pass = 0;
const fails: string[] = [];
for (const [phrase, exp] of cases) {
  const got = keywordNav(phrase, WP);
  const ok =
    got.type === exp.type &&
    (exp.direction === undefined || got.direction === exp.direction) &&
    (exp.waypointId === undefined || got.waypointId === exp.waypointId);
  if (ok) pass++;
  else fails.push(`  ✗ "${phrase}" -> ${got.type}/${got.direction ?? '-'}/${got.waypointId ?? '-'}  (expected ${exp.type}/${exp.direction ?? '-'}/${exp.waypointId ?? '-'})`);
}
console.log(`keywordNav: ${pass}/${cases.length} passed`);
if (fails.length) { console.log(fails.join('\n')); process.exit(1); }
console.log('All keyword fallback cases passed.');
