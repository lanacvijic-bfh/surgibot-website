// public/feedback-module.js
// Session-based feedback ONLY.
// If user opens feedback-module.html without ?session=..., show instructions instead.
//
// Storage used (per session):
// - practiceConversation:<sessionId>
// - practiceVignette:<sessionId>

function getSessionIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("session");
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

function showInfoHowToGetFeedback() {
  const container = document.getElementById("feedback-container");
  if (!container) return;

  container.innerHTML = `
    <div class="max-w-2xl mx-auto bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
      <div class="text-blue-500 text-5xl mb-4">🧑‍⚕️</div>
      <h3 class="text-xl font-bold text-blue-900 mb-3">No feedback session selected</h3>
      <p class="text-gray-700 mb-6 leading-relaxed">
        To receive personalized feedback:
        <br/>
        1) Choose a patient vignette in the vignette library
        <br/>
        2) Practice the informed consent discussion
        <br/>
        3) Click <span class="font-semibold">Show personalized feedback</span> in the practice module
      </p>
      <a
        href="./vignette-library.html"
        class="inline-flex items-center justify-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
      >
        Go to Vignette Library
      </a>
    </div>
  `;
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
  if (ev.length === 0) return `<p class="text-xs text-gray-500 mt-2 italic">No evidence quoted.</p>`;

  return `
    <div class="mt-3 space-y-2">
      ${ev.slice(0, 2).map((e) => `
        <div class="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <span class="font-semibold text-gray-700">${Number.isFinite(e.turn_index) ? `Turn ${e.turn_index}` : "Turn"}</span>:
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

  const invited = feedback?.understanding_and_questions?.invited_questions;
  const checked = feedback?.understanding_and_questions?.checked_understanding;

  const html = `
    <div class="max-w-4xl mx-auto mb-8">
      <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-white text-center shadow-xl">
        <h2 class="text-3xl font-bold mb-2">Overall Performance</h2>
        <div class="text-7xl font-extrabold mb-3">${Number.isFinite(score) ? score : 0}/100</div>
        <div class="inline-block px-6 py-2 bg-white/20 backdrop-blur rounded-full text-lg font-semibold border border-white/30">
          ${rating}
        </div>
        <p class="mt-4 text-blue-50 max-w-2xl mx-auto">
          ${escapeHtml(strengths.length ? strengths.slice(0, 2).join(" • ") : "See the checklist below to improve.")}
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

        ${completeness.missed.length ? `
          <p class="text-sm text-gray-600 mb-3">Focus first on the missed elements below.</p>
        ` : `
          <p class="text-sm text-gray-600 mb-3">Great coverage of required elements.</p>
        `}

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
  if (ct.includes("application/json")) return await response.json().catch(() => ({}));
  const text = await response.text().catch(() => "");
  return { error: text };
}

async function analyzePracticeSession() {
  const sessionId = getSessionIdFromUrl();
  if (!sessionId) {
    showInfoHowToGetFeedback();
    return;
  }

  const conversationHistory = readFromStorage(`practiceConversation:${sessionId}`);
  const patientVignette = readFromStorage(`practiceVignette:${sessionId}`);

  if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
    showInfoHowToGetFeedback();
    return;
  }

  showLoadingState();

  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationHistory, patientVignette }),
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

    // Optional: if you want the feedback to NOT be reproducible after refresh,
    // uncomment these two lines to delete the session data after rendering:
    //
    localStorage.removeItem(`practiceConversation:${sessionId}`);
    localStorage.removeItem(`practiceVignette:${sessionId}`);

  } catch (error) {
    console.error("[feedback-module] Failed:", error);
    showError(error.message || "Unable to analyze your conversation. Please try again.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  analyzePracticeSession();
});
