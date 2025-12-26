// public/feedback-module.js
// Styled feedback UI matching SurgiBot modules + icon containers

const STORAGE_KEYS = {
  conversation: "practiceConversation",
  vignette: "currentVignette",
};

function getJsonFromStorage(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => {
    switch (m) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return m;
    }
  });
}

function showLoading() {
  const el = document.getElementById("feedback-container");
  if (!el) return;

  el.innerHTML = `
    <div class="bg-white rounded-3xl shadow-sm border border-gray-200/70 p-6 md:p-8">
      <div class="flex items-center gap-4">
        <!-- ICON CONTAINER (replace src with your custom icon) -->
        <div class="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center">
          <img src="./icons/feedback-button.png" alt="Loading icon" class="w-7 h-7" />
        </div>
        <div>
          <p class="text-slate-900 font-semibold text-base">Generating your feedback</p>
          <p class="text-xs text-gray-600">This may take a moment.</p>
        </div>
      </div>

      <div class="mt-6 space-y-3">
        <div class="h-3 rounded-full bg-gray-100"></div>
        <div class="h-3 rounded-full bg-gray-100 w-11/12"></div>
        <div class="h-3 rounded-full bg-gray-100 w-10/12"></div>
      </div>
    </div>
  `;
}

function showError(message) {
  const el = document.getElementById("feedback-container");
  if (!el) return;

  el.innerHTML = `
    <div class="bg-white rounded-3xl shadow-sm border border-red-200 p-6 md:p-8 text-center">
      <div class="mx-auto w-12 h-12 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center mb-3">
        <!-- ICON CONTAINER -->
        <img src="./icons/warning.png" alt="Error icon" class="w-7 h-7" onerror="this.style.display='none'" />
        <span class="text-red-700 font-bold" style="display:none">!</span>
      </div>
      <h3 class="text-lg font-bold text-red-800 mb-2">Unable to Generate Feedback</h3>
      <p class="text-sm text-red-700 mb-5">${escapeHtml(message)}</p>

      <div class="flex flex-col md:flex-row gap-3 justify-center">
        <button
          onclick="window.location.reload()"
          class="flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 rounded-xl border border-blue-200
                 text-xs md:text-sm font-semibold text-black hover:bg-blue-200 transition-colors"
        >
          Try again
        </button>

        <a
          href="./practice-module.html"
          class="flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 rounded-xl border border-blue-200
                 text-xs md:text-sm font-semibold text-black hover:bg-blue-200 transition-colors"
        >
          Back to practice
        </a>
      </div>
    </div>
  `;
}

function showNoConversation() {
  const el = document.getElementById("feedback-container");
  if (!el) return;

  el.innerHTML = `
    <div class="bg-white rounded-3xl shadow-sm border border-gray-200/70 p-6 md:p-8 text-center">
      <div class="mx-auto w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center mb-3">
        <!-- ICON CONTAINER -->
        <img src="./icons/practice-button.png" alt="Chat icon" class="w-7 h-7" />
      </div>
      <h3 class="text-lg font-bold text-slate-900 mb-2">No practice session found</h3>
      <p class="text-sm text-gray-700 mb-5">
        You need to complete a practice session before receiving feedback.
      </p>
      <a
        href="./practice-module.html"
        class="inline-flex items-center justify-center w-full md:w-auto gap-2 px-4 py-2 bg-blue-100 rounded-xl border border-blue-200
               text-xs md:text-sm font-semibold text-black hover:bg-blue-200 transition-colors"
      >
        Go to Practice module
      </a>
    </div>
  `;
}

function scoreToLabel(score) {
  const s = Number(score ?? 0);
  if (s >= 90) return "Excellent";
  if (s >= 75) return "Good";
  if (s >= 60) return "Satisfactory";
  if (s >= 45) return "Needs Improvement";
  return "Poor";
}

function chip(status) {
  const base = "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border";
  if (status === "covered") return `${base} bg-green-100 text-green-700 border-green-200`;
  if (status === "partially") return `${base} bg-yellow-100 text-yellow-800 border-yellow-200`;
  return `${base} bg-gray-100 text-gray-700 border-gray-200`;
}

function statusText(status) {
  if (status === "covered") return "Covered";
  if (status === "partially") return "Partially";
  return "Not covered";
}

function renderFeedbackUI(feedback) {
  const el = document.getElementById("feedback-container");
  if (!el) return;

  const score = Number(feedback.overall_score_0_100 ?? 0);
  const label = scoreToLabel(score);

  const strengths = Array.isArray(feedback.strengths) ? feedback.strengths : [];
  const improvements = Array.isArray(feedback.improvements) ? feedback.improvements : [];
  const checklist = Array.isArray(feedback.coverage_checklist) ? feedback.coverage_checklist : [];

  el.innerHTML = `
    <!-- TOP SUMMARY CARD -->
    <section class="bg-white rounded-3xl shadow-sm border border-gray-200/70 p-6 md:p-8 mb-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="flex items-center gap-4">
          <!-- ICON CONTAINER -->
          <div class="w-14 h-14 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center">
            <img src="./icons/feedback-button.png" alt="Feedback icon" class="w-8 h-8" />
          </div>

          <div>
            <p class="text-slate-900 font-semibold text-sm md:text-base">Overall performance</p>
            <p class="text-xs text-gray-600 mt-1">Your feedback is based on the conversation transcript.</p>
          </div>
        </div>

        <div class="text-center md:text-right">
          <p class="text-5xl font-extrabold text-slate-900 leading-none">${Number.isFinite(score) ? score : 0}/100</p>
          <span class="inline-flex mt-2 px-4 py-2 rounded-xl bg-blue-100 border border-blue-200 text-xs font-semibold text-slate-900">
            ${escapeHtml(label)}
          </span>
        </div>
      </div>
    </section>

    <!-- 2-COLUMN GRID -->
    <section class="grid lg:grid-cols-2 gap-6 mb-6">
      <!-- KEY STRENGTHS -->
      <div class="bg-white rounded-3xl shadow-sm border border-gray-200/70 p-6">
        <div class="flex items-center gap-3 mb-4">
          <!-- ICON CONTAINER -->
          <div class="w-11 h-11 rounded-2xl bg-green-100 border border-green-200 flex items-center justify-center">
            <img src="./icons/power.png" alt="Strengths icon" class="w-6 h-6" onerror="this.style.display='none'" />
          </div>
          <h3 class="text-sm md:text-base font-semibold text-slate-900">Key strengths</h3>
        </div>

        ${
          strengths.length
            ? `<ul class="space-y-2 text-sm text-gray-700">
                ${strengths.slice(0, 6).map(s => `<li>• ${escapeHtml(s)}</li>`).join("")}
              </ul>`
            : `<p class="text-sm text-gray-600">No strengths returned.</p>`
        }
      </div>

      <!-- PRIORITY IMPROVEMENTS -->
      <div class="bg-white rounded-3xl shadow-sm border border-gray-200/70 p-6">
        <div class="flex items-center gap-3 mb-4">
          <!-- ICON CONTAINER -->
          <div class="w-11 h-11 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center">
            <img src="./icons/improve.png" alt="Improvements icon" class="w-6 h-6" onerror="this.style.display='none'" />
          </div>
          <h3 class="text-sm md:text-base font-semibold text-slate-900">Priority improvements</h3>
        </div>

        ${
          improvements.length
            ? `<div class="space-y-3">
                ${improvements.slice(0, 4).map(i => `
                  <div class="rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3">
                    <p class="text-sm font-semibold text-slate-900">${escapeHtml(i.area)}</p>
                    <p class="text-xs text-gray-700 mt-1">${escapeHtml(i.actionable_tip)}</p>
                    <p class="text-xs text-gray-500 mt-2 italic">Example: ${escapeHtml(i.example_phrase)}</p>
                  </div>
                `).join("")}
              </div>`
            : `<p class="text-sm text-gray-600">No improvements returned.</p>`
        }
      </div>
    </section>

    <!-- CHECKLIST CARD -->
    <section class="bg-white rounded-3xl shadow-sm border border-gray-200/70 p-6 mb-6">
      <div class="flex items-center gap-3 mb-4">
        <!-- ICON CONTAINER -->
        <div class="w-11 h-11 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center">
          <img src="./icons/checklist.png" alt="Checklist icon" class="w-6 h-6" onerror="this.style.display='none'" />
        </div>
        <h3 class="text-sm md:text-base font-semibold text-slate-900">Coverage checklist</h3>
      </div>

      <div class="space-y-3">
        ${
          checklist.length
            ? checklist.map(c => `
                <div class="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                  <div class="flex items-start justify-between gap-4">
                    <p class="text-sm font-semibold text-slate-900">${escapeHtml(c.item)}</p>
                    <span class="${chip(c.status)}">${statusText(c.status)}</span>
                  </div>
                  <p class="text-xs text-gray-700 mt-2">${escapeHtml(c.quality_note || "")}</p>
                </div>
              `).join("")
            : `<p class="text-sm text-gray-600">No checklist returned.</p>`
        }
      </div>
    </section>

    <!-- ACTION BUTTONS (match practice module style) -->
    <section class="flex flex-col md:flex-row gap-3 justify-center">
      <button
        onclick="window.print()"
        class="flex items-center justify-center w-full md:w-auto gap-2 px-4 py-2 bg-blue-100 rounded-xl border border-blue-200
               text-xs md:text-sm font-semibold text-black hover:bg-blue-200 transition-colors"
      >
        Print feedback
      </button>

      <a
        href="./practice-module.html"
        class="flex items-center justify-center w-full md:w-auto gap-2 px-4 py-2 bg-blue-100 rounded-xl border border-blue-200
               text-xs md:text-sm font-semibold text-black hover:bg-blue-200 transition-colors"
      >
        Practice again
      </a>
    </section>
  `;
}

async function readErrorBody(response) {
  const ct = response.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await response.json().catch(() => ({}));
  return { error: await response.text().catch(() => "") };
}

async function loadFeedback() {
  const conversationHistory = getJsonFromStorage(STORAGE_KEYS.conversation);
  const patientVignette = getJsonFromStorage(STORAGE_KEYS.vignette);

  if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
    showNoConversation();
    return;
  }

  showLoading();

  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationHistory, patientVignette }),
    });

    if (!response.ok) {
      const err = await readErrorBody(response);
      throw new Error(err.error || err.details || `Server error: ${response.status}`);
    }

    const data = await response.json().catch(() => null);
    if (!data) throw new Error("Server returned invalid JSON.");

    const feedback = data.feedback ?? data;
    if (!feedback || typeof feedback !== "object") {
      throw new Error("Invalid feedback format.");
    }
    if (typeof feedback.overall_score_0_100 !== "number") {
      throw new Error("Feedback JSON missing overall_score_0_100.");
    }

    renderFeedbackUI(feedback);
  } catch (e) {
    showError(e?.message || "Unable to generate feedback.");
  }
}

document.addEventListener("DOMContentLoaded", loadFeedback);
