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

/** ---- Design system (match the rest of the website) ---- */
const UI = {
  // Your HTML already controls max-width, so keep empty
  shell: "",

  card:
    "bg-white/90 rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow",
  cardNoHover:
    "bg-white/90 rounded-2xl shadow-sm border border-slate-200 p-5",

  headerTitle: "text-base md:text-lg font-semibold text-slate-900",
  headerSub: "text-xs md:text-[13px] text-slate-600",

  // NEW: buttons like your top navigation items
  btnNav:
    "inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors",
  btnNavText: "text-xs font-semibold text-slate-900",
  btnNavIcon: "w-8 h-8 object-contain",

  // NEW: icon background style requested
  iconBg: "flex items-center justify-center w-14 h-14 rounded-3xl bg-blue-100",

  badgeBase: "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border",

  pillBase: "text-xs px-2 py-1 rounded border",
  divider: "border-t border-slate-200/70",
  subtleBox:
    "bg-slate-50/70 rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-[13px] text-slate-600",

  stack: "space-y-6",
};

function showInfoHowToGetFeedback() {
  const container = document.getElementById("feedback-container");
  if (!container) return;

  container.className = UI.shell;
  container.innerHTML = `
    <article class="${UI.cardNoHover} text-center p-8 md:p-10">
      <!-- ICON_PLACEHOLDER: Top info icon -->
      <div class="mb-4 flex justify-center">
        <div class="${UI.iconBg}">
          <img src="./icons/surgeon.png" alt="Surgeon" class="w-9 h-9 object-contain" />
        </div>
      </div>

      <h3 class="text-lg md:text-2xl font-semibold text-slate-900 mb-5">
        How to get personalized feedback?
      </h3>

      <!-- 3 step cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-left mb-8">
        <div class="bg-white border border-blue-200 rounded-2xl p-5">
          <div class="flex items-center gap-3 mb-3">
            <div class="${UI.iconBg}">
              <!-- ICON_PLACEHOLDER: Step 1 icon -->
              <img src="./icons/vignette-library-button.png" alt="Step 1" class="w-9 h-9 object-contain" />
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-900">Step 1</p>
              <p class="text-xs md:text-[13px] text-slate-700">Choose a vignette</p>
            </div>
          </div>
          <p class="text-xs md:text-[13px] text-slate-700 leading-relaxed">
            Choose and review a patient vignette in the vignette library.
          </p>
        </div>

        <div class="bg-white border border-blue-200 rounded-2xl p-5">
          <div class="flex items-center gap-3 mb-3">
            <div class="${UI.iconBg}">
              <!-- ICON_PLACEHOLDER: Step 2 icon -->
              <img src="./icons/practice-button.png" alt="Step 2" class="w-9 h-9 object-contain" />
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-900">Step 2</p>
              <p class="text-xs md:text-[13px] text-slate-700">Practice discussion</p>
            </div>
          </div>
          <p class="text-xs md:text-[13px] text-slate-700 leading-relaxed">
            Practice the informed consent discussion with a simulated patient.
          </p>
        </div>

        <div class="bg-white border border-blue-200 rounded-2xl p-5">
          <div class="flex items-center gap-3 mb-3">
            <div class="${UI.iconBg}">
              <!-- ICON_PLACEHOLDER: Step 3 icon -->
              <img src="./icons/feedback-button.png" alt="Step 3" class="w-9 h-9 object-contain" />
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-900">Step 3</p>
              <p class="text-xs md:text-[13px] text-slate-700">Show feedback</p>
            </div>
          </div>
          <p class="text-xs md:text-[13px] text-slate-700 leading-relaxed">
            After you complete the discussion, click on
            <span class="font-semibold text-slate-900">Show personalized feedback</span>.
          </p>
        </div>
      </div>

      <a href="./vignette-library.html" class="${UI.btnNav}">
        <img src="./icons/vignette-library-button.png" alt="Library icon" class="${UI.btnNavIcon}" />
        <span class="${UI.btnNavText}">Go to Vignette Library</span>
      </a>
    </article>
  `;
}

function showLoadingState() {
  const container = document.getElementById("feedback-container");
  if (!container) return;

  container.className = UI.shell;
  container.innerHTML = `
    <article class="${UI.cardNoHover} flex flex-col items-center text-center gap-3 py-10">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-300"></div>
      <p class="text-base md:text-lg font-semibold text-slate-900">Analyzing your conversation…</p>
      <p class="${UI.headerSub}">This may take a moment</p>
    </article>
  `;
}

function showError(message) {
  const container = document.getElementById("feedback-container");
  if (!container) return;

  container.className = UI.shell;
  container.innerHTML = `
    <article class="${UI.cardNoHover} text-center p-8">
      <div class="mb-4 flex justify-center">
        <div class="${UI.iconBg}">
          <!-- ICON_PLACEHOLDER: error icon -->
          <img src="./icons/feedback-button.png" alt="Error" class="w-9 h-9 object-contain" />
        </div>
      </div>

      <h3 class="text-base md:text-lg font-semibold text-slate-900 mb-2">
        Unable to generate feedback
      </h3>
      <p class="${UI.headerSub} mb-6">${escapeHtml(message)}</p>

      <button onclick="window.location.reload()" class="${UI.btnNav}">
        <img src="./icons/feedback-button.png" alt="Try again" class="${UI.btnNavIcon}" />
        <span class="${UI.btnNavText}">Try again</span>
      </button>
    </article>
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
  if (s >= 85) return "text-green-700 bg-green-50 border border-green-200";
  if (s >= 70) return "text-blue-700 bg-blue-50 border border-blue-200";
  if (s >= 50) return "text-yellow-700 bg-yellow-50 border border-yellow-200";
  return "text-red-700 bg-red-50 border border-red-200";
}

function statusBadge(status) {
  const base = UI.badgeBase;
  if (status === "covered") return `${base} bg-green-50 text-green-700 border-green-200`;
  if (status === "partially") return `${base} bg-yellow-50 text-yellow-700 border-yellow-200`;
  return `${base} bg-slate-50 text-slate-700 border-slate-200`;
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
    return `<p class="${UI.headerSub} mt-2 italic">No evidence quoted.</p>`;
  }

  return `
    <div class="mt-3 space-y-2">
      ${ev.slice(0, 2).map((e) => `
        <div class="text-xs md:text-[13px] text-slate-600 bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2">
          <span class="font-semibold text-slate-900">${Number.isFinite(e.turn_index) ? `Turn ${e.turn_index}` : "Turn"}</span>:
          “${escapeHtml(e.quote || "")}”
        </div>
      `).join("")}
    </div>
  `;
}

function displayFeedback(raw) {
  const container = document.getElementById("feedback-container");
  if (!container) return;

  container.className = `${UI.shell} ${UI.stack}`;

  const feedback = raw?.feedback && typeof raw?.success !== "undefined" ? raw.feedback : raw;

  const score = Number(feedback?.overall_score_0_100 ?? 0);
  const rating = scoreToRating(score);

  const completeness = computeCompleteness(feedback?.coverage_checklist);
  const strengths = Array.isArray(feedback?.strengths) ? feedback.strengths : [];
  const improvements = Array.isArray(feedback?.improvements) ? feedback.improvements : [];

  const invited = feedback?.understanding_and_questions?.invited_questions;
  const checked = feedback?.understanding_and_questions?.checked_understanding;

  container.innerHTML = `
    <!-- Overall -->
    <article class="${UI.cardNoHover} text-center">
      <div class="mb-4 flex justify-center">
        <div class="${UI.iconBg}">
          <!-- ICON_PLACEHOLDER: overall icon -->
          <img src="./icons/feedback-button.png" alt="Overall" class="w-9 h-9 object-contain" />
        </div>
      </div>

      <p class="${UI.headerSub} mb-1">Overall performance</p>
      <h2 class="text-2xl md:text-3xl font-semibold text-slate-900 mb-3">
        ${Number.isFinite(score) ? score : 0}/100
      </h2>

      <div class="inline-flex items-center px-4 py-2 rounded-full text-xs md:text-sm font-semibold border border-blue-200 bg-blue-100 text-slate-900">
        ${rating}
      </div>

      <p class="${UI.headerSub} mt-4 max-w-2xl mx-auto">
        ${escapeHtml(strengths.length ? strengths.slice(0, 2).join(" • ") : "See the checklist below to improve.")}
      </p>
    </article>

    <!-- Completeness -->
    <article class="${UI.card}">
      <div class="flex items-center justify-between gap-3 mb-4">
        <div class="flex items-center gap-3">
          <div class="${UI.iconBg}">
            <!-- ICON_PLACEHOLDER: completeness icon -->
            <img src="./icons/completeness.png" alt="Completeness" class="w-8 h-8 object-contain" />
          </div>
          <h3 class="${UI.headerTitle}">Completeness</h3>
        </div>

        <div class="px-4 py-2 rounded-xl text-sm md:text-base font-semibold ${getScoreColor(completeness.score)}">
          ${completeness.score}%
        </div>
      </div>

      <p class="${UI.headerSub} mb-4">
        ${completeness.missed.length
          ? "In the next informed consent discussion, focus on the missed topics below."
          : "Great coverage of required topics for informed consent discussion."}
      </p>

      ${completeness.covered.length ? `
        <div class="mb-4">
          <p class="text-xs font-semibold text-green-700 mb-2">Covered</p>
          <div class="flex flex-wrap gap-2">
            ${completeness.covered.map(item =>
              `<span class="${UI.pillBase} bg-green-50 text-green-700 border-green-200">${escapeHtml(item)}</span>`
            ).join("")}
          </div>
        </div>
      ` : ""}

      ${completeness.partial.length ? `
        <div class="mb-4">
          <p class="text-xs font-semibold text-yellow-700 mb-2">Partially</p>
          <div class="flex flex-wrap gap-2">
            ${completeness.partial.map(item =>
              `<span class="${UI.pillBase} bg-yellow-50 text-yellow-700 border-yellow-200">${escapeHtml(item)}</span>`
            ).join("")}
          </div>
        </div>
      ` : ""}

      ${completeness.missed.length ? `
        <div>
          <p class="text-xs font-semibold text-red-700 mb-2">Missed</p>
          <div class="flex flex-wrap gap-2">
            ${completeness.missed.map(item =>
              `<span class="${UI.pillBase} bg-red-50 text-red-700 border-red-200">${escapeHtml(item)}</span>`
            ).join("")}
          </div>
        </div>
      ` : ""}
    </article>

    <!-- Patient-centered checks -->
    <article class="${UI.card}">
      <div class="flex items-center gap-3 mb-4">
        <div class="${UI.iconBg}">
          <!-- ICON_PLACEHOLDER: patient-centered icon -->
          <img src="./icons/need.png" alt="Patient-centered checks" class="w-8 h-8 object-contain" />
        </div>
        <h3 class="${UI.headerTitle}">Patient-centered checks</h3>
      </div>

      <div class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <span class="${UI.headerSub}">Invited questions</span>
          <span class="${statusBadge(invited?.status)}">${statusLabel(invited?.status)}</span>
        </div>

        <div class="flex items-center justify-between gap-3">
          <span class="${UI.headerSub}">Checked understanding</span>
          <span class="${statusBadge(checked?.status)}">${statusLabel(checked?.status)}</span>
        </div>
      </div>

      ${(invited?.improvement || checked?.improvement) ? `
        <div class="mt-4 ${UI.subtleBox}">
          ${invited?.improvement ? `<div class="mb-2"><span class="font-semibold text-slate-900">Invited patient's questions:</span> ${escapeHtml(invited.improvement)}</div>` : ""}
          ${checked?.improvement ? `<div><span class="font-semibold text-slate-900">Checked patient's understanding:</span> ${escapeHtml(checked.improvement)}</div>` : ""}
        </div>
      ` : ""}

      <div class="mt-4">
        ${invited?.evidence ? renderEvidence(invited.evidence) : ""}
        ${checked?.evidence ? renderEvidence(checked.evidence) : ""}
      </div>
    </article>

    <!-- Improvements -->
    <article class="${UI.cardNoHover}">
      <div class="flex items-center gap-3 mb-4">
        <div class="${UI.iconBg}">
          <!-- ICON_PLACEHOLDER: improvement icon -->
          <img src="./icons/improve.png" alt="Improvements" class="w-8 h-8 object-contain" />
        </div>
        <div class="flex-1">
          <h3 class="${UI.headerTitle}">
            What can be improved in your next informed consent discussion?
          </h3>
          <p class="${UI.headerSub}">
            ${improvements.length ? `${improvements.length} improvement suggestion(s)` : ""}
          </p>
        </div>
      </div>

      ${
        improvements.length
          ? `<div class="space-y-4">
              ${improvements.slice(0, 8).map((i) => `
                <div class="bg-white/90 rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <p class="font-semibold text-slate-900">${escapeHtml(i.area)}</p>
                  <p class="${UI.headerSub} mt-2">${escapeHtml(i.why_it_matters)}</p>

                  <div class="mt-3 ${UI.divider} pt-3">
                    <p class="${UI.headerSub}">
                      <span class="font-semibold text-slate-900">Tip:</span> ${escapeHtml(i.actionable_tip)}
                    </p>
                  </div>

                  <div class="mt-4 bg-blue-50/70 border border-blue-200 rounded-2xl p-4">
                    <p class="text-xs md:text-[13px] text-slate-700">
                      <span class="font-semibold text-slate-900">Example phrase you can use:</span> ${escapeHtml(i.example_phrase)}
                    </p>
                  </div>
                </div>
              `).join("")}
            </div>`
          : `<p class="${UI.headerSub}">Great job! There are no further improvement suggestions.</p>`
      }
    </article>

    <!-- Actions (nav-style buttons) -->
    <div class="flex flex-wrap gap-3 justify-center">
      <button onclick="window.print()" class="${UI.btnNav}">
        <img src="./icons/completeness.png" alt="Print" class="${UI.btnNavIcon}" />
        <span class="${UI.btnNavText}">Print feedback</span>
      </button>

      <a href="./vignette-library.html" class="${UI.btnNav}">
        <img src="./icons/vignette-library-button.png" alt="Library" class="${UI.btnNavIcon}" />
        <span class="${UI.btnNavText}">Back to library</span>
      </a>

      <a href="./practice-module.html" class="${UI.btnNav}">
        <img src="./icons/practice-button.png" alt="Practice" class="${UI.btnNavIcon}" />
        <span class="${UI.btnNavText}">Practice again</span>
      </a>
    </div>
  `;
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
      throw new Error("Invalid feedback format received from the server.");
    }

    displayFeedback(data);

    localStorage.removeItem(`practiceConversation:${sessionId}`);
    localStorage.removeItem(`practiceVignette:${sessionId}`);
  } catch (error) {
    console.error("[feedback-module] Failed:", error);
    showError(error.message || "We are unable to analyze your conversation. Please try again.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  analyzePracticeSession();
});
