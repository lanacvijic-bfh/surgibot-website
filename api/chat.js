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

    const messages = sanitizeMessages(body.messages);
    const safeMessages =
      messages.length > 0 ? messages : [{ role: "user", content: "Hello." }];

    const instructions = isLikelyVignette(vignette)
      ? buildPatientSystemPrompt(vignette)
      : `You are a surgical patient in an informed consent conversation. Stay in character, use simple language, ask questions, and keep replies short.`;

    const response = await client.responses.create({
    model: "gpt-5.2",   
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
