console.log("[practice-module] script loaded");

async function loadVignettes() {
  const res = await fetch("/lib/vignettes.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load vignettes.json (${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("vignettes.json must be an array of vignette objects");
  return data;
}

const SESSION_ID_KEY = "practiceSessionId";
const DEFAULT_SAMPLE_QUESTIONS = [
  "What worries you the most about the upcoming surgery?",
  "What questions do you have regarding the surgery?",
  "May you outline what we discussed in your own words?",
  "How are you feeling about the surgery at this moment?"
];

function createNewSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function startNewSession() {
  const id = createNewSessionId();
  localStorage.setItem(SESSION_ID_KEY, id);
  return id;
}

function getSessionId() {
  return localStorage.getItem(SESSION_ID_KEY);
}

function getSessionKeys(sessionId) {
  return {
    conversationKey: `practiceConversation:${sessionId}`,
    vignetteKey: `practiceVignette:${sessionId}`,
  };
}

function getVignetteIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("vignette");
  console.log("[practice-module] vignette id from URL:", id);
  return id;
}

function getSessionIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("session");
}

function resolveSessionId() {
  const sessionFromUrl = getSessionIdFromUrl();
  if (sessionFromUrl) {
    localStorage.setItem(SESSION_ID_KEY, sessionFromUrl);
    return sessionFromUrl;
  }

  return startNewSession();
}

function loadPracticeState(existingSessionId) {
  if (!existingSessionId) {
    return { messages: [], vignette: null };
  }

  try {
    const { conversationKey, vignetteKey } = getSessionKeys(existingSessionId);
    const storedMessages = JSON.parse(localStorage.getItem(conversationKey) || "[]");
    const storedVignette = JSON.parse(localStorage.getItem(vignetteKey) || "null");

    return {
      messages: Array.isArray(storedMessages) ? storedMessages : [],
      vignette: storedVignette && typeof storedVignette === "object" ? storedVignette : null,
    };
  } catch (error) {
    console.warn("[practice-module] failed to load existing practice state:", error);
    return { messages: [], vignette: null };
  }
}

function renderNoVignette() {
  const summary = document.getElementById("practice-vignette-summary");
  if (!summary) {
    console.warn("[practice-module] no element with id practice-vignette-summary found");
    return;
  }

  summary.innerHTML = `
    <div class="text-center">
      <h2 class="text-sm font-semibold text-slate-900 mb-2">No patient vignette selected</h2>
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

  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const speechModeBtn = document.getElementById("speechModeBtn");
  const textModeBtn = document.getElementById("textModeBtn");
  const startRecordingBtn = document.getElementById("startRecordingBtn");
  const sendTranscriptBtn = document.getElementById("sendTranscriptBtn");
  if (chatInput) chatInput.disabled = true;
  if (sendBtn) sendBtn.disabled = true;
  if (speechModeBtn) speechModeBtn.disabled = true;
  if (textModeBtn) textModeBtn.disabled = true;
  if (startRecordingBtn) startRecordingBtn.disabled = true;
  if (sendTranscriptBtn) sendTranscriptBtn.disabled = true;

  const startTimerBtn = document.getElementById("startTimerBtn");
  if (startTimerBtn) startTimerBtn.disabled = true;

  const reviewFeedbackBtn = document.getElementById("reviewFeedbackBtn");
  if (reviewFeedbackBtn) reviewFeedbackBtn.disabled = true;

  updatePatientHeader(null);
}

function renderVignetteSummary(v) {
  const summary = document.getElementById("practice-vignette-summary");
  if (!summary) return;

  const sampleQuestions = DEFAULT_SAMPLE_QUESTIONS;

  summary.innerHTML = `
    <div class="space-y-4">
      <h2 class="text-base md:text-l font-semibold text-slate-900 text-center">
        Key patient information
      </h2>

      <section class="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-4">
        <dl class="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 text-[15px] md:text-[12px] text-slate-700">
          <dt class="font-semibold text-slate-900">Name:</dt>
          <dd>${v.demographics?.name ?? ""}</dd>

          <dt class="font-semibold text-slate-900">Age:</dt>
          <dd>${v.demographics?.age ?? ""}</dd>

          <dt class="font-semibold text-slate-900">Job:</dt>
          <dd>${v.demographics?.current_job ?? ""}</dd>

          <dt class="font-semibold text-slate-900">Diagnosis:</dt>
          <dd>${v.clinical_profile?.current_diagnosis ?? ""}</dd>

          <dt class="font-semibold text-slate-900">Planned surgery:</dt>
          <dd>${v.clinical_profile?.planned_surgery ?? ""}</dd>
        </dl>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-4">
        <div class="space-y-2">
          <h3 class="text-base md:text-l font-semibold text-slate-900 text-center">
            Sample questions
          </h3>
          <div class="flex flex-col gap-2">
            ${sampleQuestions
              .map(
                (question) => `
                  <button
                    type="button"
                    class="sample-question-btn rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-normal text-slate-700 transition-colors hover:bg-blue-50 hover:border-blue-200"
                    data-question="${escapeAttribute(question)}"
                  >
                    ${escapeHtml(question)}
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
      </section>

      <a href="/vignette-view.html?vignette=${encodeURIComponent(v.id)}&session=${encodeURIComponent(sessionId)}"
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

let selectedVignette = null;
let messages = [];
let reviewFeedbackBtn = null;

let sessionId = null;
let communicationMode = "text";
let recognition = null;
let recognitionSupported = false;
let isRecording = false;
let transcriptDraft = "";
let timerExpired = false;
let patientIsTyping = false;

function updatePatientHeader(vignette) {
  return vignette
    ? `You are now speaking with ${vignette.demographics?.name ?? "the patient"}. Begin your informed consent discussion.`
    : "Start the discussion by greeting the patient and introducing yourself.";
}

function updateSampleQuestionButtonsState() {
  const buttons = document.querySelectorAll(".sample-question-btn");
  const sendBtn = document.getElementById("sendBtn");
  const isDisabled = timerExpired || sendBtn?.disabled === true;
  const disabledClassName =
    "sample-question-btn rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-normal text-slate-700 cursor-not-allowed";
  const enabledClassName =
    "sample-question-btn rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-normal text-slate-700 transition-colors hover:bg-blue-50 hover:border-blue-200";

  for (const button of buttons) {
    button.disabled = isDisabled;
    button.className = isDisabled ? disabledClassName : enabledClassName;
  }
}

function setupSampleQuestionButtons() {
  const buttons = document.querySelectorAll(".sample-question-btn");
  if (!buttons.length) return;

  for (const button of buttons) {
    button.addEventListener("click", async () => {
      const question = button.dataset.question?.trim();
      if (!question || button.disabled) return;
      await sendMessage(question);
    });
  }

  updateSampleQuestionButtonsState();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(str) {
  return escapeHtml(str).replaceAll('"', "&quot;");
}

function persistPracticeState() {
  try {
    if (!sessionId) return;

    const { conversationKey, vignetteKey } = getSessionKeys(sessionId);

    localStorage.setItem(conversationKey, JSON.stringify(messages));
    if (selectedVignette) {
      localStorage.setItem(vignetteKey, JSON.stringify(selectedVignette));
    }

    const indexKey = "practiceSessionsIndex";
    const idx = JSON.parse(localStorage.getItem(indexKey) || "[]");
    const already = idx.some((s) => s.sessionId === sessionId);
    if (!already && selectedVignette) {
      idx.unshift({
        sessionId,
        createdAt: new Date().toISOString(),
        vignetteId: selectedVignette.id,
        patientName: selectedVignette.demographics?.name || "Unknown",
      });
      localStorage.setItem(indexKey, JSON.stringify(idx.slice(0, 25)));
    }
  } catch (e) {
    console.warn("[practice-module] failed to persist practice state:", e);
  }
}

function updateFeedbackButtonState() {
  if (!reviewFeedbackBtn) return;
  const hasUserMessage =
    Array.isArray(messages) &&
    messages.some((m) => m.role === "user" && (m.content || "").trim().length > 0);

  reviewFeedbackBtn.disabled = !hasUserMessage;
}

function renderChat() {
  const chatHistoryEl = document.getElementById("chatHistory");
  if (!chatHistoryEl) return;

  chatHistoryEl.innerHTML = "";
  const starterHint = updatePatientHeader(selectedVignette);

  if (starterHint) {
    const hintWrap = document.createElement("div");
    hintWrap.className = "flex justify-center";

    const hint = document.createElement("div");
    hint.className =
      "max-w-2xl rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-center text-xs text-slate-600";
    hint.textContent = starterHint;

    hintWrap.appendChild(hint);
    chatHistoryEl.appendChild(hintWrap);
  }

  for (const m of messages) {
    const isUser = m.role === "user";
    const patientName = selectedVignette?.demographics?.name ?? "Patient";

    const row = document.createElement("div");
    row.className = `flex ${isUser ? "justify-end" : "justify-start"} items-end gap-2`;

    if (!isUser) {
      const avatar = document.createElement("div");
      avatar.className =
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white";
      avatar.innerHTML =
        '<img src="./icons/patient.png" alt="Patient" class="h-5 w-5 object-contain" />';
      row.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = isUser
      ? "max-w-[85%] rounded-2xl px-3 py-2 text-xs bg-blue-100 border border-blue-200 text-slate-900 font-normal"
      : "max-w-[85%] rounded-2xl px-3 py-2 text-xs bg-slate-100 border border-slate-200 text-slate-900";

    const header = isUser
      ? `<div class="mb-1 flex items-center justify-end text-[11px] text-slate-500">
          <span class="font-semibold text-slate-700">You</span>
          <span class="ml-1 font-semibold text-slate-700">(Surgical resident)</span>
        </div>`
      : `<div class="mb-1 items-center text-[11px] text-blue-500">
          <span class="font-semibold">Patient (${escapeHtml(patientName)})</span>
        </div>`;

    bubble.innerHTML = `${header}<div>${escapeHtml(m.content).replaceAll("\n", "<br/>")}</div>`;

    row.appendChild(bubble);
    chatHistoryEl.appendChild(row);
  }

  if (patientIsTyping) {
    const row = document.createElement("div");
    row.className = "flex justify-start items-end gap-2";

    const avatar = document.createElement("div");
    avatar.className =
      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white";
    avatar.innerHTML =
      '<img src="./icons/patient.png" alt="Patient" class="h-5 w-5 object-contain" />';
    row.appendChild(avatar);

    const bubble = document.createElement("div");
    bubble.className =
      "max-w-[85%] rounded-2xl px-3 py-2 text-xs bg-white text-slate-500 border border-gray-200";
    bubble.innerHTML = `
      <div class="flex items-center justify-center">
        <span class="inline-flex gap-1" aria-hidden="true">
          <span class="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse"></span>
          <span class="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:150ms]"></span>
          <span class="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:300ms]"></span>
        </span>
      </div>
    `;

    row.appendChild(bubble);
    chatHistoryEl.appendChild(row);
  }

  chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;

  persistPracticeState();
  updateFeedbackButtonState();
}

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function getSpeechControls() {
  return {
    speechModeBtn: document.getElementById("speechModeBtn"),
    textModeBtn: document.getElementById("textModeBtn"),
    speechComposer: document.getElementById("speechComposer"),
    chatForm: document.getElementById("chatForm"),
    chatInput: document.getElementById("chatInput"),
    sendBtn: document.getElementById("sendBtn"),
    startRecordingBtn: document.getElementById("startRecordingBtn"),
    sendTranscriptBtn: document.getElementById("sendTranscriptBtn"),
    transcriptPreview: document.getElementById("transcriptPreview"),
  };
}

function setTranscriptPreview(text, isMuted = false) {
  const { transcriptPreview } = getSpeechControls();
  if (!transcriptPreview) return;

  transcriptPreview.textContent = text;
  transcriptPreview.className = isMuted
    ? "block min-h-[32px] w-full overflow-hidden bg-transparent pt-0 text-sm leading-5 text-slate-400"
    : "block min-h-[32px] w-full overflow-hidden bg-transparent pt-0 text-sm leading-5 text-slate-700";
}

function autoResizeChatInput() {
  const { chatInput } = getSpeechControls();
  if (!chatInput) return;

  chatInput.style.height = "auto";
  chatInput.style.height = `${chatInput.scrollHeight}px`;
}

function updateComposerVisibility() {
  const { speechModeBtn, textModeBtn, speechComposer, chatForm, chatInput } = getSpeechControls();
  const isSpeechMode = communicationMode === "speech";

  if (speechComposer) speechComposer.classList.toggle("hidden", !isSpeechMode);
  if (chatForm) chatForm.classList.toggle("hidden", isSpeechMode);

  if (speechModeBtn) {
    speechModeBtn.setAttribute("aria-pressed", String(isSpeechMode));
    speechModeBtn.className = isSpeechMode
      ? "px-4 py-2 text-sm rounded-lg font-semibold bg-blue-100 border border-blue-200 text-slate-900"
      : "px-4 py-2 text-sm rounded-lg font-semibold text-slate-700 hover:bg-slate-100";
  }

  if (textModeBtn) {
    textModeBtn.setAttribute("aria-pressed", String(!isSpeechMode));
    textModeBtn.className = !isSpeechMode
      ? "px-4 py-2 text-sm rounded-lg font-semibold bg-blue-100 border border-blue-200 text-slate-900"
      : "px-4 py-2 text-sm rounded-lg font-semibold text-slate-700 hover:bg-slate-100";
  }

  if (!isSpeechMode && chatInput && !chatInput.disabled) {
    autoResizeChatInput();
    chatInput.focus();
  }
}

function updateSpeechControlsState() {
  const {
    startRecordingBtn,
    sendTranscriptBtn,
    speechModeBtn,
    textModeBtn,
    chatInput,
    sendBtn,
  } = getSpeechControls();
  const interactionDisabled = timerExpired;

  if (speechModeBtn) speechModeBtn.disabled = interactionDisabled;
  if (textModeBtn) textModeBtn.disabled = interactionDisabled;

  if (chatInput) chatInput.disabled = interactionDisabled || sendBtn?.disabled === true;

  if (startRecordingBtn) {
    startRecordingBtn.disabled = interactionDisabled || !recognitionSupported || isRecording;
    startRecordingBtn.textContent = isRecording ? "Listening" : "Record";
    startRecordingBtn.className = startRecordingBtn.disabled
      ? "shrink-0 min-w-[84px] rounded-lg border border-slate-200 bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 cursor-not-allowed"
      : "shrink-0 min-w-[84px] rounded-lg border border-blue-200 bg-blue-100 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-blue-200";
  }

  if (sendTranscriptBtn) {
    sendTranscriptBtn.disabled = interactionDisabled || !transcriptDraft.trim() || sendBtn?.disabled === true;
    sendTranscriptBtn.className = sendTranscriptBtn.disabled
      ? "shrink-0 min-w-[84px] rounded-lg border border-slate-200 bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 cursor-not-allowed"
      : "shrink-0 min-w-[84px] rounded-lg border border-blue-200 bg-blue-100 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-blue-200";
  }
}

function setSending(isSending) {
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");

  if (chatInput) chatInput.disabled = isSending || timerExpired;
  if (sendBtn) sendBtn.disabled = isSending || timerExpired;

  if (sendBtn) {
    sendBtn.textContent = isSending ? "Sending..." : "Send";
    sendBtn.className = isSending
      ? "shrink-0 min-w-[84px] rounded-lg border border-slate-200 bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 cursor-not-allowed"
      : "shrink-0 min-w-[84px] rounded-lg border border-blue-200 bg-blue-100 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-blue-200";
  }

  updateSpeechControlsState();
  updateSampleQuestionButtonsState();
}

async function sendMessage(userText) {
  if (!timerRunning && remainingSeconds === SESSION_SECONDS) startTimer();

  messages.push({ role: "user", content: userText });
  patientIsTyping = true;
  renderChat();
  setSending(true);

  try {
    const res = await fetch("api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vignette: selectedVignette,
        messages,
      }),
    });

    const ct = res.headers.get("content-type") || "";
    let data;

    if (ct.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      throw new Error(`API returned ${res.status} non-JSON: ${text.slice(0, 120)}`);
    }

    if (!res.ok) {
      patientIsTyping = false;
      messages.push({
        role: "assistant",
        content: `Error: ${data?.error ?? "Request failed"}`,
      });
      renderChat();
      return;
    }

    patientIsTyping = false;
    messages.push({ role: "assistant", content: data.text });
    renderChat();
  } catch (e) {
    patientIsTyping = false;
    messages.push({
      role: "assistant",
      content: `Network error. Please try again.\n${e?.message ? "(" + e.message + ")" : ""}`,
    });
    renderChat();
  } finally {
    setSending(false);
    const chatInput = document.getElementById("chatInput");
    if (chatInput && communicationMode === "text") {
      autoResizeChatInput();
      chatInput.focus();
    }
  }
}

function stopRecording() {
  if (recognition && isRecording) {
    recognition.stop();
  }
}

function setupSpeechRecognition() {
  const RecognitionCtor = getSpeechRecognitionCtor();
  recognitionSupported = Boolean(RecognitionCtor);

  if (!recognitionSupported) {
    communicationMode = "text";
    updateComposerVisibility();
    setTranscriptPreview("Speech recognition is not supported in this browser. Please use Chat mode...", true);
    updateSpeechControlsState();
    return;
  }

  recognition = new RecognitionCtor();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isRecording = true;
    setTranscriptPreview("Start speaking and your words will appear here...", true);
    updateSpeechControlsState();
  };

  recognition.onresult = (event) => {
    let combinedTranscript = "";
    for (let i = 0; i < event.results.length; i += 1) {
      combinedTranscript += event.results[i][0]?.transcript ?? "";
    }

    transcriptDraft = combinedTranscript.trim();
    setTranscriptPreview(
      transcriptDraft || "Start speaking and your words will appear here...",
      !transcriptDraft
    );
    updateSpeechControlsState();
  };

  recognition.onerror = (event) => {
    const message =
      event.error === "not-allowed"
        ? "Microphone access was denied. Please allow microphone access or switch to Chat mode..."
        : "Speech recognition ran into a problem. Please try again or switch to Chat mode...";
    isRecording = false;
    setTranscriptPreview(message, true);
    updateSpeechControlsState();
  };

  recognition.onend = () => {
    isRecording = false;

    if (transcriptDraft.trim()) {
      setTranscriptPreview(transcriptDraft);
    } else if (!timerExpired) {
      setTranscriptPreview("Your speech transcript will appear here...", true);
    }

    updateSpeechControlsState();
  };

  updateSpeechControlsState();
}

function setCommunicationMode(nextMode) {
  if (timerExpired) return;
  communicationMode = nextMode === "text" ? "text" : "speech";

  if (communicationMode === "text") {
    stopRecording();
  }

  updateComposerVisibility();
  updateSpeechControlsState();
}

function setupCommunicationModeUi() {
  const {
    speechModeBtn,
    textModeBtn,
    startRecordingBtn,
    sendTranscriptBtn,
  } = getSpeechControls();

  if (speechModeBtn) {
    speechModeBtn.addEventListener("click", () => setCommunicationMode("speech"));
  }

  if (textModeBtn) {
    textModeBtn.addEventListener("click", () => setCommunicationMode("text"));
  }

  if (startRecordingBtn) {
    startRecordingBtn.addEventListener("click", () => {
      if (!recognitionSupported || timerExpired || isRecording) return;
      transcriptDraft = "";
      setTranscriptPreview("Starting microphone...");
      updateSpeechControlsState();
      try {
        recognition.start();
      } catch (error) {
        setTranscriptPreview("The microphone could not be started. Please try again or switch to Chat mode...", true);
        updateSpeechControlsState();
      }
    });
  }

  if (sendTranscriptBtn) {
    sendTranscriptBtn.addEventListener("click", async () => {
      const text = transcriptDraft.trim();
      if (!text || timerExpired) return;

      stopRecording();
      transcriptDraft = "";
      setTranscriptPreview("Your speech transcript will appear here...", true);
      updateSpeechControlsState();
      await sendMessage(text);
    });
  }

  const { chatInput } = getSpeechControls();
  if (chatInput) {
    chatInput.addEventListener("input", () => autoResizeChatInput());
    chatInput.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter" || event.shiftKey) return;

      event.preventDefault();
      const text = chatInput.value.trim();
      if (!text || chatInput.disabled) return;

      chatInput.value = "";
      autoResizeChatInput();
      await sendMessage(text);
    });
    autoResizeChatInput();
  }

  updateComposerVisibility();
  setupSpeechRecognition();
}

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
  timerExpired = false;

  const startBtn = document.getElementById("startTimerBtn");
  if (startBtn) startBtn.textContent = "Running...";

  timerInterval = setInterval(() => {
    remainingSeconds -= 1;

    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      renderTimer();
      stopTimer();
      timerExpired = true;
      stopRecording();

      const input = document.getElementById("chatInput");
      const send = document.getElementById("sendBtn");
      if (input) input.disabled = true;
      if (send) send.disabled = true;

      messages.push({
        role: "assistant",
        content: "Time is up. Now you can review your feedback.",
      });
      renderChat();
      updateSpeechControlsState();
      updateSampleQuestionButtonsState();
      return;
    }

    renderTimer();
  }, 1000);
}

function resetTimerAndEnableChat() {
  stopTimer();
  remainingSeconds = SESSION_SECONDS;
  timerExpired = false;
  renderTimer();

  const input = document.getElementById("chatInput");
  const send = document.getElementById("sendBtn");
  if (input) input.disabled = false;
  if (send) send.disabled = false;
  autoResizeChatInput();
  updateSpeechControlsState();
  updateSampleQuestionButtonsState();
}

function setupFeedbackButton() {
  reviewFeedbackBtn = document.getElementById("reviewFeedbackBtn");
  if (!reviewFeedbackBtn) return;

  updateFeedbackButtonState();

  reviewFeedbackBtn.addEventListener("click", () => {
    if (!selectedVignette) {
      alert("No vignette selected.");
      return;
    }

    const hasUserMessage = messages.some(
      (m) => m.role === "user" && (m.content || "").trim().length > 0
    );
    if (!hasUserMessage) {
      alert("Please practice first (send at least one message) before viewing feedback.");
      return;
    }

    persistPracticeState();
    localStorage.setItem(`feedbackRequestedAt:${sessionId}`, new Date().toISOString());

    window.location.href = `./feedback-module.html?session=${encodeURIComponent(sessionId)}`;
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  sessionId = resolveSessionId();
  console.log("[practice-module] sessionId:", sessionId);

  renderTimer();

  const startBtn = document.getElementById("startTimerBtn");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      resetTimerAndEnableChat();
      startTimer();
    });
  }

  setupFeedbackButton();
  setupCommunicationModeUi();

  const id = getVignetteIdFromUrl();
  if (!id) {
    console.warn("[practice-module] no vignette id in URL");
    renderNoVignette();
    return;
  }

  let vignettes;
  try {
    vignettes = await loadVignettes();
  } catch (err) {
    console.error("[practice-module] failed to load vignettes:", err);
    renderNoVignette();
    return;
  }

  const vignette = vignettes.find((v) => String(v.id) === String(id));
  console.log("[practice-module] matched vignette:", vignette);

  if (!vignette) {
    renderNoVignette();
    return;
  }

  const restoredState = loadPracticeState(sessionId);

  selectedVignette = vignette;
  updatePatientHeader(vignette);
  renderVignetteSummary(vignette);
  setupSampleQuestionButtons();

  const restoredVignetteId = restoredState.vignette?.id;
  messages = restoredVignetteId && String(restoredVignetteId) === String(vignette.id) ? restoredState.messages : [];

  persistPracticeState();
  renderChat();

  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");

  if (chatForm) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = chatInput?.value?.trim();
      if (!text) return;

      chatInput.value = "";
      autoResizeChatInput();
      await sendMessage(text);
    });
  }
});
