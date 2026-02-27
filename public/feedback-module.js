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

const UI = {
  shell: "",

  card:
    "bg-white/90 rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow",
  cardNoHover:
    "bg-white/90 rounded-2xl shadow-sm border border-slate-200 p-5",

  headerTitle: "text-base md:text-lg font-semibold text-slate-900",
  headerSub: "text-xs md:text-[13px] text-slate-600",

  btnNav:
    "inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-xl border border-blue-200 text-xs md:text-sm font-semibold text-black hover:bg-blue-200 transition-colors",
  btnNavText: "text-xs md:text-sm font-semibold text-slate-900",
  btnNavIcon: "w-8 h-8 object-contain",

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
      <div class="mb-4 flex justify-center">
        <img src="./icons/surgeon.png" alt="Surgeon" class="w-16 h-16 object-contain" />
      </div>

      <h3 class="text-lg md:text-2xl font-semibold text-slate-900 mb-5">
        How to get personalized feedback?
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-left mb-8">
        <div class="bg-white border border-blue-200 rounded-2xl p-5">
          <div class="flex items-center gap-3 mb-3">
            <div class="${UI.iconBg}">
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
      <p class="text-base md:text-lg font-semibold text-slate-900">Analyzing your discussion</p>
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

function getRatingBadgeClass(score0to100) {
  const s = Number(score0to100 ?? 0);
  if (s >= 90) return "bg-green-50 text-green-700 border-green-200";
  if (s >= 75) return "bg-blue-50 text-blue-700 border-blue-200";
  if (s >= 60) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  if (s >= 45) return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-red-50 text-red-700 border-red-200";
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
  return `${base} bg-red-50 text-red-700 border-red-200`;
}

function statusLabel(status) {
  if (status === "covered") return "Covered";
  if (status === "partially") return "Partially";
  return "Missed";
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
  if (ev.length === 0) return "";

  return `
    <div class="mt-3 space-y-2">
      ${ev.slice(0, 2).map((e) => `
        <div class="text-xs md:text-[13px] text-slate-600 bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2">
          <span class="font-semibold text-slate-900">${Number.isFinite(e.turn_index) ? `Message ${e.turn_index}` : "Covered in message number"}</span>:
          “${escapeHtml(e.quote || "")}”
        </div>
      `).join("")}
    </div>
  `;
}

function renderJargonAnalysis(jargon) {
  const ja = jargon && typeof jargon === "object" ? jargon : null;
  if (!ja) return "";

  const terms = Array.isArray(ja.medical_terms_found) ? ja.medical_terms_found : [];
  const suggestions = Array.isArray(ja.suggestions) ? ja.suggestions : [];

  return `
    <article class="${UI.card}">
      <div class="flex items-center gap-3 mb-4">
        <div class="${UI.iconBg}">
          <img src="./icons/language.png" alt="Jargon analysis" class="w-8 h-8 object-contain" />
        </div>
        <h3 class="${UI.headerTitle}">Medical jargon and clarity</h3>
      </div>

      <p class="${UI.headerSub} mb-4">${escapeHtml(ja.overall_assessment || "")}</p>

      ${
        terms.length
          ? `<div class="space-y-3">
              ${terms.slice(0, 10).map((t) => {
                const ok = !!t.explained_plainly;
                const badge = ok
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200";
                return `
                  <div class="bg-white/90 rounded-2xl border border-slate-200 p-4">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="font-semibold text-slate-900">${escapeHtml(t.term)}</p>
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-xs ${badge}">
                        ${ok ? "Explained" : "Not explained"}
                      </span>
                    </div>
                    <p class="${UI.headerSub} mt-1">
                      Found in Turn <span class="font-semibold text-slate-900">${Number.isFinite(t.turn_index) ? t.turn_index : ""}</span>
                    </p>
                    ${
                      t.plain_explanation_quote
                        ? `<div class="mt-3 text-xs md:text-[13px] text-slate-600 bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2">
                            <span class="font-semibold text-slate-900">Quote from the chat:</span>
                            “${escapeHtml(t.plain_explanation_quote)}”
                          </div>`
                        : ""
                    }
                  </div>
                `;
              }).join("")}
            </div>`
          : `<p class="${UI.headerSub}">No medical terms detected (or none were returned).</p>`
      }

      ${
        suggestions.length
          ? `<div class="mt-5 ${UI.divider} pt-4">
              <p class="text-sm font-semibold text-slate-900 mb-2">Suggestions</p>
              <ul class="list-disc pl-5 space-y-1 ${UI.headerSub}">
                ${suggestions.slice(0, 8).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
              </ul>
            </div>`
          : ""
      }
    </article>
  `;
}

function renderNextSessionFocus(nextFocus) {
  const nf = nextFocus && typeof nextFocus === "object" ? nextFocus : null;
  if (!nf) return "";

  const drills = Array.isArray(nf.practice_drills) ? nf.practice_drills : [];

  return `
    <article class="${UI.cardNoHover}">
      <div class="flex items-center gap-3 mb-4">
        <div class="${UI.iconBg}">
          <img src="./icons/focus.png" alt="Tips for the next session" class="w-8 h-8 object-contain" />
        </div>
        <h3 class="${UI.headerTitle}">Tips for the next session</h3>
      </div>

      <div class="bg-white/90 rounded-2xl border border-slate-200 p-5">
        <p class="text-sm font-semibold text-slate-900 mb-2">Goal</p>
        <p class="${UI.headerSub}">${escapeHtml(nf.goal || "")}</p>

        ${drills.length
          ? `<div class="mt-4 ${UI.divider} pt-4">
              <p class="text-sm font-semibold text-slate-900 mb-2">Actionable practice drills that can help you achieve the goal</p>
              <ul class="list-disc pl-5 space-y-1 ${UI.headerSub}">
                ${drills.slice(0, 10).map((d) => `<li>${escapeHtml(d)}</li>`).join("")}
              </ul>
            </div>`
          : ""
        }
      </div>
    </article>
  `;
}

function renderSurveyInvitation() {
  return `
    <article class="${UI.cardNoHover} bg-blue-50/70 border-blue-200">
      <div class="flex items-center gap-3 mb-3">
        <div class="${UI.iconBg}">
          <img src="./icons/survey.png" alt="Survey" class="w-8 h-8 object-contain" />
        </div>
        <h3 class="text-base font-semibold text-black">Share your experience</h3>
      </div>

      <p class="text-sm md:text-base text-gray-700 leading-relaxed mb-4">
        Please complete the short questionnaire about your experience with SurgiBot by clicking the button below.
      </p>

      <a
        href="https://forms.cloud.microsoft/e/ett0dhJ1Ug"
        target="_blank"
        rel="noopener noreferrer"
        class="${UI.btnNav}"
      >
        <img src="./icons/click-here.png" alt="Click here" class="${UI.btnNavIcon}" />
        <span class="${UI.btnNavText}">Start the questionnaire</span>
      </a>
    </article>
  `;
}

function normalizeStatus(st) {
  if (st === "covered") return "covered";
  if (st === "partially") return "partially";
  return "missed"; 
}

function patientCenteredItem(label, obj) {
  const status = normalizeStatus(obj?.status);
  const improvement = (obj?.improvement || "").trim();
  const evidence = obj?.evidence;

  const statusText =
    status === "covered" ? "Covered" : status === "partially" ? "Partially" : "Missed";

  const pillClass =
    status === "covered"
      ? "bg-green-50 text-green-700 border-green-200"
      : status === "partially"
      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
      : "bg-red-50 text-red-700 border-red-200";

  return `
    <div class="bg-white/90 rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="font-semibold text-slate-900">${escapeHtml(label)}</p>
        <span class="${UI.pillBase} ${pillClass}">${statusText}</span>
      </div>

      ${
        improvement
          ? `<p class="${UI.headerSub} mt-2"><span class="font-semibold text-slate-900">Tip:</span> ${escapeHtml(
              improvement
            )}</p>`
          : ""
      }

      ${evidence ? renderEvidence(evidence) : ""}
    </div>
  `;
}

function defaultPatientCenteredTips(invited, checked) {
  const tips = [];

  const invStatus = normalizeStatus(invited?.status);
  const chkStatus = normalizeStatus(checked?.status);

  if ((invited?.improvement || "").trim()) {
    tips.push(invited.improvement.trim());
  } else if (invStatus !== "covered") {
    tips.push("Explicitly invite patient questions to encourage engagement and clarify concerns.");
  }

  if ((checked?.improvement || "").trim()) {
    tips.push(checked.improvement.trim());
  } else if (chkStatus !== "covered") {
    tips.push("Check understanding using a teach-back question (e.g., “Can you summarize what you understood so far?”).");
  }

  return [...new Set(tips.filter(Boolean))];
}

function displayFeedback(raw) {
  const container = document.getElementById("feedback-container");
  if (!container) return;

  container.className = `${UI.shell} ${UI.stack}`;

  const feedback = raw?.feedback && typeof raw?.success !== "undefined" ? raw.feedback : raw;

  const score = Number(feedback?.overall_score_0_100 ?? 0);
  const rating = scoreToRating(score);
  const ratingBadgeClass = getRatingBadgeClass(score);

  const completeness = computeCompleteness(feedback?.coverage_checklist);

  const strengths = Array.isArray(feedback?.strengths) ? feedback.strengths : [];
  const improvements = Array.isArray(feedback?.improvements) ? feedback.improvements : [];

  const invited = feedback?.understanding_and_questions?.invited_questions;
  const checked = feedback?.understanding_and_questions?.checked_understanding;

  const jargon = feedback?.jargon_analysis;
  const nextFocus = feedback?.next_session_focus;

  const pcTips = defaultPatientCenteredTips(invited, checked);

  container.innerHTML = `
    <article class="${UI.cardNoHover} text-center">
      <div class="mb-4 flex justify-center">
        <img src="./icons/surgeon.png" alt="Surgeon" class="w-16 h-16 object-contain" />
      </div>

      <p class="text-lg md:text-xl font-bold text-slate-900 mb-2">Overall performance</p>
      <h2 class="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
      ${Number.isFinite(score) ? score : 0}/100
      </h2>


      <div class="inline-flex items-center px-4 py-2 rounded-full text-xs md:text-sm font-semibold border ${ratingBadgeClass}">
        ${rating}
      </div>

    </article>

    <article class="${UI.card}">
      <div class="flex items-center gap-3 mb-4">
        <div class="${UI.iconBg}">
          <img src="./icons/power.png" alt="Strengths" class="w-8 h-8 object-contain" />
        </div>
        <h3 class="${UI.headerTitle}">Your key strengths</h3>
      </div>

      ${
        strengths.length
          ? `<ul class="list-disc pl-5 space-y-1 ${UI.headerSub}">
              ${strengths.slice(0, 10).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
            </ul>`
          : `<p class="${UI.headerSub}">No strengths were returned.</p>`
      }
    </article>

    <article class="${UI.card}">
      <div class="flex items-center justify-between gap-3 mb-4">
        <div class="flex items-center gap-3">
          <div class="${UI.iconBg}">
            <img src="./icons/completeness.png" alt="Completeness" class="w-8 h-8 object-contain" />
          </div>
          <h3 class="${UI.headerTitle}">Completeness of the discussion</h3>
        </div>

        <div class="px-4 py-2 rounded-xl text-sm md:text-base font-semibold ${getScoreColor(completeness.score)}">
          ${completeness.score}%
        </div>
      </div>

      <p class="${UI.headerSub} mb-4">
        ${completeness.missed.length
          ? "In the next informed consent discussion, focus on the missed or partially covered topics below."
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

    <article class="${UI.card}">
      <div class="flex items-center gap-3 mb-4">
        <div class="${UI.iconBg}">
          <img src="./icons/need.png" alt="Patient-centered communication checks" class="w-8 h-8 object-contain" />
        </div>
        <h3 class="${UI.headerTitle}">Patient-centered communication checks</h3>
      </div>

      <div class="space-y-4">
        ${patientCenteredItem("Patient's questions were invited", invited)}
        ${patientCenteredItem("Patient's understanding was checked throughout the discussion", checked)}
      </div>

      ${
        pcTips.length
          ? `<div class="mt-5 ${UI.divider} pt-4">
              <p class="text-sm font-semibold text-slate-900 mb-2">Actionable tips for your next practice session</p>
              <ul class="list-disc pl-5 space-y-1 ${UI.headerSub}">
                ${pcTips.slice(0, 6).map((t) => `<li>${escapeHtml(t)}</li>`).join("")}
              </ul>
            </div>`
          : ""
      }
    </article>

    ${renderJargonAnalysis(jargon)}

    <article class="${UI.cardNoHover}">
      <div class="flex items-center gap-3 mb-4">
        <div class="${UI.iconBg}">
          <img src="./icons/improve.png" alt="Improvements" class="w-8 h-8 object-contain" />
        </div>
        <div class="flex-1">
          <h3 class="${UI.headerTitle}">Areas for improvement</h3>
          <p class="${UI.headerSub}">${improvements.length ? `${improvements.length} improvement suggestions` : ""}</p>
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

    ${renderNextSessionFocus(nextFocus)}

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

    ${renderSurveyInvitation()}
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
