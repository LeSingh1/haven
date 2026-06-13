import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TourClient from '@/components/tour/TourClient';
import { getTour } from '@/lib/tourData';

interface Props {
  params: Promise<{ tourId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tourId } = await params;
  const tour = getTour(tourId);
  return {
    title: tour ? `Haven — Tour: ${tour.address}` : 'Haven — Tour Not Found',
  };
}

export default async function TourPage({ params }: Props) {
  const { tourId } = await params;
  const tour = getTour(tourId);
  if (!tour) notFound();
  return <TourClient tour={tour} />;
}
