import OpenAI from "openai";
import { buildFeedbackSystemPrompt } from "./lib/feedback-prompt.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

function extractStructuredJson(response) {
  if (response && typeof response.output_parsed === "object" && response.output_parsed !== null) {
    return response.output_parsed;
  }

  if (response && typeof response.parsed === "object" && response.parsed !== null) {
    return response.parsed;
  }

  const outputs = Array.isArray(response?.output) ? response.output : [];

  for (const item of outputs) {
    if (item && typeof item.parsed === "object" && item.parsed !== null) {
      return item.parsed;
    }

    const content = Array.isArray(item?.content) ? item.content : [];
    for (const block of content) {
      if (block && typeof block.parsed === "object" && block.parsed !== null) {
        return block.parsed;
      }
      if (block && typeof block.json === "object" && block.json !== null) {
        return block.json;
      }
    }
  }

  return null;
}

function isValidEvidenceArray(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        Number.isInteger(item.turn_index) &&
        item.turn_index >= 0 &&
        typeof item.quote === "string"
    )
  );
}

function isValidFeedbackShape(value) {
  if (!value || typeof value !== "object") return false;

  const checklistValid =
    Array.isArray(value.coverage_checklist) &&
    value.coverage_checklist.every(
      (item) =>
        item &&
        typeof item.item === "string" &&
        ["covered", "partially", "not_covered"].includes(item.status) &&
        typeof item.quality_note === "string" &&
        isValidEvidenceArray(item.evidence)
    );

  const understanding = value.understanding_and_questions;
  const invited = understanding?.invited_questions;
  const checked = understanding?.checked_understanding;

  const understandingValid =
    understanding &&
    typeof understanding === "object" &&
    invited &&
    checked &&
    ["covered", "partially", "not_covered"].includes(invited.status) &&
    typeof invited.improvement === "string" &&
    isValidEvidenceArray(invited.evidence) &&
    ["covered", "partially", "not_covered"].includes(checked.status) &&
    typeof checked.improvement === "string" &&
    isValidEvidenceArray(checked.evidence);

  const jargon = value.jargon_analysis;
  const jargonValid =
    jargon &&
    Array.isArray(jargon.medical_terms_found) &&
    jargon.medical_terms_found.every(
      (item) =>
        item &&
        typeof item.term === "string" &&
        Number.isInteger(item.turn_index) &&
        item.turn_index >= 0 &&
        typeof item.explained_plainly === "boolean" &&
        typeof item.plain_explanation_quote === "string"
    ) &&
    typeof jargon.overall_assessment === "string" &&
    Array.isArray(jargon.suggestions) &&
    jargon.suggestions.every((item) => typeof item === "string");

  const improvementsValid =
    Array.isArray(value.improvements) &&
    value.improvements.every(
      (item) =>
        item &&
        typeof item.area === "string" &&
        typeof item.why_it_matters === "string" &&
        typeof item.actionable_tip === "string" &&
        typeof item.example_phrase === "string"
    );

  const nextSessionValid =
    value.next_session_focus &&
    typeof value.next_session_focus.goal === "string" &&
    Array.isArray(value.next_session_focus.practice_drills) &&
    value.next_session_focus.practice_drills.every((item) => typeof item === "string");

  return (
    typeof value.overall_score_0_100 === "number" &&
    checklistValid &&
    understandingValid &&
    jargonValid &&
    Array.isArray(value.strengths) &&
    value.strengths.every((item) => typeof item === "string") &&
    improvementsValid &&
    nextSessionValid
  );
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

function toTurnIndexedTranscript(messages) {
  return messages
    .map((m, idx) => {
      const speaker = m.role === "user" ? "SURGEON" : "PATIENT";
      return `TURN ${idx} | ${speaker}: ${String(m.content || "").trim()}`;
    })
    .join("\n\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  res.setHeader("Cache-Control", "no-store");

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      success: false,
      error:
        "Missing OPENAI_API_KEY. Add it in Vercel → Project Settings → Environment Variables, then redeploy.",
    });
  }

  try {
    const body = req.body ?? {};
    const conversationHistory = sanitizeMessages(body.conversationHistory ?? []);
    const patientVignette = body.patientVignette ?? null;

    if (!conversationHistory.length) {
      return res
        .status(400)
        .json({ success: false, error: "conversationHistory is empty." });
    }

    const transcript = toTurnIndexedTranscript(conversationHistory);


    const instructions = buildFeedbackSystemPrompt({ vignette: patientVignette });

    const vignetteContext = isLikelyVignette(patientVignette)
      ? JSON.stringify(patientVignette, null, 2)
      : "No valid vignette provided.";

    const FEEDBACK_SCHEMA = {
      type: "object",
      additionalProperties: false,
      properties: {
        overall_score_0_100: { type: "number", minimum: 0, maximum: 100 },
        coverage_checklist: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              item: { type: "string" },
              status: {
                type: "string",
                enum: ["covered", "partially", "not_covered"],
              },
              quality_note: { type: "string" },
              evidence: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    turn_index: { type: "integer", minimum: 0 },
                    quote: { type: "string" },
                  },
                  required: ["turn_index", "quote"],
                },
              },
            },
            required: ["item", "status", "quality_note", "evidence"],
          },
        },
        understanding_and_questions: {
          type: "object",
          additionalProperties: false,
          properties: {
            invited_questions: {
              type: "object",
              additionalProperties: false,
              properties: {
                status: {
                  type: "string",
                  enum: ["covered", "partially", "not_covered"],
                },
                improvement: { type: "string" },
                evidence: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      turn_index: { type: "integer", minimum: 0 },
                      quote: { type: "string" },
                    },
                    required: ["turn_index", "quote"],
                  },
                },
              },
              required: ["status", "improvement", "evidence"],
            },
            checked_understanding: {
              type: "object",
              additionalProperties: false,
              properties: {
                status: {
                  type: "string",
                  enum: ["covered", "partially", "not_covered"],
                },
                improvement: { type: "string" },
                evidence: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      turn_index: { type: "integer", minimum: 0 },
                      quote: { type: "string" },
                    },
                    required: ["turn_index", "quote"],
                  },
                },
              },
              required: ["status", "improvement", "evidence"],
            },
          },
          required: ["invited_questions", "checked_understanding"],
        },
        jargon_analysis: {
          type: "object",
          additionalProperties: false,
          properties: {
            medical_terms_found: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  term: { type: "string" },
                  turn_index: { type: "integer", minimum: 0 },
                  explained_plainly: { type: "boolean" },
                  plain_explanation_quote: { type: "string" },
                },
                required: [
                  "term",
                  "turn_index",
                  "explained_plainly",
                  "plain_explanation_quote",
                ],
              },
            },
            overall_assessment: { type: "string" },
            suggestions: { type: "array", items: { type: "string" } },
          },
          required: ["medical_terms_found", "overall_assessment", "suggestions"],
        },
        strengths: { type: "array", items: { type: "string" } },
        improvements: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              area: { type: "string" },
              why_it_matters: { type: "string" },
              actionable_tip: { type: "string" },
              example_phrase: { type: "string" },
            },
            required: ["area", "why_it_matters", "actionable_tip", "example_phrase"],
          },
        },
        next_session_focus: {
          type: "object",
          additionalProperties: false,
          properties: {
            goal: { type: "string" },
            practice_drills: { type: "array", items: { type: "string" } },
          },
          required: ["goal", "practice_drills"],
        },
      },
      required: [
        "overall_score_0_100",
        "coverage_checklist",
        "understanding_and_questions",
        "jargon_analysis",
        "strengths",
        "improvements",
        "next_session_focus",
      ],
    };

    const userInput = `
PATIENT VIGNETTE (context):
${vignetteContext}

CONVERSATION TRANSCRIPT (turn-indexed):
${transcript}

Return JSON only, matching the schema exactly.
Use evidence quotes from SURGEON turns only.
turn_index must match the TURN number you quoted.
`.trim();

    const response = await client.responses.create({
      model: "gpt-5",
      instructions,
      input: [{ role: "user", content: userInput }],
      max_output_tokens: 5000,
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "surgibot_feedback_v1",
          strict: true,
          schema: FEEDBACK_SCHEMA,
        },
      },
    });

    const structuredFeedback = extractStructuredJson(response);
    if (isValidFeedbackShape(structuredFeedback)) {
      return res.status(200).json({ success: true, feedback: structuredFeedback });
    }

    const out = extractResponseText(response);
    if (!out) {
      console.error("[/api/feedback] Empty model response:", {
        status: response?.status,
        output: response?.output,
      });
      return res.status(502).json({
        success: false,
        error: "The model returned an empty feedback response. Please try again.",
      });
    }

    let feedback;
    try {
      feedback = JSON.parse(out);
    } catch (parseError) {
      console.error("[/api/feedback] Invalid JSON from model:", {
        message: parseError?.message,
        preview: out.slice(0, 1000),
      });
      return res.status(502).json({
        success: false,
        error: "The model returned incomplete feedback. Please try again.",
      });
    }

    if (!isValidFeedbackShape(feedback)) {
      console.error("[/api/feedback] Feedback shape validation failed:", {
        keys: feedback && typeof feedback === "object" ? Object.keys(feedback) : null,
      });
      return res.status(502).json({
        success: false,
        error: "The model returned incomplete feedback. Please try again.",
      });
    }

    return res.status(200).json({ success: true, feedback });
  } catch (err) {
    console.error("[/api/feedback] Error:", err);
    return res.status(err?.status ?? 500).json({
      success: false,
      error: err?.message ?? "Feedback function failed.",
    });
  }
}
