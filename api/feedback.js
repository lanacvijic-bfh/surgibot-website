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
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 4000),
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

function toTranscript(messages) {
  return messages
    .map((m) => {
      const speaker = m.role === "user" ? "SURGEON" : "PATIENT";
      return `${speaker}: ${m.content.trim()}`;
    })
    .join("\n\n");
}

function ratingFromScore(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Satisfactory";
  if (score >= 40) return "Fair";
  if (score >= 25) return "Poor";
  return "Needs Improvement";
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

    const transcript = toTranscript(conversationHistory);

    const vignetteContext = isLikelyVignette(patientVignette)
      ? JSON.stringify(patientVignette, null, 2)
      : "No valid vignette provided.";

    // JSON Schema expected by your public/feedback-module.js UI
    const FEEDBACK_SCHEMA = {
      type: "object",
      additionalProperties: false,
      properties: {
        overall_score: { type: "integer", minimum: 0, maximum: 100 },
        overall_rating: {
          type: "string",
          enum: ["Excellent", "Good", "Satisfactory", "Fair", "Poor", "Needs Improvement"],
        },
        summary: { type: "string" },

        completeness: {
          type: "object",
          additionalProperties: false,
          properties: {
            score: { type: "integer", minimum: 0, maximum: 100 },
            details: { type: "string" },
            covered: { type: "array", items: { type: "string" } },
            missed: { type: "array", items: { type: "string" } },
          },
          required: ["score", "details", "covered", "missed"],
        },

        communication: {
          type: "object",
          additionalProperties: false,
          properties: {
            rating: {
              type: "string",
              enum: ["Excellent", "Good", "Satisfactory", "Fair", "Poor", "Needs Improvement"],
            },
            clarity_score: { type: "integer", minimum: 0, maximum: 10 },
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } },
          },
          required: ["rating", "clarity_score", "strengths", "weaknesses"],
        },

        empathy: {
          type: "object",
          additionalProperties: false,
          properties: {
            score: { type: "integer", minimum: 1, maximum: 5 },
            examples: { type: "array", items: { type: "string" } },
            missed_opportunities: { type: "array", items: { type: "string" } },
          },
          required: ["score", "examples", "missed_opportunities"],
        },

        patient_centered: {
          type: "object",
          additionalProperties: false,
          properties: {
            checked_understanding: { type: "boolean" },
            invited_questions: { type: "boolean" },
            explored_values: { type: "boolean" },
            shared_decision_making: { type: "boolean" },
            feedback: { type: "string" },
          },
          required: [
            "checked_understanding",
            "invited_questions",
            "explored_values",
            "shared_decision_making",
            "feedback",
          ],
        },

        professionalism: {
          type: "object",
          additionalProperties: false,
          properties: {
            rating: {
              type: "string",
              enum: ["Excellent", "Good", "Satisfactory", "Fair", "Poor", "Needs Improvement"],
            },
            red_flags: { type: "array", items: { type: "string" } },
            positive_notes: { type: "array", items: { type: "string" } },
          },
          required: ["rating", "red_flags", "positive_notes"],
        },

        strengths: { type: "array", items: { type: "string" } },
        improvements: { type: "array", items: { type: "string" } },
      },
      required: [
        "overall_score",
        "overall_rating",
        "summary",
        "completeness",
        "communication",
        "empathy",
        "patient_centered",
        "professionalism",
        "strengths",
        "improvements",
      ],
    };

    const instructions = buildFeedbackSystemPrompt();

    const userInput = `
PATIENT VIGNETTE (context):
${vignetteContext}

CONVERSATION TRANSCRIPT:
${transcript}

Return JSON that matches the schema exactly.

Notes:
- completeness.covered and completeness.missed must use the checklist labels from the system prompt.
- Use concrete examples when possible, but keep it short.
- If overall_rating/communication.rating/professionalism.rating are not obvious, derive from scores.
`.trim();

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions,
      input: [{ role: "user", content: userInput }],
      temperature: 0.2,
      max_output_tokens: 1200,
      text: {
        format: {
          type: "json_schema",
          name: "surgibot_feedback",
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

    // Safety: if model ever returns missing ratings, fill them deterministically
    if (!feedback.overall_rating && typeof feedback.overall_score === "number") {
      feedback.overall_rating = ratingFromScore(feedback.overall_score);
    }
    if (
      feedback.communication &&
      !feedback.communication.rating &&
      typeof feedback.communication.clarity_score === "number"
    ) {
      // map clarity_score to a rough rating
      const approx = Math.round((feedback.communication.clarity_score / 10) * 100);
      feedback.communication.rating = ratingFromScore(approx);
    }
    if (
      feedback.professionalism &&
      !feedback.professionalism.rating &&
      typeof feedback.overall_score === "number"
    ) {
      feedback.professionalism.rating = ratingFromScore(feedback.overall_score);
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
