// app/api/appointment/route.ts — books a realtor appointment for a listing.
// Validates + records the request and returns a confirmation. The actual outbound
// CALL to the realtor (Twilio dial + ElevenLabs voice agent that says "a buyer is
// interested in <address>, let's set up a viewing") is the OTHER agent's piece —
// see the clearly-marked hook below. This endpoint is the contract it plugs into.
import { logActivity } from '@/lib/activityStore';

export const runtime = 'nodejs';

interface Body {
  listingId?: string;
  address?: string;
  name?: string;
  phone?: string;
  preferredTime?: string;
  message?: string;
  realtorName?: string;
  realtorPhone?: string;
}

const PHONE_RE = /[\d().+\-\s]{7,}/;

export async function POST(req: Request): Promise<Response> {
  let b: Body = {};
  try {
    b = await req.json();
  } catch {
    /* handled below */
  }

  const name = (b.name ?? '').trim();
  const phone = (b.phone ?? '').trim();
  if (!name || !PHONE_RE.test(phone) || !b.listingId) {
    return Response.json(
      { ok: false, message: 'Please provide your name and a valid phone number.' },
      { status: 400 }
    );
  }

  const id = `apt-${Date.now()}`;
  const appointment = {
    id,
    listingId: b.listingId,
    address: b.address ?? '',
    name,
    phone,
    preferredTime: (b.preferredTime ?? 'Flexible').trim(),
    message: (b.message ?? '').trim().slice(0, 400),
    realtorName: b.realtorName ?? 'the listing agent',
    realtorPhone: b.realtorPhone ?? '',
    status: 'requested' as const,
    createdAt: Date.now(),
  };

  logActivity('appointment', `${name} requested a viewing of ${appointment.address || b.listingId}`, {
    appointmentId: id,
    realtor: appointment.realtorName,
    preferredTime: appointment.preferredTime,
  });

  // ────────────────────────────────────────────────────────────────────────────
  // OTHER AGENT HOOK — autonomous realtor call.
  // Place the outbound call here: Twilio dials `appointment.realtorPhone`, connects
  // an ElevenLabs voice agent that introduces the buyer (`name`), references the
  // listing (`appointment.address`), and proposes `appointment.preferredTime`. Then
  // update `appointment.status` ('calling' -> 'scheduled' / 'voicemail' / 'failed')
  // and (optionally) POST progress to /api/activity so the dashboard reflects it.
  // e.g. await placeRealtorCall(appointment)
  // ────────────────────────────────────────────────────────────────────────────

  const spoken =
    `Got it, ${name.split(' ')[0]}. I'm reaching out to ${appointment.realtorName} to set up a viewing` +
    `${appointment.preferredTime !== 'Flexible' ? ` ${appointment.preferredTime}` : ''}. ` +
    `They'll confirm at ${phone}.`;

  return Response.json({
    ok: true,
    appointment,
    confirmation: `Appointment request sent to ${appointment.realtorName}. You'll get a confirmation call at ${phone}.`,
    spoken,
  });
}
