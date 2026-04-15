import OpenAI from "openai";
import { buildPatientSystemPrompt } from "./lib/patient-prompt.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function toChatCompletionMessages(instructions, messages) {
  return [
    { role: "developer", content: instructions },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

function extractResponseText(response) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const outputs = Array.isArray(response?.output) ? response.output : [];
  const chunks = [];

  for (const item of outputs) {
    if (item?.type !== "message" || item?.role !== "assistant") continue;
    const content = Array.isArray(item.content) ? item.content : [];

    for (const block of content) {
      if (block?.type === "output_text" && typeof block.text === "string") {
        chunks.push(block.text);
      }
      if (block?.type === "refusal" && typeof block.refusal === "string") {
        chunks.push(block.refusal);
      }
    }
  }

  return chunks.join("\n").trim();
}

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
      : `You are a surgical patient in an informed consent conversation. Stay in character at all times, use simple language ask questions, and keep replies short.`;

    const response = await client.responses.create({
      model: "gpt-5",
      instructions,
      input: safeMessages,
      max_output_tokens: 500,
      reasoning: { effort: "low" },
    });

    let text = extractResponseText(response);
    if (!text) {
      console.error("[/api/chat] Empty model response:", {
        model: "gpt-5",
        status: response?.status,
        output: response?.output,
      });

      const fallback = await client.chat.completions.create({
        model: "gpt-5",
        messages: toChatCompletionMessages(instructions, safeMessages),
        max_completion_tokens: 500,
        reasoning_effort: "low",
      });

      text = fallback.choices?.[0]?.message?.content?.trim?.() ?? "";
    }

    if (!text) {
      return res.status(502).json({
        error: "The model returned an empty response. Please try again.",
      });
    }

    return res.status(200).json({ text });
  } catch (err) {
    console.error("[/api/chat] Error:", err);
    return res.status(err?.status ?? 500).json({
      error: err?.message ?? "Chat function failed.",
    });
  }
}
