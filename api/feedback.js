// api/feedback.js
import OpenAI from "openai";
import { buildFeedbackSystemPrompt } from "./lib/feedback-prompt.js";

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

// Turn index refers to index in the sanitized conversation array.
function toIndexedTranscript(messages) {
  return messages
    .map((m, idx) => {
      const speaker = m.role === "user" ? "SURGEON" : "PATIENT";
      return `TURN ${idx} | ${speaker}: ${m.content.trim()}`;
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
    const conversationHistory = sanitizeMessages(body.conversationHistory);
    const patientVignette = body.patientVignette;

    if (!conversationHistory.length) {
      return res.status(400).json({
        success: false,
        error: "conversationHistory is missing or empty.",
      });
    }

    const transcript = toIndexedTranscript(conversationHistory);

    const vignetteContext = isLikelyVignette(patientVignette)
      ? JSON.stringify(patientVignette, null, 2)
      : "No valid vignette provided.";

    // This schema matches your current public/feedback-module.js renderer
    const FEEDBACK_SCHEMA = {
      type: "object",
      additionalProperties: false,
      properties: {
        coverage_checklist: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              item: { type: "string" },
              status: { type: "string", enum: ["covered", "partially", "not_covered"] },
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
                status: { type: "string", enum: ["covered", "partially", "not_covered"] },
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
                status: { type: "string", enum: ["covered", "partially", "not_covered"] },
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
                required: ["term", "turn_index", "explained_plainly", "plain_explanation_quote"],
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

        overall_score_0_100: { type: "number", minimum: 0, maximum: 100 },

        safety_flags: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              flag: { type: "string" },
              severity: { type: "string", enum: ["low", "medium", "high"] },
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
              safer_alternative: { type: "string" },
            },
            required: ["flag", "severity", "evidence", "safer_alternative"],
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
        "coverage_checklist",
        "understanding_and_questions",
        "jargon_analysis",
        "strengths",
        "improvements",
        "overall_score_0_100",
        "safety_flags",
        "next_session_focus",
      ],
    };

    const instructions = buildFeedbackSystemPrompt();

    const userInput = `
PATIENT VIGNETTE (context):
${vignetteContext}

CONVERSATION TRANSCRIPT (turn-indexed):
${transcript}

Return JSON matching the schema exactly.
Rules:
- Use evidence quotes from SURGEON turns only (TURN X | SURGEON: ...).
- turn_index must match the TURN number you quoted.
- Keep strengths 3-6 items and improvements 4-8 items.
- If safety_flags are none, return [].
`.trim();

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions,
      input: [{ role: "user", content: userInput }],
      temperature: 0.2,
      max_output_tokens: 1400,
      text: {
        format: {
          type: "json_schema",
          name: "surgibot_feedback_v1",
          strict: true,
          schema: FEEDBACK_SCHEMA,
        },
      },
    });

    const outputText = response.output_text ?? "";
    if (!outputText) {
      return res.status(500).json({
        success: false,
        error: "Feedback model returned empty output.",
      });
    }

    let feedback;
    try {
      feedback = JSON.parse(outputText);
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: "Feedback output was not valid JSON.",
        model_output: outputText.slice(0, 2000),
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
