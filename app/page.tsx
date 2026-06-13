import type { Metadata } from 'next';
import LandingHero from '@/components/LandingHero';

export const metadata: Metadata = {
  title: 'Haven — Find AND tour an affordable home using only your voice',
  description:
    'Voice-first, accessibility-forward affordable housing search. Built for the Housing Dignity track at Milpitas Hacks 3.',
};

export default function LandingPage() {
  return <LandingHero />;
}
