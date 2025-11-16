import { vignettes } from "./lib/vignettes.js";

console.log("[vignette-library] script loaded");
console.log("[vignette-library] vignettes:", vignettes);

function createVignetteCard(v) {
  const card = document.createElement("article");
  card.className =
    "bg-white/90 rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-3 items-center text-center hover:shadow-md transition-shadow";

  card.innerHTML = `
    <a 
      href="/vignette-view.html?vignette=${encodeURIComponent(v.id)}"
      class="block w-full"
    >
      <div class="mb-3 flex justify-center">
        <img 
          src="./icons/vignette.png" 
          alt="Patient vignette" 
          class="w-12 h-12 object-contain"
        />
      </div>
      <h2 class="text-base md:text-lg font-semibold text-slate-900">
        ${v.title}
      </h2>
    </a>

    <p class="text-xs md:text-[13px] text-slate-600">
      ${v.discipline} · Difficulty level: <span class="font-medium">beginner</span>
    </p>

    <p class="text-sm text-slate-700 max-w-xs">
      Diagnosis: ${v.clinical_profile.current_diagnosis}
    </p>

    <div class="mt-4 flex flex-wrap justify-center gap-3 w-full">
      <a
        href="/vignette-view.html?vignette=${encodeURIComponent(v.id)}"
        class="flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-xl border border-blue-200 text-xs md:text-sm font-semibold text-blue-600 hover:bg-blue-200 transition-colors"
      >
        View details
      </a>
      <a
        href="/practice-module.html?vignette=${encodeURIComponent(v.id)}"
        class="flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-xl border border-blue-200 text-xs md:text-sm font-semibold text-blue-600 hover:bg-blue-200 transition-colors"
      >
        Practice with this vignette
      </a>
    </div>
  `;

  return card;
}

function renderVignettes() {
  const container = document.getElementById("vignette-list");
  console.log("[vignette-library] container:", container);

  if (!container) return;

  vignettes.forEach((v) => {
    const card = createVignetteCard(v);
    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", renderVignettes);
