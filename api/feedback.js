import OpenAI from "openai";
import { buildFeedbackSystemPrompt } from "./lib/feedback-prompt.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function sanitizeTranscript(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 6000),
    }));
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

// Robustly extract first JSON object from model output
function extractJsonObject(text) {
  if (typeof text !== "string") return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
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

    // Accept both possible client payloads (so you can’t mismatch keys)
    const transcriptRaw =
      body.transcript ?? body.conversationHistory ?? body.conversation ?? [];
    const vignette =
      body.vignette ?? body.patientVignette ?? body.currentVignette ?? null;

    const transcript = sanitizeTranscript(transcriptRaw);
    if (transcript.length === 0) {
      return res.status(400).json({ error: "Empty transcript." });
    }

    const instructions = buildFeedbackSystemPrompt({
      vignette: isLikelyVignette(vignette) ? vignette : null,
    });

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analyze this informed-consent conversation transcript and return JSON only.\n\n" +
                JSON.stringify(
                  {
                    vignette: isLikelyVignette(vignette) ? vignette : null,
                    transcript,
                  },
                  null,
                  2
                ),
            },
          ],
        },
      ],
      temperature: 0.2,
      max_output_tokens: 1400,
    });

    const text = response.output_text ?? "";
    const feedback = extractJsonObject(text);

    if (!feedback) {
      return res.status(502).json({
        error: "Model did not return valid JSON.",
        details: text.slice(0, 500),
      });
    }

    return res.status(200).json({ success: true, feedback });
  } catch (err) {
    console.error("[/api/feedback] Error:", err);
    return res.status(err?.status ?? 500).json({
      error: err?.message ?? "Feedback generation failed.",
    });
  }
}
