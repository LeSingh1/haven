// lib/realtorCall.ts — the autonomous realtor call. OWNED BY SHAURYA (call-pipeline agent).
//
// Places a real outbound phone call through ElevenLabs Conversational AI over
// Twilio: our "Haven Realtor Booking" agent dials a number and, as a warm,
// human-sounding assistant, books a home viewing on the buyer's behalf — driven
// by per-listing dynamic variables.
//
// DEMO TARGET: it dials DEMO_REALTOR_PHONE (a phone you control, presented on the
// call as the listing's realtor) rather than the listing's demo "555" number.
// Falls back to a deterministic SIMULATION when the ElevenLabs creds are missing
// or the call fails, so the demo never hard-fails on stage.
//
// Endpoint (verified against ElevenLabs docs, June 2026):
//   POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call
//     headers: { 'xi-api-key': <key> }
//     body:    { agent_id, agent_phone_number_id, to_number,
//                conversation_initiation_client_data: { dynamic_variables } }
//     resp:    { success, message, conversation_id, callSid }
//   Status/transcript: GET https://api.elevenlabs.io/v1/convai/conversations/{id}
//
// Server-side only — imported by API routes (Node runtime); secrets never reach
// the client bundle.

import { mockListings } from './mockListings';

const EL_BASE = 'https://api.elevenlabs.io/v1';

export interface AppointmentLike {
  id: string;
  listingId: string;
  address: string;
  name: string; // buyer's name
  phone: string; // buyer's callback number
  preferredTime: string;
  message?: string;
  realtorName: string;
  realtorPhone: string;
}

export type CallStatus = 'calling' | 'completed' | 'failed' | 'simulated';

export interface CallResult {
  ok: boolean;
  status: CallStatus;
  conversationId: string | null;
  callSid: string | null;
  simulated: boolean;
  message: string;
  dialed?: string; // the number we actually dialed (the demo realtor)
}

// The working ElevenLabs API key currently lives in ELEVENLABS_SID (an sk_ key);
// fall back to the other names in case the env is relabelled later.
function elKey(): string | undefined {
  return (
    process.env.ELEVENLABS_SID ||
    process.env.ELEVENLABS_CLIENT_SECRET ||
    process.env.ELEVENLABS_API_KEY
  );
}

// Dynamic variables MUST cover every {{var}} the agent's prompt defines:
// caller_name, listing_address, listing_rent, listing_beds, listing_baths,
// accessibility_notes, preferred_time. All values are strings.
function buildDynamicVariables(a: AppointmentLike): Record<string, string> {
  const listing = mockListings.find((l) => l.id === a.listingId);
  return {
    caller_name: a.name,
    listing_address: a.address || (listing ? `${listing.address}, ${listing.city}` : 'the listing'),
    listing_rent: listing ? `$${listing.rent.toLocaleString()} a month` : 'an affordable rate',
    listing_beds: listing ? (listing.beds === 0 ? 'studio' : `${listing.beds}`) : 'a',
    listing_baths: listing ? `${listing.baths}` : '1',
    accessibility_notes: listing?.accessibility?.length
      ? listing.accessibility.join(', ')
      : 'no specific accessibility needs noted',
    preferred_time: a.preferredTime || 'flexible',
  };
}

/** Place the outbound call. NEVER throws — always returns a structured result. */
export async function placeRealtorCall(a: AppointmentLike): Promise<CallResult> {
  const key = elKey();
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
  // Locked demo decision: dial the number you control, presented as the realtor.
  const toNumber = process.env.DEMO_REALTOR_PHONE || a.realtorPhone;

  const simulated = (message: string): CallResult => ({
    ok: true,
    status: 'simulated',
    conversationId: null,
    callSid: null,
    simulated: true,
    message,
    dialed: toNumber,
  });

  if (!key || !agentId || !phoneNumberId || !toNumber) {
    return simulated('Simulated call — ElevenLabs/Twilio not fully configured.');
  }

  try {
    const res = await fetch(`${EL_BASE}/convai/twilio/outbound-call`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: agentId,
        agent_phone_number_id: phoneNumberId,
        to_number: toNumber,
        conversation_initiation_client_data: { dynamic_variables: buildDynamicVariables(a) },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      console.error('[realtorCall] outbound-call failed:', res.status, data);
      return {
        ok: false,
        status: 'failed',
        conversationId: data.conversation_id ?? null,
        callSid: data.callSid ?? null,
        simulated: false,
        message: data.message || `Call failed (HTTP ${res.status}).`,
        dialed: toNumber,
      };
    }
    return {
      ok: true,
      status: 'calling',
      conversationId: data.conversation_id ?? null,
      callSid: data.callSid ?? null,
      simulated: false,
      message: data.message || 'Call initiated.',
      dialed: toNumber,
    };
  } catch (e) {
    console.error('[realtorCall] error placing call:', e);
    return {
      ok: false,
      status: 'failed',
      conversationId: null,
      callSid: null,
      simulated: false,
      message: 'Network error placing the call.',
      dialed: toNumber,
    };
  }
}

export interface TranscriptTurn {
  role: string; // 'agent' | 'user'
  text: string;
}

export interface CallStatusResult {
  ok: boolean;
  status: string; // ElevenLabs conversation status (e.g. 'processing','done','failed')
  ended: boolean;
  transcript: TranscriptTurn[];
  message?: string;
}

/** Read live status + transcript of a conversation. NEVER throws. */
export async function getCallStatus(conversationId: string): Promise<CallStatusResult> {
  const key = elKey();
  if (!key) return { ok: false, status: 'unknown', ended: false, transcript: [], message: 'Not configured.' };
  try {
    const res = await fetch(`${EL_BASE}/convai/conversations/${conversationId}`, {
      headers: { 'xi-api-key': key },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, status: 'unknown', ended: false, transcript: [], message: `HTTP ${res.status}` };
    }
    const status: string = data.status ?? 'unknown';
    const raw: Array<{ role?: string; message?: string; text?: string }> = Array.isArray(data.transcript)
      ? data.transcript
      : [];
    const transcript: TranscriptTurn[] = raw
      .map((t) => ({ role: t.role ?? 'agent', text: t.message ?? t.text ?? '' }))
      .filter((t) => t.text);
    const ended = status === 'done' || status === 'failed' || status === 'completed';
    return { ok: true, status, ended, transcript };
  } catch (e) {
    console.error('[realtorCall] status error:', e);
    return { ok: false, status: 'unknown', ended: false, transcript: [], message: 'Network error.' };
  }
}
