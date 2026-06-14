// app/api/appointment/route.ts — books a realtor appointment for a listing.
// Validates + records the request and returns a confirmation. The actual outbound
// CALL to the realtor (Twilio dial + ElevenLabs voice agent that says "a buyer is
// interested in <address>, let's set up a viewing") is the OTHER agent's piece —
// see the clearly-marked hook below. This endpoint is the contract it plugs into.
import { logActivity } from '@/lib/activityStore';
import { placeRealtorCall } from '@/lib/realtorCall';
import { logCall } from '@/lib/callsStore';

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

  // ── Autonomous realtor call (Shaurya's call pipeline) ──
  // The ElevenLabs "Haven Realtor Booking" agent dials DEMO_REALTOR_PHONE over
  // Twilio and books the viewing, driven by per-listing dynamic variables.
  // placeRealtorCall NEVER throws — it returns a simulated result if creds are
  // missing or the call fails, so a booking always succeeds for the demo.
  const call = await placeRealtorCall(appointment);
  logActivity(
    'appointment',
    `Voice agent ${call.simulated ? 'simulated a call to' : 'is calling'} ${appointment.realtorName} about ${appointment.address || b.listingId}`,
    { appointmentId: id, conversationId: call.conversationId, simulated: call.simulated, dialed: call.dialed }
  );
  // Record the call for Call History — with conversationId the transcript can be
  // pulled later via /api/appointment/status.
  logCall({
    conversationId: call.conversationId,
    simulated: call.simulated,
    listingId: appointment.listingId,
    address: appointment.address,
    realtorName: appointment.realtorName,
    realtorPhone: appointment.realtorPhone,
    callerName: appointment.name,
    preferredTime: appointment.preferredTime,
    dialed: call.dialed,
  });

  const spoken =
    `Got it, ${name.split(' ')[0]}. I'm reaching out to ${appointment.realtorName} to set up a viewing` +
    `${appointment.preferredTime !== 'Flexible' ? ` ${appointment.preferredTime}` : ''}. ` +
    `They'll confirm at ${phone}.`;

  return Response.json({
    ok: true,
    appointment,
    call: {
      conversationId: call.conversationId,
      status: call.status,
      simulated: call.simulated,
      dialed: call.dialed,
    },
    confirmation: `Appointment request sent to ${appointment.realtorName}. You'll get a confirmation call at ${phone}.`,
    spoken,
  });
}
