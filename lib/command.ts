'use client';
// lib/command.ts — client helper for the app-wide voice command brain.
// Calls /api/command and returns the classified AppCommand. On any failure it
// degrades to "search" (finder) / "question" (tour) so the existing handlers run.
import type { AppCommand, AppCommandContext } from './commandTypes';

export async function parseCommand(transcript: string, context: AppCommandContext): Promise<AppCommand> {
  try {
    const res = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, context }),
    });
    return (await res.json()) as AppCommand;
  } catch {
    return { action: context.page === 'finder' ? 'search' : 'question', speech: '' };
  }
}
