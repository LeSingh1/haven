// app/api/ask/route.ts — answer a natural-language question about a specific home.
// Uses Claude with the home's full facts brief; falls back to a deterministic
// fact-surfacing answer when no key is set or Claude fails. Returns text + spoken.
import { hasClaude, answerHouseQuestion } from '@/lib/claude';
import { mockListings } from '@/lib/mockListings';
import { houseBrief, getHouseFacts } from '@/lib/houseFacts';
import { logActivity } from '@/lib/activityStore';
import type { Listing } from '@/lib/types';

export const runtime = 'nodejs';

// Minimal fallback so Q&A still works without Claude: match the question to a fact.
function fallbackAnswer(q: string, l: Listing): string {
  const t = q.toLowerCase();
  const f = getHouseFacts(l);
  if (/price|worth|value|cost|how much|rent|afford/.test(t))
    return `It rents for $${l.rent.toLocaleString()} a month (about $${f.deposit.toLocaleString()} deposit), with an estimated market value around $${f.estimatedValue.toLocaleString()}.`;
  if (/bed|bath|room|size|big|square|sqft/.test(t))
    return `It's ${l.beds === 0 ? 'a studio' : `${l.beds}-bedroom`}, ${l.baths}-bath, ${l.sqft.toLocaleString()} square feet — about ${f.rooms} rooms.`;
  if (/wheelchair|accessible|stairs|grab|elevator|disab|ada|mobility|braille|hearing/.test(t))
    return l.accessibility.length
      ? `Accessibility features here: ${l.accessibility.join(', ')}.`
      : `This one has no specific accessibility features listed — I can have the realtor confirm.`;
  if (/pet|dog|cat/.test(t)) return `Pets: ${f.petPolicy}.`;
  if (/park|garage|car/.test(t)) return `Parking is ${f.parking.toLowerCase()}.`;
  if (/laundry|washer|dryer/.test(t)) return `Laundry is ${f.laundry.toLowerCase()}.`;
  if (/section 8|hud|lihtc|voucher|program|subsid/.test(t))
    return l.programs.length ? `It accepts ${l.programs.join(', ')}.` : `No housing programs are listed for this home.`;
  if (/year|built|old|new/.test(t)) return `It was built in ${f.yearBuilt}.`;
  if (/realtor|agent|contact|call|book|tour|see it/.test(t))
    return `The listing agent is ${f.realtor.name} at ${f.realtor.agency}. You can book a viewing with the “Book a viewing” button.`;
  return `Here's the gist: ${l.description}`;
}

export async function POST(req: Request): Promise<Response> {
  let body: { listingId?: string; question?: string; room?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* handled below */
  }
  const question = (body.question ?? '').trim();
  const listing = mockListings.find((l) => l.id === body.listingId);

  if (!question) return Response.json({ ok: false, answer: "I didn't catch your question.", spoken: "I didn't catch your question." });
  if (!listing) return Response.json({ ok: false, answer: "I can't find that home.", spoken: "I can't find that home." });

  let answer: string;
  if (hasClaude) {
    try {
      answer = await answerHouseQuestion(question, houseBrief(listing), body.room);
    } catch (e) {
      console.error('[ask] Claude failed, using fallback:', e);
      answer = fallbackAnswer(question, listing);
    }
  } else {
    answer = fallbackAnswer(question, listing);
  }

  logActivity('question', `Asked about ${listing.address}: "${question.slice(0, 80)}"`, { listingId: listing.id });
  return Response.json({ ok: true, answer, spoken: answer });
}
