'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockListings } from '@/lib/mockListings';
import { getHouseFacts } from '@/lib/houseFacts';
import { EASE_OUT } from '@/lib/motion';

interface Props {
  listingId: string;
  currentRoom: string;
  onBook: () => void;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-white/45">{label}</span>
      <span className="text-sm font-semibold text-white/90 tabular-nums">{value}</span>
    </div>
  );
}

/** Apple-glass house facts card pinned top-right of the tour. */
export default function HouseInfoPanel({ listingId, currentRoom, onBook }: Props) {
  const [open, setOpen] = useState(true);
  const listing = mockListings.find((l) => l.id === listingId);
  if (!listing) return null;
  const f = getHouseFacts(listing);
  const bed = listing.beds === 0 ? 'Studio' : `${listing.beds} bd`;

  return (
    <div className="pointer-events-auto absolute right-3 top-20 z-20 w-[300px] max-w-[calc(100vw-1.5rem)] sm:right-6 sm:top-6">
      <div
        className="overflow-hidden rounded-2xl border border-white/15 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.7)]"
        style={{ background: 'rgba(20,22,28,0.55)', backdropFilter: 'blur(22px) saturate(140%)' }}
      >
        {/* Header */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
          aria-expanded={open}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{listing.address}</p>
            <p className="truncate text-xs text-white/55">{listing.city}, {listing.state}</p>
          </div>
          <span className="shrink-0 rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
            {currentRoom}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden
            className={`shrink-0 text-white/50 transition-transform ${open ? '' : '-rotate-90'}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
            >
              <div className="space-y-4 px-4 pb-4">
                {/* Valuation */}
                <div className="flex items-end justify-between border-t border-white/10 pt-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-white/45">Est. value</span>
                    <p className="text-2xl font-bold tracking-tight text-white">${f.estimatedValue.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-white/45">Rent</span>
                    <p className="text-lg font-semibold text-accent">${listing.rent.toLocaleString()}<span className="text-xs font-normal text-white/50">/mo</span></p>
                  </div>
                </div>

                {/* Stat grid */}
                <div className="grid grid-cols-4 gap-2">
                  <Stat label="Beds" value={bed.replace(' bd', '')} />
                  <Stat label="Baths" value={`${listing.baths}`} />
                  <Stat label="Sq ft" value={listing.sqft.toLocaleString()} />
                  <Stat label="Rooms" value={`${f.rooms}`} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Built" value={`${f.yearBuilt}`} />
                  <Stat label="Parking" value={f.parking} />
                  <Stat label="Laundry" value={f.laundry} />
                </div>

                {/* Highlights */}
                {f.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {f.highlights.slice(0, 5).map((h) => (
                      <span key={h} className="rounded-full border border-white/12 bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/75">
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                {/* Realtor + CTA */}
                <div className="border-t border-white/10 pt-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/45">Listed by</p>
                  <p className="text-xs text-white/80">{f.realtor.name} · {f.realtor.agency}</p>
                  <button
                    type="button"
                    onClick={onBook}
                    className="btn-neon mt-3 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    Book a viewing
                  </button>
                  <p className="mt-1.5 text-center text-[10px] text-white/40">An AI agent calls the realtor for you</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
