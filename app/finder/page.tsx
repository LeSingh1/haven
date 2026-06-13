import type { Metadata } from 'next';
import FinderShell from '@/components/finder/FinderShell';

export const metadata: Metadata = {
  title: 'Haven — Find a Home',
  description: 'Search for affordable, accessible housing by voice or text.',
};

export default function FinderPage() {
  return <FinderShell />;
}
