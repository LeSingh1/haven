// scripts/verify-claude.ts — confirm the ANTHROPIC_API_KEY works end to end.
// Run:  npm run verify:claude    (or: npx tsx scripts/verify-claude.ts)
// Loads .env.local itself, then pings claude-opus-4-8 with a 1-line request.

import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

// Load .env.local without any extra dependency.
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* no .env.local — fall through to the missing-key message */
}

const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error("❌ ANTHROPIC_API_KEY not found. Add it to .env.local and retry.");
  process.exit(1);
}

const client = new Anthropic({ apiKey: key });
console.log("Pinging claude-opus-4-8 …");

async function main() {
  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16,
      messages: [{ role: "user", content: "Reply with exactly: ok" }],
    });
    const block = msg.content.find((b) => b.type === "text");
    const text = block && "text" in block ? block.text : "(non-text reply)";
    console.log("✅ Claude reachable. Model replied:", text.trim());
  } catch (e) {
    console.error("❌ Claude call failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

main();
