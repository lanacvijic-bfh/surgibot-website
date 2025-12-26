// api/feedback.js
import OpenAI from "openai";
import { buildFeedbackSystemPrompt } from "./lib/feedback-prompt.js";

/**
 * Vercel Serverless Function
 * POST /api/feedback
 *
 * Expects JSON body:
 * {
 *   transcript: string | Array<{ role?: string, speaker?: string, content?: string, message?: string }>,
 *   vignette?: any,
 *   requiredItems?: string[]   // optional override of MUST-CHECK items
 * }
 *
 * Returns structured JSON feedback (see feedback-prompt.js schema).
 */

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function setNoCache(res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
}

function safeJsonParse(maybeJsonText) {
  if (typeof maybeJsonText !== "string") throw new Error("Model response was not text.");
  try {
    return JSON.parse(maybeJsonText);
  } catch {
    // Best-effort extraction if the model wrapped JSON with extra text
    const start = maybeJsonText.indexOf("{");
    const end = maybeJsonText.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const sliced = maybeJsonText.slice(start, end + 1);
      return JSON.parse(sliced);
    }
    throw new Error("Model did not return valid JSON.");
  }
}

/**
 * Normalize transcript to an indexed array so the model can cite turn indices.
 * We also build a compact text representation to reduce ambiguity.
 */
function normalizeTranscript(transcript) {
  if (!transcript) return { turns: [], text: "" };

  // If transcript is already a string, we keep it as a blob.
  if (typeof transcript === "string") {
    return { turns: null, text: transcript.trim() };
  }

  if (!Array.isArray(transcript)) {
    // fallback
    return { turns: null, text: String(transcript) };
  }

  const turns = transcript
    .map((t, idx) => {
      const speaker = (t?.speaker || t?.role || "unknown").toLowerCase();
      const content = (t?.content || t?.message || "").toString().trim();
      return { turn_index: idx, speaker, content };
    })
    .filter((t) => t.content.length > 0);

  const text = turns
    .map((t) => `[${t.turn_index}] ${t.speaker}: ${t.content}`)
    .join("\n");

  return { turns, text };
}

function validateResponseShape(obj) {
  // Lightweight sanity checks (don’t overdo it; model should be constrained by prompt)
  if (!obj || typeof obj !== "object") throw new Error("Feedback JSON was not an object.");
  if (!Array.isArray(obj.coverage_checklist)) throw new Error("Missing coverage_checklist.");
  if (typeof obj.overall_score_0_100 !== "number") throw new Error("Missing overall_score_0_100.");
  return obj;
}

export default async function handler(req, res) {
  setNoCache(res);

  // Optional: allow preflight if you ever call cross-origin
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({ error: "OPENAI_API_KEY is not set on the server." });
      return;
    }

    const { transcript, vignette = null, requiredItems } = req.body || {};
    if (!transcript) {
      res.status(400).json({ error: "Missing required field: transcript" });
      return;
    }

    const { turns, text: transcriptText } = normalizeTranscript(transcript);

    const systemPrompt = buildFeedbackSystemPrompt({ requiredItems });

    // Provide the model both (a) indexed text, and (b) the raw structured turns if available.
    const userPayload = {
      vignette,
      transcript_indexed_text: transcriptText,
      transcript_turns: turns, // null if transcript was a blob
      notes: [
        "Use turn_index from transcript_turns if available.",
        "If transcript_turns is null, set turn_index to -1 and include only quotes.",
      ],
    };

    const completion = await client.chat.completions.create({
      // Use the same key; model choice is independent.
      // Pick a model you already use; "gpt-4.1-mini" is a good cost/quality default for eval feedback.
      model: "gpt-4.1-mini",
      temperature: 0.2,
      // This nudges the model to output a JSON object.
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            "Generate feedback for this informed consent discussion. Return ONLY the JSON object.\n\n" +
            JSON.stringify(userPayload),
        },
      ],
    });

    const text = completion?.choices?.[0]?.message?.content ?? "";
    const parsed = safeJsonParse(text);
    const validated = validateResponseShape(parsed);

    res.status(200).json(validated);
  } catch (err) {
    console.error("api/feedback error:", err);
    res.status(500).json({
      error: "Feedback generation failed",
      details: err?.message || String(err),
    });
  }
}
