import type { TourMeta } from './types';

export const mockTour: TourMeta = {
  id: 'tour-001',
  listingId: 'lst-001',
  address: '421 Oak Street, Apt 2B, Milpitas CA',
  waypoints: [
    {
      id: 'wp-entrance',
      label: 'Front Entrance',
      position: [0, 1.6, 0],
      rotation: [0, 0, 0],
      description: 'Wide entrance door with grab bar and step-free access from parking.',
    },
    {
      id: 'wp-living',
      label: 'Living Room',
      position: [3, 1.6, 2],
      rotation: [0, -30, 0],
      description: 'Open living area with natural light. Hardwood floors, wheelchair turning radius clear.',
    },
    {
      id: 'wp-kitchen',
      label: 'Kitchen',
      position: [6, 1.6, 1],
      rotation: [0, 90, 0],
      description: 'Accessible kitchen with lowered counters, pull-out shelves, and lever handles.',
    },
    {
      id: 'wp-bedroom',
      label: 'Primary Bedroom',
      position: [3, 1.6, 6],
      rotation: [0, 180, 0],
      description: 'Spacious bedroom with grab bars in the en-suite bath and roll-in shower.',
    },
  ],
};
