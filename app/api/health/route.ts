// app/api/health/route.ts — liveness + Claude reachability. OWNED BY SHAURYA.
// Used at the first integration checkpoint to confirm the API key works end to
// end before either half wires real calls. GET so it's trivial to hit in a browser.

import { hasClaude, pingClaude } from "@/lib/claude";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const ts = new Date().toISOString();
  if (!hasClaude) {
    // No key configured — the app still works via keyword fallback.
    return Response.json({ ok: true, claude: "no_api_key", fallback: "keyword", ts });
  }
  const reachable = await pingClaude();
  return Response.json({ ok: true, claude: reachable ? "reachable" : "unreachable", ts });
}
