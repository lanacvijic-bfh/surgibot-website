// vignette-library.js
// Loads vignettes from /lib/vignettes.json and renders cards

console.log("[vignette-library] script loaded");

async function loadVignettes() {
  const res = await fetch("/lib/vignettes.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load vignettes.json (${res.status})`);
  const data = await res.json();

  if (!Array.isArray(data)) {
    throw new Error("vignettes.json must be an array of vignette objects");
  }
  return data;
}

function createVignetteCard(v) {
  const card = document.createElement("article");
  card.className =
    "bg-white/90 rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-3 items-center text-center hover:shadow-md transition-shadow h-full";

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
        ${v.title ?? ""}
      </h2>
    </a>

    <p class="text-xs md:text-[13px] text-slate-600">
      ${v.discipline ?? ""} · Difficulty level:
      <span class="font-medium">${v.difficulty_level ?? ""}</span>
    </p>

    <div class="mt-4 flex flex-wrap justify-center gap-3 w-full">
      <a
        href="/vignette-view.html?vignette=${encodeURIComponent(v.id)}"
        class="flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-xl border border-blue-200 text-xs md:text-sm font-semibold text-black hover:bg-blue-200 transition-colors"
      >
        View details
      </a>
      <a
        href="/practice-module.html?vignette=${encodeURIComponent(v.id)}"
        class="flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-xl border border-blue-200 text-xs md:text-sm font-semibold text-black hover:bg-blue-200 transition-colors"
      >
        Practice with this vignette
      </a>
    </div>
  `;

  return card;
}

async function renderVignettes() {
  const container = document.getElementById("vignette-list");
  console.log("[vignette-library] container:", container);

  if (!container) return;

  // Optional: clear container before rendering
  container.innerHTML = "";

  try {
    const vignettes = await loadVignettes();
    console.log("[vignette-library] vignettes:", vignettes);

    vignettes.forEach((v) => {
      container.appendChild(createVignetteCard(v));
    });
  } catch (err) {
    console.error("[vignette-library] failed to load vignettes:", err);
    container.innerHTML = `
      <p class="text-red-600">
        Failed to load vignettes. Check that <code>/lib/vignettes.json</code> exists and contains valid JSON.
      </p>
    `;
  }
}

document.addEventListener("DOMContentLoaded", renderVignettes);
