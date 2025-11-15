import { vignettes } from "./lib/vignettes.js";
import { buildPatientSystemPrompt } from "./lib/patient-prompt.js";
// ^ IMPORTANT: file name has a dash, so import it exactly like this

function getVignetteIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("vignette");
}

function renderNotFound() {
  const header = document.getElementById("vignette-header");
  const main = document.getElementById("vignette-main");
  const side = document.getElementById("vignette-side");
  const prompt = document.getElementById("vignette-prompt");

  if (header) {
    header.innerHTML = `
      <h1 class="text-xl md:text-2xl font-extrabold text-red-600 mb-1">
        Vignette not found
      </h1>
      <p class="text-sm text-slate-600">
        Please go back to the vignette library and choose another case.
      </p>
    `;
  }
  if (main) {
    main.innerHTML = "";
  }
  if (side) {
    side.innerHTML = `
      <a
        href="/vignette-library.html"
        class="inline-flex items-center justify-center w-full px-3 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700"
      >
        Back to vignette library
      </a>
    `;
  }
  if (prompt) {
    prompt.textContent = "";
  }
}

function renderVignette(v) {
  const header = document.getElementById("vignette-header");
  const main = document.getElementById("vignette-main");
  const side = document.getElementById("vignette-side");
  const promptEl = document.getElementById("vignette-prompt");

  // Header with bigger title + styled button (no underline)
  if (header) {
    header.innerHTML = `
      <div class="flex flex-col gap-3 pb-4">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 class="text-2xl md:text-4xl font-extrabold text-slate-900 mb-1">
              ${v.title}
            </h1>
            <p class="text-sm md:text-base text-slate-600">
              ${v.discipline} · ${v.difficulty_level} · ${v.demographics.age}-year-old ${v.demographics.gender}
            </p>
          </div>
          <a
            href="/practice-module.html?vignette=${encodeURIComponent(v.id)}"
            class="flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-xl border border-blue-200 text-xs md:text-sm font-semibold text-blue-600 hover:bg-blue-200 transition-colors"
          >
            Practice with this vignette
          </a>
        </div>
      </div>
    `;
  }

  // Make main span the full grid width
  if (main) {
    main.style.gridColumn = "1 / -1";

    main.innerHTML = `
      <div class="space-y-4 mt-4">

        <!-- Demographics -->
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            class="w-full flex items-center justify-between px-6 py-4 text-lg md:text-xl font-semibold text-slate-900 hover:bg-slate-50"
            data-accordion-button
            data-accordion-target="#panel-demographics"
          >
            <span class="flex items-center gap-3">
              <img
                src="./icons/demographic-info.png"
                alt="Demographics icon"
                class="w-8 h-8 md:w-9 md:h-9"
              />
              <span>Demographics</span>
            </span>
            <span data-accordion-icon class="text-2xl md:text-3xl leading-none">+</span>
          </button>
          <div
            id="panel-demographics"
            data-accordion-panel
            class="px-6 pb-6 pt-5 hidden text-sm md:text-[15px] text-slate-700"
          >
            <dl class="space-y-4">
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Patient's name:</dt>
                <dd class="flex-1">${v.demographics.name}</dd>
              </div>
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Age:</dt>
                <dd class="flex-1">${v.demographics.age}</dd>
              </div>
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Gender:</dt>
                <dd class="flex-1">${v.demographics.gender}</dd>
              </div>
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Nationality:</dt>
                <dd class="flex-1">${v.demographics.nationality}</dd>
              </div>
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Education level:</dt>
                <dd class="flex-1">${v.demographics.education_level}</dd>
              </div>
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Occupation:</dt>
                <dd class="flex-1">${v.demographics.current_job}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Clinical profile -->
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            class="w-full flex items-center justify-between px-6 py-4 text-lg md:text-xl font-semibold text-slate-900 hover:bg-slate-50"
            data-accordion-button
            data-accordion-target="#panel-clinical"
          >
            <span class="flex items-center gap-3">
              <img
                src="./icons/medical-info.png"
                alt="Clinical profile icon"
                class="w-8 h-8 md:w-9 md:h-9"
              />
              <span>Clinical profile</span>
            </span>
            <span data-accordion-icon class="text-2xl md:text-3xl leading-none">+</span>
          </button>
          <div
            id="panel-clinical"
            data-accordion-panel
            class="px-6 pb-6 pt-5 hidden text-sm md:text-[15px] text-slate-700"
          >
            <dl class="space-y-4">
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Current diagnosis:</dt>
                <dd class="flex-1">${v.clinical_profile.current_diagnosis}</dd>
              </div>
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Current symptoms:</dt>
                <dd class="flex-1">${v.clinical_profile.current_symptoms.join(", ")}</dd>
              </div>
              ${
                v.clinical_profile.other_conditions
                  ? `
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Other conditions:</dt>
                <dd class="flex-1">${v.clinical_profile.other_conditions}</dd>
              </div>`
                  : ""
              }
              ${
                v.clinical_profile.medications
                  ? `
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Medications:</dt>
                <dd class="flex-1">${v.clinical_profile.medications}</dd>
              </div>`
                  : ""
              }
              ${
                v.clinical_profile.allergies
                  ? `
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Allergies:</dt>
                <dd class="flex-1">${v.clinical_profile.allergies}</dd>
              </div>`
                  : ""
              }
              ${
                v.clinical_profile.disabilities
                  ? `
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Disabilities:</dt>
                <dd class="flex-1">${v.clinical_profile.disabilities}</dd>
              </div>`
                  : ""
              }
              ${
                v.clinical_profile.cognitive_state
                  ? `
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Cognitive state:</dt>
                <dd class="flex-1">${v.clinical_profile.cognitive_state}</dd>
              </div>`
                  : ""
              }
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Planned surgery:</dt>
                <dd class="flex-1">${v.clinical_profile.planned_surgery}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Communication & personality -->
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            class="w-full flex items-center justify-between px-6 py-4 text-lg md:text-xl font-semibold text-slate-900 hover:bg-slate-50"
            data-accordion-button
            data-accordion-target="#panel-communication"
          >
            <span class="flex items-center gap-3">
              <img
                src="/icons/communication-personality-info.png"
                alt="Communication icon"
                class="w-8 h-8 md:w-9 md:h-9"
              />
              <span>Communication & personality</span>
            </span>
            <span data-accordion-icon class="text-2xl md:text-3xl leading-none">+</span>
          </button>
          <div
            id="panel-communication"
            data-accordion-panel
            class="px-6 pb-6 pt-5 hidden text-sm md:text-[15px] text-slate-700"
          >
            <dl class="space-y-4">
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Language proficiency:</dt>
                <dd class="flex-1">${v.communication_personality.language_proficiency}</dd>
              </div>
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Communication style:</dt>
                <dd class="flex-1">${v.communication_personality.communication_style}</dd>
              </div>
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Psychological profile:</dt>
                <dd class="flex-1">${v.communication_personality.psychological_profile}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Social & lifestyle -->
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            class="w-full flex items-center justify-between px-6 py-4 text-lg md:text-xl font-semibold text-slate-900 hover:bg-slate-50"
            data-accordion-button
            data-accordion-target="#panel-social"
          >
            <span class="flex items-center gap-3">
              <img
                src="/icons/social-lifestyle-info.png"
                alt="Social and lifestyle icon"
                class="w-8 h-8 md:w-9 md:h-9"
              />
              <span>Social & lifestyle</span>
            </span>
            <span data-accordion-icon class="text-2xl md:text-3xl leading-none">+</span>
          </button>
          <div
            id="panel-social"
            data-accordion-panel
            class="px-6 pb-6 pt-5 hidden text-sm md:text-[15px] text-slate-700"
          >
            <dl class="space-y-4">
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Marital status:</dt>
                <dd class="flex-1">${v.social_lifestyle.marital_status}</dd>
              </div>
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Children:</dt>
                <dd class="flex-1">${v.social_lifestyle.children}</dd>
              </div>
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Key responsibilities:</dt>
                <dd class="flex-1">${v.social_lifestyle.key_responsibilities}</dd>
              </div>
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Social support:</dt>
                <dd class="flex-1">${v.social_lifestyle.social_support}</dd>
              </div>
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Hobbies:</dt>
                <dd class="flex-1">${v.social_lifestyle.hobbies}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Culture & beliefs -->
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            class="w-full flex items-center justify-between px-6 py-4 text-lg md:text-xl font-semibold text-slate-900 hover:bg-slate-50"
            data-accordion-button
            data-accordion-target="#panel-culture"
          >
            <span class="flex items-center gap-3">
              <img
                src="/icons/culture-beliefs-info.png"
                alt="Culture and beliefs icon"
                class="w-8 h-8 md:w-9 md:h-9"
              />
              <span>Culture & beliefs</span>
            </span>
            <span data-accordion-icon class="text-2xl md:text-3xl leading-none">+</span>
          </button>
          <div
            id="panel-culture"
            data-accordion-panel
            class="px-6 pb-6 pt-5 hidden text-sm md:text-[15px] text-slate-700"
          >
            <dl class="space-y-4">
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Cultural background:</dt>
                <dd class="flex-1">${v.culture_beliefs.cultural_background}</dd>
              </div>
              <div class="flex items-start gap-10">
                <dt class="w-64 font-semibold text-slate-900">Religious affiliation:</dt>
                <dd class="flex-1">${v.culture_beliefs.religious_affiliation}</dd>
              </div>
            </dl>
          </div>
        </div>

      </div>
    `;

    // Accordion behavior
    const buttons = main.querySelectorAll("[data-accordion-button]");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetSelector = btn.getAttribute("data-accordion-target");
        const panel = main.querySelector(targetSelector);
        if (!panel) return;

        const isOpen = !panel.classList.contains("hidden");

        // Close all panels
        main.querySelectorAll("[data-accordion-panel]").forEach((p) => {
          p.classList.add("hidden");
        });
        main.querySelectorAll("[data-accordion-icon]").forEach((icon) => {
          icon.textContent = "+";
        });

        // Open clicked if it was closed
        if (!isOpen) {
          panel.classList.remove("hidden");
          const icon = btn.querySelector("[data-accordion-icon]");
          if (icon) icon.textContent = "−";
        }
      });
    });
  }

  // Hide side column entirely
  if (side) {
    side.innerHTML = "";
    side.style.display = "none";
  }

  // Prompt
  if (promptEl) {
    const promptText = buildPatientSystemPrompt(v);
    promptEl.textContent = promptText;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.body.style.backgroundColor = "#ffffff";
  document.body.classList.remove("bg-slate-50", "bg-slate-100", "bg-slate-200");

  const id = getVignetteIdFromUrl();
  const vignette = vignettes.find((v) => v.id === id);
  if (!vignette) {
    renderNotFound();
  } else {
    renderVignette(vignette);
  }
});
