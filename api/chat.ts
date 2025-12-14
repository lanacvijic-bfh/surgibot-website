import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";

// Create the OpenAI client once (reused across invocations)
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
};

function isChatMsg(x: any): x is ChatMsg {
  return (
    x &&
    (x.role === "user" || x.role === "assistant") &&
    typeof x.content === "string"
  );
}

function sanitizeMessages(raw: any): ChatMsg[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isChatMsg).map((m) => ({
    role: m.role,
    content: m.content.slice(0, 4000), // prevent huge payloads
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow only POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  // Helpful: prevent caching
  res.setHeader("Cache-Control", "no-store");

  // Check for API key early
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error:
        "Missing OPENAI_API_KEY. Add it in Vercel → Project Settings → Environment Variables, then redeploy.",
    });
  }

  try {
    const body = req.body ?? {};
    const scenario =
      typeof body.scenario === "string" && body.scenario.trim().length > 0
        ? body.scenario.trim().slice(0, 8000)
        : "General pre-op/informed consent conversation.";

    const messages = sanitizeMessages(body.messages);

    // If frontend didn't send anything yet, bootstrap with a starting user message
    const safeMessages: ChatMsg[] =
      messages.length > 0
        ? messages
        : [{ role: "user", content: "Hello." }];

    // Strong, consistent “virtual patient” behavior
    const instructions = `
You are role-playing as a PATIENT so a surgical resident can practice communication.

SCENARIO (patient case summary):
${scenario}

PATIENT ROLEPLAY RULES:
- Stay in character as the patient at all times.
- Speak like a real patient (not a clinician). Use everyday language.
- Ask realistic questions patients ask (risks, pain, anesthesia, recovery, alternatives, work, cost if relevant).
- If the resident uses medical jargon, ask them to explain in plain language.
- Be emotionally realistic (mild anxiety is common) without being extreme.
- Keep responses concise: usually 1–4 short sentences.
- Do not output checklists or teaching content unless the resident asks you directly (still as a patient).
- If the resident has not addressed benefits/risks/alternatives/next steps, naturally ask about what you still want to know.
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions,
      input: safeMessages,
      // You can tune these later:
      // temperature: 0.7,
      // max_output_tokens: 250,
    });

    return res.status(200).json({
      text: response.output_text ?? "",
    });
  } catch (err: any) {
    console.error("[/api/chat] Error:", err);

    // Return a more helpful error when possible
    const msg =
      typeof err?.message === "string" ? err.message : "Chat function failed.";

    return res.status(500).json({
      error: msg,
    });
  }
}
