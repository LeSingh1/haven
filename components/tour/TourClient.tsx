'use client';
// components/tour/TourClient.tsx — client wrapper that dynamically loads the
// (client-only, WebGL) SplatTour and hands it to Shivam's TourShell. Lives in a
// client component because next/dynamic({ ssr:false }) isn't allowed in a Server
// Component (the tour page).

import dynamic from 'next/dynamic';
import type { TourMeta } from '@/lib/types';
import TourShell from './TourShell';

const SplatTour = dynamic(() => import('./SplatTour'), { ssr: false });

export default function TourClient({ tour }: { tour: TourMeta }) {
  // TourShell's SplatTour prop is intentionally loose; cast the dynamic component through.
  return <TourShell tour={tour} SplatTour={SplatTour as never} />;
}
