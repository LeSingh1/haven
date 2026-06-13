import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TourShell from '@/components/tour/TourShell';
import { mockTour } from '@/lib/mockTour';

interface Props {
  params: Promise<{ tourId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tourId } = await params;
  // In mock mode, only tour-001 exists.
  const tour = tourId === mockTour.id ? mockTour : null;
  return {
    title: tour ? `Haven — Tour ${tour.address}` : 'Haven — Tour Not Found',
  };
}

export default async function TourPage({ params }: Props) {
  const { tourId } = await params;

  // Mock: resolve tour by id. Swap for a real fetch when Shaurya's API is live.
  const tour = tourId === mockTour.id ? mockTour : null;
  if (!tour) notFound();

  return <TourShell tour={tour} />;
}
