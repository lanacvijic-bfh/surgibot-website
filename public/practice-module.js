import { vignettes } from "./lib/vignettes.js";

console.log("[practice-module] script loaded");

function getVignetteIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("vignette");
  console.log("[practice-module] vignette id from URL:", id);
  return id;
}

function renderNoVignette() {
  const summary = document.getElementById("practice-vignette-summary");
  if (!summary) {
    console.warn(
      "[practice-module] no element with id practice-vignette-summary found"
    );
    return;
  }

  summary.innerHTML = `
    <h2 class="text-sm font-semibold text-slate-900 mb-2">
      No vignette selected
    </h2>
    <p class="mb-2">
      Go back to the vignette library and choose a patient case you want to
      practice with.
    </p>
    <a
      href="/vignette-library.html"
      class="inline-flex items-center justify-center w-full px-3 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700"
    >
      Go to vignette library
    </a>
  `;
}

function renderVignetteSummary(v) {
  const summary = document.getElementById("practice-vignette-summary");
  if (!summary) return;

  summary.innerHTML = `
    <h2 class="text-sm md:text-base font-semibold text-slate-900">
      My patient vignette
    </h2>
    <p class="text-[11px] text-slate-500 mb-3">
      ${v.title}
    </p>

<!-- Part 1: Patient information -->
<section class="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-4">
  <h3 class="text-xs md:text-sm font-semibold text-slate-900 mb-3">
    Patient information
  </h3>
  <dl class="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 text-[11px] md:text-[12px] text-slate-700">
    <dt class="font-semibold text-slate-900">Name:</dt>
    <dd>${v.demographics.name}</dd>

    <dt class="font-semibold text-slate-900">Age:</dt>
    <dd>${v.demographics.age}</dd>

    <dt class="font-semibold text-slate-900">Diagnosis:</dt>
    <dd>${v.clinical_profile.current_diagnosis}</dd>

    <dt class="font-semibold text-slate-900">Planned surgery:</dt>
    <dd>${v.clinical_profile.planned_surgery}</dd>
  </dl>
</section>


    <!-- Actions -->
<a
  href="/vignette-view.html?vignette=${encodeURIComponent(v.id)}"
  class="flex items-center justify-center w-full gap-2 px-4 py-2 bg-blue-100 rounded-xl border border-blue-200 text-xs md:text-sm font-semibold text-blue-600 hover:bg-blue-200 transition-colors"
>
  View full vignette details
</a>

<a
  href="/vignette-library.html"
  class="flex items-center justify-center w-full gap-2 px-4 py-2 mt-3 bg-blue-100 rounded-xl border border-blue-200 text-xs md:text-sm font-semibold text-blue-600 hover:bg-blue-200 transition-colors"
>
  Choose a different vignette
</a>

  `;
}

document.addEventListener("DOMContentLoaded", () => {
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

  renderVignetteSummary(vignette);
});
