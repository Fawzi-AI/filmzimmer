import {
  getFavourites,
  removeFavourite,
  setNote,
} from "../01_utils/storage-manager.js";

const TMDB_BASE_W342 = "https://image.tmdb.org/t/p/w342";

function qs(sel) {
  return document.querySelector(sel);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatYear(dateStr) {
  if (!dateStr) return "";
  const s = String(dateStr);
  const year = s.length >= 4 ? s.slice(0, 4) : "";
  return /^\d{4}$/.test(year) ? year : "";
}

function formatRating(voteAverage) {
  if (
    voteAverage === null ||
    voteAverage === undefined ||
    Number.isNaN(Number(voteAverage))
  )
    return "";
  const n = Number(voteAverage);
  return `${n.toFixed(1)}/10`;
}

function showStatus(message) {
  const statusEl = qs("#journal-status");
  if (!statusEl) return;

  if (!message) {
    statusEl.classList.add("hidden");
    statusEl.textContent = "";
    return;
  }

  statusEl.textContent = message;
  statusEl.classList.remove("hidden");
}

function toggleEmptyState(isEmpty) {
  const emptyEl = qs("#empty-state");
  const gridEl = qs("#favourites-grid");

  if (emptyEl) emptyEl.classList.toggle("hidden", !isEmpty);
  if (gridEl) gridEl.classList.toggle("hidden", isEmpty);
}

function resolvePosterSrc(posterPathOrUrl) {
  if (!posterPathOrUrl) return null;
  const v = String(posterPathOrUrl);

  // Falls Index bereits URL gespeichert hat: direkt nutzen
  if (v.startsWith("http://") || v.startsWith("https://")) return v;

  // sonst TMDB-Pfad "/abc.jpg"
  return `${TMDB_BASE_W342}${v}`;
}

function buildPoster(posterPathOrUrl, title) {
  const src = resolvePosterSrc(posterPathOrUrl);

  if (src) {
    return `
      <img
        src="${src}"
        alt="${escapeHtml(title)}"
        class="h-64 w-full rounded-xl object-cover"
        loading="lazy"
      />
    `;
  }

  return `
    <div class="flex h-64 w-full items-center justify-center rounded-xl bg-slate-900/60 text-slate-400">
      <span class="text-sm">Kein Poster</span>
    </div>
  `;
}

/**
 * Scrollt zur Favoriten-Card, wenn ein Hash wie #fav-123 vorhanden ist.
 * Optionales Highlight, damit der Nutzer sofort sieht, wo er gelandet ist.
 */
function scrollToFavouriteFromHash() {
  const hash = (window.location.hash || "").trim();
  if (!hash.startsWith("#fav-")) return;

  const el = document.querySelector(hash);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "start" });

  // kurzes Highlight (Tailwind utility Klassen)
  el.classList.add("ring-2", "ring-slate-500");
  window.setTimeout(() => {
    el.classList.remove("ring-2", "ring-slate-500");
  }, 1200);
}

function createCard(item) {
  const title = item.title || item.name || "Unbekannter Titel";
  const year = formatYear(item.release_date || item.first_air_date);
  const rating = formatRating(item.vote_average);
  const overview = item.overview || "";
  const note = item.note || "";

  const posterHtml = buildPoster(item.poster_path, title);
  const metaParts = [year, rating].filter(Boolean);
  const meta = metaParts.length ? metaParts.join(" • ") : "";

  const card = document.createElement("article");
  card.className =
    "rounded-2xl border border-slate-800 bg-slate-900/30 p-4 shadow-sm backdrop-blur";

  // >>> Sprungmarke für Direktnavigation (journal.html#fav-<id>)
  card.id = `fav-${item.id}`;
  card.dataset.favId = String(item.id);
  // <<<

  card.innerHTML = `
    <div class="flex flex-col gap-4">
      ${posterHtml}

      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="truncate text-lg font-semibold text-slate-100">${escapeHtml(title)}</h3>
          ${
            meta
              ? `<p class="mt-1 text-sm text-slate-300">${escapeHtml(meta)}</p>`
              : `<p class="mt-1 text-sm text-slate-400"> </p>`
          }
        </div>

        <button
          type="button"
          data-action="remove"
          class="shrink-0 rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-950/70"
          aria-label="Aus Favoriten entfernen"
          title="Entfernen"
        >
          Entfernen
        </button>
      </div>

      ${
        overview
          ? `<p class="line-clamp-4 text-sm text-slate-300">${escapeHtml(overview)}</p>`
          : `<p class="text-sm text-slate-500">Keine Beschreibung vorhanden.</p>`
      }

      <div class="mt-1">
        <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Notiz
        </label>
        <textarea
          data-note
          rows="3"
          class="w-full resize-none rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600"
          placeholder="Deine Notiz zum Film/Serie..."
        >${escapeHtml(note)}</textarea>
        <p class="mt-2 text-xs text-slate-500">Notizen werden automatisch gespeichert.</p>
      </div>
    </div>
  `;

  // Entfernen
  card
    .querySelector('[data-action="remove"]')
    ?.addEventListener("click", () => {
      removeFavourite(item.id);
      showStatus(`Entfernt: ${title}`);
      render();
    });

  // Notiz speichern (debounced)
  const textarea = card.querySelector("[data-note]");
  if (textarea) {
    let t = null;

    const commit = () => {
      const updated = setNote(item.id, textarea.value);
      if (updated) showStatus(`Notiz gespeichert: ${title}`);
    };

    textarea.addEventListener("input", () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(commit, 400);
    });

    textarea.addEventListener("blur", () => {
      if (t) window.clearTimeout(t);
      commit();
    });
  }

  return card;
}

function render() {
  const grid = qs("#favourites-grid");
  if (!grid) return;

  const favs = getFavourites();
  toggleEmptyState(favs.length === 0);

  grid.innerHTML = "";
  if (favs.length === 0) {
    showStatus("");
    return;
  }

  for (const item of favs) {
    grid.appendChild(createCard(item));
  }

  // >>> nach Rendern ggf. zum Hash-Favoriten springen
  scrollToFavouriteFromHash();
  // <<<
}

// Initial render
render();

// Sync bei Änderungen aus anderem Tab/Fenster
window.addEventListener("storage", (e) => {
  if (e.key === "filmzimmer:favourites") render();
});

// >>> auch reagieren, wenn der Hash nachträglich gesetzt wird (z.B. durch Navbar)
window.addEventListener("hashchange", () => {
  scrollToFavouriteFromHash();
});
// <<<
