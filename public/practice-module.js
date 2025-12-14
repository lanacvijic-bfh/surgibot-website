import { vignettes } from "./lib/vignettes.js";

console.log("[practice-module] script loaded");

// -----------------------------
// Helpers (vignette selection)
// -----------------------------
function getVignetteIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("vignette");
  console.log("[practice-module] vignette id from URL:", id);
  return id;
}

function renderNoVignette() {
  const summary = document.getElementById("practice-vignette-summary");
  if (!summary) {
    console.warn("[practice-module] no element with id practice-vignette-summary found");
    return;
  }

  summary.innerHTML = `
    <div class="text-center">
      <h2 class="text-sm font-semibold text-slate-900 mb-2">No vignette selected</h2>
      <p class="mb-4">
        Go back to the vignette library and choose a patient case you want to practice with.
      </p>
      <a href="./vignette-library.html"
        class="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-xl border border-blue-200
               text-xs md:text-sm font-semibold text-black hover:bg-blue-200 transition-colors mx-auto">
        Go to vignette library
      </a>
    </div>
  `;

  // disable chat if present
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  if (chatInput) chatInput.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  // disable timer button too
  const startTimerBtn = document.getElementById("startTimerBtn");
  if (startTimerBtn) startTimerBtn.disabled = true;
}

function renderVignetteSummary(v) {
  const summary = document.getElementById("practice-vignette-summary");
  if (!summary) return;

  summary.innerHTML = `
    <div class="space-y-4">
      <h2 class="text-base md:text-l font-semibold text-slate-900 text-center">
        Key patient information
      </h2>

      <section class="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-4">
        <dl class="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 text-[15px] md:text-[12px] text-slate-700">
          <dt class="font-semibold text-slate-900">Name:</dt>
          <dd>${v.demographics.name}</dd>

          <dt class="font-semibold text-slate-900">Age:</dt>
          <dd>${v.demographics.age}</dd>

          <dt class="font-semibold text-slate-900">Job:</dt>
          <dd>${v.demographics.current_job}</dd>

          <dt class="font-semibold text-slate-900">Diagnosis:</dt>
          <dd>${v.clinical_profile.current_diagnosis}</dd>

          <dt class="font-semibold text-slate-900">Planned surgery:</dt>
          <dd>${v.clinical_profile.planned_surgery}</dd>
        </dl>
      </section>

      <a href="/vignette-view.html?vignette=${encodeURIComponent(v.id)}"
        class="flex items-center justify-center w-full gap-2 px-4 py-2 bg-blue-100 rounded-xl border border-blue-200
               text-xs md:text-sm font-semibold text-black hover:bg-blue-200 transition-colors">
        View full vignette details
      </a>

      <a href="/vignette-library.html"
        class="flex items-center justify-center w-full gap-2 px-4 py-2 mt-3 bg-blue-100 rounded-xl border border-blue-200
               text-xs md:text-sm font-semibold text-black hover:bg-blue-200 transition-colors">
        Choose a different vignette
      </a>
    </div>
  `;
}

// -----------------------------
// Chat logic
// -----------------------------
let selectedVignette = null;
let messages = [];

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderChat() {
  const chatHistoryEl = document.getElementById("chatHistory");
  if (!chatHistoryEl) return;

  chatHistoryEl.innerHTML = "";

  for (const m of messages) {
    const isUser = m.role === "user";

    const row = document.createElement("div");
    row.className = `flex ${isUser ? "justify-end" : "justify-start"}`;

    const bubble = document.createElement("div");
    bubble.className = isUser
      ? "max-w-[85%] rounded-2xl px-3 py-2 text-xs bg-blue-100 border border-blue-200 text-slate-900 font-normal"
      : "max-w-[85%] rounded-2xl px-3 py-2 text-xs bg-white text-slate-900 border border-gray-200";

    bubble.innerHTML = escapeHtml(m.content).replaceAll("\n", "<br/>");

    row.appendChild(bubble);
    chatHistoryEl.appendChild(row);
  }

  chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}

function setSending(isSending) {
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");

  if (chatInput) chatInput.disabled = isSending;
  if (sendBtn) sendBtn.disabled = isSending;

  if (sendBtn) {
    sendBtn.textContent = isSending ? "Sending..." : "Send";
    sendBtn.className = isSending
      ? "px-3 py-2 text-xs rounded-xl bg-slate-200 text-slate-500 cursor-not-allowed"
      : "px-3 py-2 text-xs rounded-xl bg-blue-100 border border-blue-200 font-semibold text-slate-900 hover:bg-blue-200 transition-colors";
  }
}

async function sendMessage(userText) {
  if (!timerRunning && remainingSeconds === SESSION_SECONDS) startTimer();

  messages.push({ role: "user", content: userText });
  renderChat();
  setSending(true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vignette: selectedVignette,
        messages,
      }),
    });

    // safer parsing (so you see real errors, not just "network error")
    const ct = res.headers.get("content-type") || "";
    let data;

    if (ct.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      throw new Error(`API returned ${res.status} non-JSON: ${text.slice(0, 120)}`);
    }

    if (!res.ok) {
      messages.push({ role: "assistant", content: `Error: ${data?.error ?? "Request failed"}` });
      renderChat();
      return;
    }

    messages.push({ role: "assistant", content: data.text });
    renderChat();
  } catch (e) {
    messages.push({
      role: "assistant",
      content: `Network error. Please try again.\n${e?.message ? "(" + e.message + ")" : ""}`,
    });
    renderChat();
  } finally {
    setSending(false);
    const chatInput = document.getElementById("chatInput");
    if (chatInput) chatInput.focus();
  }
}

// -----------------------------
// 15-minute timer logic
// -----------------------------
const SESSION_SECONDS = 15 * 60;
let timerInterval = null;
let remainingSeconds = SESSION_SECONDS;
let timerRunning = false;

function formatTime(totalSeconds) {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function renderTimer() {
  const timerLabel = document.getElementById("timerLabel");
  if (timerLabel) timerLabel.textContent = formatTime(remainingSeconds);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;

  const startBtn = document.getElementById("startTimerBtn");
  if (startBtn) startBtn.textContent = "Start 15-min session";
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;

  const startBtn = document.getElementById("startTimerBtn");
  if (startBtn) startBtn.textContent = "Running...";

  timerInterval = setInterval(() => {
    remainingSeconds -= 1;

    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      renderTimer();
      stopTimer();

      // disable chat when time is up
      const input = document.getElementById("chatInput");
      const send = document.getElementById("sendBtn");
      if (input) input.disabled = true;
      if (send) send.disabled = true;

      // add a system message in chat
      messages.push({
        role: "assistant",
        content: "Time is up. Now you can review your feedback.",
      });
      renderChat();

      return;
    }

    renderTimer();
  }, 1000);
}

function resetTimerAndEnableChat() {
  stopTimer();
  remainingSeconds = SESSION_SECONDS;
  renderTimer();

  // re-enable chat
  const input = document.getElementById("chatInput");
  const send = document.getElementById("sendBtn");
  if (input) input.disabled = false;
  if (send) send.disabled = false;
}

// -----------------------------
// Boot
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  // init timer display + button
  renderTimer();

  const startBtn = document.getElementById("startTimerBtn");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      // start from 15:00 each time
      resetTimerAndEnableChat();
      startTimer();
    });
  }

  // vignette selection
  const id = getVignetteIdFromUrl();
  if (!id) {
    console.warn("[practice-module] no vignette id in URL");
    renderNoVignette();
    return;
  }

  const vignette = vignettes.find((v) => v.id === id);
  console.log("[practice-module] matched vignette:", vignette);

  if (!vignette) {
    renderNoVignette();
    return;
  }

  selectedVignette = vignette;
  renderVignetteSummary(vignette);

  // initial patient greeting
  messages = [
    {
      role: "assistant",
      content: `Good day doctor. I'm ${vignette.demographics.name}. I'm here about the planned surgery. Can you explain what's going to happen?`,
    },
  ];
  renderChat();

  // chat submit handler
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");

  if (chatForm) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const text = chatInput?.value?.trim();
      if (!text) return;

      chatInput.value = "";
      await sendMessage(text);
    });
  }
});
