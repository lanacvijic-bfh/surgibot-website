import OpenAI from "openai";
import { buildPatientSystemPrompt } from "./lib/patient-prompt.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

function isLikelyVignette(v) {
  return (
    v &&
    typeof v === "object" &&
    v.demographics &&
    v.clinical_profile &&
    typeof v.demographics?.name === "string" &&
    typeof v.clinical_profile?.planned_surgery === "string"
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  res.setHeader("Cache-Control", "no-store");

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error:
        "Missing OPENAI_API_KEY. Add it in Vercel → Project Settings → Environment Variables, then redeploy.",
    });
  }

  try {
    const body = req.body ?? {};
    const vignette = body.vignette;

    const scenario =
      typeof body.scenario === "string" && body.scenario.trim().length > 0
        ? body.scenario.trim().slice(0, 8000)
        : "General pre-op/informed consent conversation.";

    const messages = sanitizeMessages(body.messages);
    const safeMessages =
      messages.length > 0 ? messages : [{ role: "user", content: "Hello." }];

    const instructions = isLikelyVignette(vignette)
      ? buildPatientSystemPrompt(vignette)
      : `You are role-playing as a PATIENT so a surgical resident can practice communication.

SCENARIO:
${scenario}

Rules:
- Stay in character as the patient.
- Use simple, everyday language.
- Ask realistic questions (risks, anesthesia, recovery, alternatives).
- Ask for clarification if jargon is used.
- Keep replies concise (1–4 sentences).`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions,
      input: safeMessages,
      max_output_tokens: 250,
      temperature: 0.7,
    });

    return res.status(200).json({ text: response.output_text ?? "" });
  } catch (err) {
    console.error("[/api/chat] Error:", err);
    return res.status(err?.status ?? 500).json({
      error: err?.message ?? "Chat function failed.",
    });
  }
}
