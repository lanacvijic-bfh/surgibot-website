// public/feedback-module.js
// Renders feedback from POST /api/feedback using your existing Tailwind style.
//
// Supports session-based storage:
// - practiceConversation:<sessionId>
// - practiceVignette:<sessionId>
//
// Fallbacks (legacy):
// - practiceConversation
// - currentVignette
//
// Calls POST /api/feedback with:
// { conversationHistory, patientVignette }
//
// Accepts backend response formats:
// A) { success: true, feedback: <feedback JSON> }
// B) <feedback JSON> directly

const STORAGE_KEYS = {
  legacyConversation: "practiceConversation",
  legacyVignette: "currentVignette",
};

function getSessionIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("session"); // may be null
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function readFromStorage(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  return safeJsonParse(raw);
}

function getConversationHistory() {
  const sessionId = getSessionIdFromUrl();

  // 1) Prefer session-based storage
  if (sessionId) {
    const sessionConversation = readFromStorage(`practiceConversation:${sessionId}`);
    if (Array.isArray(sessionConversation) && sessionConversation.length) return sessionConversation;
  }

  // 2) Fallback to legacy
  const legacyConversation = readFromStorage(STORAGE_KEYS.legacyConversation);
  if (Array.isArray(legacyConversation) && legacyConversation.length) return legacyConversation;

  return null;
}

function getCurrentVignette() {
  const sessionId = getSessionIdFromUrl();

  // 1) Prefer session-based storage
  if (sessionId) {
    const sessionVignette = readFromStorage(`practiceVignette:${sessionId}`);
    if (sessionVignette && typeof sessionVignette === "object") return sessionVignette;
  }

  // 2) Fallback to legacy
  const legacyVignette = readFromStorage(STORAGE_KEYS.legacyVignette);
  if (legacyVignette && typeof legacyVignette === "object") return legacyVignette;

  return null;
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => {
    switch (m) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return m;
    }
  });
}

function showLoadingState() {
  const container = document.getElementById("feedback-container");
  if (!container) return;

  container.innerHTML = `
    <div class="flex flex-col items-center justify-center py-16">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mb-4"></div>
      <p class="text-lg text-gray-700 font-semibold">Analyzing your conversation...</p>
      <p class="text-sm text-gray-500 mt-2">This may take a moment</p>
    </div>
  `;
}

function showError(message) {
  const container = document.getElementById("feedback-container");
  if (!container) return;

  container.innerHTML = `
    <div class="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <div class="text-red-500 text-4xl mb-3">⚠️</div>
      <h3 class="text-lg font-bold text-red-800 mb-2">Unable to Generate Feedback</h3>
      <p class="text-red-700 mb-4">${escapeHtml(message)}</p>
      <button
        onclick="window.location.reload()"
        class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
      >
        Try Again
      </button>
    </div>
  `;
}

function showNoConversation() {
  const container = document.getElementById("feedback-container");
  if (!container) return;

  container.innerHTML = `
    <div class="max-w-2xl mx-auto bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
      <div class="text-blue-500 text-5xl mb-4">💬</div>
      <h3 class="text-xl font-bold text-blue-900 mb-3">No Practice Session Found</h3>
      <p class="text-gray-700 mb-6">
        You need to complete a practice session before receiving feedback.
      </p>
      <a
        href="./practice-module.html"
        class="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
      >
        Go to Practice Module
      </a>
    </div>
  `;
}

function scoreToRating(score0to100) {
  const s = Number(score0to100 ?? 0);
  if (s >= 90) return "Excellent";
  if (s >= 75) return "Good";
  if (s >= 60) return "Satisfactory";
  if (s >= 45) return "Needs Improvement";
  return "Poor";
}

function getScoreColor(score) {
  const s = Number(score ?? 0);
  if (s >= 85) return "text-green-600 bg-green-50";
  if (s >= 70) return "text-blue-600 bg-blue-50";
  if (s >= 50) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

function getRatingBadge(rating) {
  const badges = {
    Excellent: "bg-green-100 text-green-700 border-green-300",
    Good: "bg-blue-100 text-blue-700 border-blue-300",
    Satisfactory: "bg-yellow-100 text-yellow-700 border-yellow-300",
    Fair: "bg-orange-100 text-orange-700 border-orange-300",
    Poor: "bg-red-100 text-red-700 border-red-300",
    "Needs Improvement": "bg-red-100 text-red-700 border-red-300",
  };
  return badges[rating] || "bg-gray-100 text-gray-700 border-gray-300";
}

function statusBadge(status) {
  const base = "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border";
  if (status === "covered") return `${base} bg-green-100 text-green-700 border-green-300`;
  if (status === "partially") return `${base} bg-yellow-100 text-yellow-700 border-yellow-300`;
  return `${base} bg-gray-100 text-gray-700 border-gray-300`;
}

function statusLabel(status) {
  if (status === "covered") return "Covered";
  if (status === "partially") return "Partially";
  return "Not covered";
}

function computeCompleteness(coverageChecklist) {
  const list = Array.isArray(coverageChecklist) ? coverageChecklist : [];
  if (list.length === 0) return { score: 0, covered: [], missed: [], partial: [] };

  let total = 0;
  const covered = [];
  const missed = [];
  const partial = [];

  for (const item of list) {
    const st = item?.status;
    if (st === "covered") {
      total += 1;
      covered.push(item.item);
    } else if (st === "partially") {
      total += 0.5;
      partial.push(item.item);
    } else {
      missed.push(item.item);
    }
  }

  const score = Math.round((total / list.length) * 100);
  return { score, covered, missed, partial };
}

function renderEvidence(evidence) {
  const ev = Array.isArray(evidence) ? evidence : [];
  if (ev.length === 0) {
    return `<p class="text-xs text-gray-500 mt-2 italic">No evidence quoted.</p>`;
  }
  return `
    <div class="mt-3 space-y-2">
      ${ev.slice(0, 2).map((e) => `
        <div class="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <span class="font-semibold text-gray-700">${
            Number.isFinite(e.turn_index) ? `Turn ${e.turn_index}` : "Turn"
          }</span>:
          “${escapeHtml(e.quote || "")}”
        </div>
      `).join("")}
    </div>
  `;
}

function displayFeedback(raw) {
  const container = document.getElementById("feedback-container");
  if (!container) return;

  const feedback = raw?.feedback && typeof raw?.success !== "undefined" ? raw.feedback : raw;

  const score = Number(feedback?.overall_score_0_100 ?? 0);
  const rating = scoreToRating(score);

  const completeness = computeCompleteness(feedback?.coverage_checklist);

  const strengths = Array.isArray(feedback?.strengths) ? feedback.strengths : [];
  const improvements = Array.isArray(feedback?.improvements) ? feedback.improvements : [];
  const safetyFlags = Array.isArray(feedback?.safety_flags) ? feedback.safety_flags : [];

  const invited = feedback?.understanding_and_questions?.invited_questions;
  const checked = feedback?.understanding_and_questions?.checked_understanding;

  const jargon = feedback?.jargon_analysis?.medical_terms_found;
  const jargonOverall = feedback?.jargon_analysis?.overall_assessment;
  const jargonSuggestions = feedback?.jargon_analysis?.suggestions;

  const nextGoal = feedback?.next_session_focus?.goal;
  const nextDrills = feedback?.next_session_focus?.practice_drills;

  const html = `
    <div class="max-w-4xl mx-auto mb-8">
      <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-white text-center shadow-xl">
        <h2 class="text-3xl font-bold mb-2">Overall Performance</h2>
        <div class="text-7xl font-extrabold mb-3">${Number.isFinite(score) ? score : 0}/100</div>
        <div class="inline-block px-6 py-2 bg-white/20 backdrop-blur rounded-full text-lg font-semibold border border-white/30">
          ${rating}
        </div>
        <p class="mt-4 text-blue-50 max-w-2xl mx-auto">
          ${escapeHtml(
            strengths.length ? strengths.slice(0, 2).join(" • ") : "See the detailed checklist below to improve."
          )}
        </p>
      </div>
    </div>

    <div class="max-w-4xl mx-auto grid md:grid-cols-2 gap-6 mb-8">
      <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-800">📋 Completeness</h3>
          <div class="text-2xl font-bold ${getScoreColor(completeness.score)} px-4 py-2 rounded-lg">
            ${completeness.score}%
          </div>
        </div>
        <p class="text-sm text-gray-600 mb-3">
          Based on whether required informed consent elements were covered.
        </p>

        ${completeness.covered.length ? `
          <div class="mb-3">
            <p class="text-xs font-semibold text-green-700 mb-1">✓ Covered:</p>
            <div class="flex flex-wrap gap-1">
              ${completeness.covered.map(item =>
                `<span class="text-xs px-2 py-1 bg-green-50 text-green-700 rounded border border-green-200">${escapeHtml(item)}</span>`
              ).join("")}
            </div>
          </div>
        ` : ""}

        ${completeness.partial.length ? `
          <div class="mb-3">
            <p class="text-xs font-semibold text-yellow-700 mb-1">~ Partially:</p>
            <div class="flex flex-wrap gap-1">
              ${completeness.partial.map(item =>
                `<span class="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded border border-yellow-200">${escapeHtml(item)}</span>`
              ).join("")}
            </div>
          </div>
        ` : ""}

        ${completeness.missed.length ? `
          <div>
            <p class="text-xs font-semibold text-red-700 mb-1">✗ Missed:</p>
            <div class="flex flex-wrap gap-1">
              ${completeness.missed.map(item =>
                `<span class="text-xs px-2 py-1 bg-red-50 text-red-700 rounded border border-red-200">${escapeHtml(item)}</span>`
              ).join("")}
            </div>
          </div>
        ` : ""}
      </div>

      <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h3 class="text-lg font-bold text-gray-800 mb-4">🎯 Patient-Centered Checks</h3>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-700">Invited questions</span>
            <span class="${statusBadge(invited?.status)}">${statusLabel(invited?.status)}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-700">Checked understanding</span>
            <span class="${statusBadge(checked?.status)}">${statusLabel(checked?.status)}</span>
          </div>
        </div>

        ${invited?.improvement ? `<p class="text-xs text-gray-600 mt-4 italic">${escapeHtml(invited.improvement)}</p>` : ""}
        ${checked?.improvement ? `<p class="text-xs text-gray-600 mt-2 italic">${escapeHtml(checked.improvement)}</p>` : ""}

        <div class="mt-4">
          ${invited?.evidence ? renderEvidence(invited.evidence) : ""}
          ${checked?.evidence ? renderEvidence(checked.evidence) : ""}
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto mb-8">
      <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h3 class="text-xl font-bold text-gray-800 mb-4">✅ Coverage checklist</h3>
        <div class="space-y-4">
          ${
            Array.isArray(feedback?.coverage_checklist) && feedback.coverage_checklist.length
              ? feedback.coverage_checklist.map((c) => `
                <div class="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <div class="flex items-start justify-between gap-3">
                    <p class="text-sm font-bold text-gray-800">${escapeHtml(c.item)}</p>
                    <span class="${statusBadge(c.status)}">${statusLabel(c.status)}</span>
                  </div>
                  <p class="text-sm text-gray-700 mt-2">${escapeHtml(c.quality_note || "")}</p>
                  ${renderEvidence(c.evidence)}
                </div>
              `).join("")
              : `<p class="text-sm text-gray-600">No checklist returned.</p>`
          }
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto mb-8">
      <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h3 class="text-xl font-bold text-gray-800 mb-4">🩺 Medical terms & jargon</h3>
        <p class="text-sm text-gray-600 mb-4">${escapeHtml(jargonOverall || "Review whether medical terms were explained in plain language.")}</p>

        <div class="overflow-x-auto">
          <table class="min-w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
            <thead class="bg-gray-50">
              <tr>
                <th class="text-left px-4 py-3 font-semibold text-gray-700">Term</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-700">Turn</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-700">Explained?</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-700">Plain explanation</th>
              </tr>
            </thead>
            <tbody class="bg-white">
              ${
                Array.isArray(jargon) && jargon.length
                  ? jargon.slice(0, 20).map((t) => `
                    <tr class="border-t border-gray-200">
                      <td class="px-4 py-3 font-semibold text-gray-800">${escapeHtml(t.term)}</td>
                      <td class="px-4 py-3 text-gray-700">${escapeHtml(t.turn_index)}</td>
                      <td class="px-4 py-3">
                        ${
                          t.explained_plainly
                            ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">Yes</span>`
                            : `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">No</span>`
                        }
                      </td>
                      <td class="px-4 py-3 text-gray-700">${escapeHtml(t.plain_explanation_quote || "—")}</td>
                    </tr>
                  `).join("")
                  : `<tr class="border-t border-gray-200"><td colspan="4" class="px-4 py-4 text-gray-600">No terms detected/returned.</td></tr>`
              }
            </tbody>
          </table>
        </div>

        ${
          Array.isArray(jargonSuggestions) && jargonSuggestions.length
            ? `
              <div class="mt-4">
                <p class="text-sm font-semibold text-gray-800 mb-2">Suggestions</p>
                <ul class="text-sm text-gray-700 space-y-1">
                  ${jargonSuggestions.slice(0, 6).map((s) => `<li>• ${escapeHtml(s)}</li>`).join("")}
                </ul>
              </div>
            `
            : ""
        }
      </div>
    </div>

    <div class="max-w-4xl mx-auto mb-8">
      <div class="bg-green-50 rounded-xl shadow-md p-6 border border-green-200">
        <h3 class="text-xl font-bold text-green-900 mb-4">💪 Key Strengths</h3>
        ${
          strengths.length
            ? `<ul class="space-y-3">
                ${strengths.map((s) => `
                  <li class="flex items-start gap-3">
                    <span class="text-green-600 text-xl flex-shrink-0">✓</span>
                    <span class="text-gray-800">${escapeHtml(s)}</span>
                  </li>
                `).join("")}
              </ul>`
            : `<p class="text-sm text-gray-700">No strengths returned.</p>`
        }
      </div>
    </div>

    <div class="max-w-4xl mx-auto mb-8">
      <div class="bg-orange-50 rounded-xl shadow-md p-6 border border-orange-200">
        <h3 class="text-xl font-bold text-orange-900 mb-4">📈 Areas for Improvement</h3>
        ${
          improvements.length
            ? `<div class="space-y-4">
                ${improvements.slice(0, 8).map((i) => `
                  <div class="bg-white rounded-xl border border-orange-200 p-4">
                    <p class="font-bold text-gray-800">${escapeHtml(i.area)}</p>
                    <p class="text-sm text-gray-700 mt-1">${escapeHtml(i.why_it_matters)}</p>
                    <p class="text-sm text-gray-700 mt-2"><span class="font-semibold">Tip:</span> ${escapeHtml(i.actionable_tip)}</p>
                    <div class="mt-3 text-sm bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3">
                      <span class="font-semibold">Example phrase:</span> ${escapeHtml(i.example_phrase)}
                    </div>
                  </div>
                `).join("")}
              </div>`
            : `<p class="text-sm text-gray-700">No improvements returned.</p>`
        }
      </div>
    </div>

    ${
      safetyFlags.length
        ? `
          <div class="max-w-4xl mx-auto mb-8">
            <div class="bg-white rounded-xl shadow-md p-6 border border-red-200">
              <h3 class="text-xl font-bold text-gray-800 mb-4">⚠️ Safety flags</h3>
              <div class="space-y-4">
                ${safetyFlags.map((f) => `
                  <div class="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p class="font-bold text-red-900">${escapeHtml(f.flag)}</p>
                    ${renderEvidence(f.evidence)}
                    ${f.safer_alternative ? `<p class="text-sm text-gray-700 mt-3"><span class="font-semibold">Safer alternative:</span> ${escapeHtml(f.safer_alternative)}</p>` : ""}
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
        `
        : ""
    }

    <div class="max-w-4xl mx-auto mb-8">
      <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h3 class="text-xl font-bold text-gray-800 mb-2">🔁 Next session focus</h3>
        <p class="text-sm text-gray-700">${escapeHtml(nextGoal || "—")}</p>
        ${
          Array.isArray(nextDrills) && nextDrills.length
            ? `<ul class="mt-3 text-sm text-gray-700 space-y-1">
                ${nextDrills.slice(0, 6).map((d) => `<li>• ${escapeHtml(d)}</li>`).join("")}
              </ul>`
            : ""
        }
      </div>
    </div>

    <div class="max-w-4xl mx-auto flex gap-4 justify-center">
      <button
        onclick="window.print()"
        class="px-6 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition font-semibold border border-gray-300"
      >
        📄 Print Feedback
      </button>
      <a
        href="./practice-module.html"
        class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
      >
        🔄 Practice Again
      </a>
    </div>
  `;

  container.innerHTML = html;
}

async function parseErrorResponse(response) {
  const ct = response.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return await response.json().catch(() => ({}));
  }
  const text = await response.text().catch(() => "");
  return { error: text };
}

async function analyzePracticeSession() {
  const sessionId = getSessionIdFromUrl();
  console.log("[feedback-module] session:", sessionId);

  const conversationHistory = getConversationHistory();
  const patientVignette = getCurrentVignette();

  if (!conversationHistory || conversationHistory.length === 0) {
    showNoConversation();
    return;
  }

  showLoadingState();

  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationHistory,
        patientVignette,
      }),
    });

    if (!response.ok) {
      const err = await parseErrorResponse(response);
      throw new Error(err.details || err.error || `Server error: ${response.status}`);
    }

    const data = await response.json().catch(() => ({}));
    const fb = data?.feedback ? data.feedback : data;

    if (!fb || typeof fb !== "object" || typeof fb.overall_score_0_100 !== "number") {
      throw new Error("Invalid feedback format received from server.");
    }

    displayFeedback(data);
  } catch (error) {
    console.error("[feedback-module] Failed to get feedback:", error);
    showError(error.message || "Unable to analyze your conversation. Please try again.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  analyzePracticeSession();
});
