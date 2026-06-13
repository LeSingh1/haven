// lib/track.ts — fire-and-forget client helper to record activity for the dashboard.
'use client';
import type { ActivityType } from './activityStore';

export function track(type: ActivityType, detail: string, meta?: Record<string, unknown>): void {
  try {
    void fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, detail, meta }),
      keepalive: true, // survive a navigation
    }).catch(() => {});
  } catch {
    /* never let logging break the UI */
  }
}
