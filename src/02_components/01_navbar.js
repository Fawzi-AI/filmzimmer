/**
 * ============================================================================
 * Navbar Component
 * - Active link highlight
 * - Search:
 *   - Home: TMDB multi search (paged, scroll-to-load)
 *   - Journal: local favourites search (filter only)
 * - Preview with favourite toggle + toast feedback
 * ============================================================================
 */

import {
  select,
  selectAll,
  addClass,
  removeClass,
} from "../01_utils/dom-loader.js";
import TMDBClient from "../03_api/tmdb-client.js";
import {
  addFavourite,
  removeFavourite,
  isFavourite,
  getFavourites,
} from "../01_utils/storage-manager.js";
import { showToast } from "./toast-notification.js";

const SELECTORS = {
  container: '[data-element="navbar-container"]',
  navLinks: "[data-nav-page]",
  searchInput: '[data-element="nav-search-input"]',
  dropdown: '[data-element="nav-search-dropdown"]',
};

const ACTIVE_CLASSES = ["text-white", "bg-slate-800"];
const INACTIVE_CLASSES = [
  "text-slate-400",
  "hover:text-white",
  "hover:bg-slate-800",
];

const SEARCH = {
  minChars: 1, // Journal soll schon ab 1 Buchstaben filtern
  debounceMs: 250,
  maxPages: 10,
  scrollThresholdPx: 140,
};

const detectCurrentPage = () => {
  const path = window.location.pathname;
  return path.includes("journal") ? "journal" : "home";
};

const highlightActiveLink = (container) => {
  const currentPage = detectCurrentPage();
  const navLinks = selectAll(container, SELECTORS.navLinks);

  navLinks.forEach((link) => {
    const linkPage = link.dataset.navPage;
    if (linkPage === currentPage) {
      removeClass(link, ...INACTIVE_CLASSES);
      addClass(link, ...ACTIVE_CLASSES);
    } else {
      removeClass(link, ...ACTIVE_CLASSES);
      addClass(link, ...INACTIVE_CLASSES);
    }
  });
};

const openDropdown = (dropdown) => dropdown.classList.remove("hidden");
const closeDropdown = (dropdown) => {
  dropdown.classList.add("hidden");
  dropdown.innerHTML = "";
};

const posterUrl = (path, size = "w92") => {
  if (!path) return null;

  // If older code stored full URL in poster_path, keep working:
  if (String(path).startsWith("http")) return path;

  return `https://image.tmdb.org/t/p/${size}${path}`;
};

const keyOf = (item) => `${item.mediaType}:${item.id}`;

const normalizeTmdbResult = (r) => {
  const mediaType = r.media_type === "tv" ? "tv" : "movie";
  const title = r.title || r.name || "Unknown";
  const date = r.release_date || r.first_air_date || "";
  const year = date ? String(date).slice(0, 4) : "N/A";

  return {
    id: r.id,
    mediaType,
    title,
    year,
    rating: r.vote_average ? Number(r.vote_average).toFixed(1) : "N/A",
    overview: r.overview || "",
    poster_path: r.poster_path || null,
    raw: r,
  };
};

const normalizeFavourite = (f) => {
  // storage-manager speichert title oder name + release_date/first_air_date
  const mediaType = f.first_air_date ? "tv" : "movie";
  const title = f.title || f.name || "Unknown";
  const date = f.release_date || f.first_air_date || "";
  const year = date ? String(date).slice(0, 4) : "N/A";

  return {
    id: Number(f.id),
    mediaType,
    title,
    year,
    rating: f.vote_average != null ? Number(f.vote_average).toFixed(1) : "N/A",
    overview: f.overview || "",
    poster_path: f.poster_path || null,
    raw: f, // raw = favourite object
  };
};

const renderLoading = (dropdown, text = "Suche…") => {
  dropdown.innerHTML = `<div class="p-4 text-sm text-slate-300">${text}</div>`;
  openDropdown(dropdown);
};

const renderError = (
  dropdown,
  text = "Fehler bei der Suche. Bitte erneut versuchen.",
) => {
  dropdown.innerHTML = `<div class="p-4 text-sm text-slate-300">${text}</div>`;
  openDropdown(dropdown);
};

const renderEmpty = (dropdown, q, mode = "tmdb") => {
  dropdown.innerHTML = `
    <div class="p-4 text-sm text-slate-300">
      ${
        mode === "favs"
          ? `Keine Favoriten passend zu <span class="font-semibold text-slate-100">${q}</span>.`
          : `Keine Treffer für <span class="font-semibold text-slate-100">${q}</span>.`
      }
    </div>
  `;
  openDropdown(dropdown);
};

const renderResultsList = (dropdown, results, opts = {}) => {
  const {
    isLoadingMore = false,
    hasMore = false,
    footerLeft = null,
    footerRight = null,
  } = opts;

  const rows = results
    .map((item) => {
      const img = posterUrl(item.poster_path, "w92");
      const badge = item.mediaType === "tv" ? "TV" : "Movie";

      return `
        <button
          type="button"
          class="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-900/60 transition-colors"
          data-action="search-select"
          data-key="${keyOf(item)}"
          data-id="${item.id}"
          data-type="${item.mediaType}"
        >
          <div class="h-10 w-10 shrink-0 rounded-lg bg-slate-900/60 overflow-hidden flex items-center justify-center">
            ${img ? `<img src="${img}" alt="" class="h-full w-full object-cover">` : `<span class="text-xs text-slate-500">No</span>`}
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="truncate text-sm font-semibold text-slate-100">${item.title}</span>
              <span class="shrink-0 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-0.5 text-[11px] text-slate-300">${badge}</span>
            </div>
            <div class="text-xs text-slate-400">${item.year} • ${item.rating}/10</div>
          </div>
        </button>
      `;
    })
    .join("");

  const left = footerLeft ?? `${results.length} Treffer`;
  const right =
    footerRight ??
    (isLoadingMore
      ? "Lade mehr…"
      : hasMore
        ? "Scrollen für mehr"
        : "Ende der Liste");

  const footer = `
    <div class="px-4 py-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between gap-3">
      <span>${left}</span>
      <span>${right}</span>
    </div>
  `;

  dropdown.innerHTML = rows + footer;
  openDropdown(dropdown);
};

/**
 * Preview:
 * - Button 1 (rechts oben): Favorit togglen
 * - Button 2 (unten rechts):
 *   - Journal-Seite: "In Liste anzeigen" (scrollt zur Card)
 *   - Home-Seite: nur wenn bereits Favorit -> "Im Journal anzeigen" (öffnet journal.html#fav-id)
 */
const renderPreview = (dropdown, inputEl, item) => {
  const img = item.poster_path ? posterUrl(item.poster_path, "w342") : null;
  const fav = isFavourite(item.id);

  const pageMode = detectCurrentPage();
  const isJournal = pageMode === "journal";

  const jumpLabel = isJournal ? "In Liste anzeigen" : "Im Journal anzeigen";
  const showJumpButton = isJournal ? true : fav; // Home: nur anzeigen wenn bereits Favorit

  dropdown.innerHTML = `
    <div class="p-4">
      <div class="flex gap-4">
        <div class="h-28 w-20 shrink-0 rounded-xl bg-slate-900/60 overflow-hidden flex items-center justify-center">
          ${img ? `<img src="${img}" alt="" class="h-full w-full object-cover">` : `<span class="text-xs text-slate-500">Kein Poster</span>`}
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="truncate text-base font-semibold text-slate-100">${item.title}</div>
              <div class="text-xs text-slate-400 mt-1">
                ${item.year} • ${item.rating}/10 • ${item.mediaType === "tv" ? "TV" : "Movie"}
              </div>
            </div>

            <button
              type="button"
              class="shrink-0 rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-950/70"
              data-action="preview-toggle-fav"
              data-key="${keyOf(item)}"
            >
              ${fav ? "Entfernen" : "Zu Favoriten"}
            </button>
          </div>

          <p class="mt-3 text-sm text-slate-300 line-clamp-3">
            ${item.overview ? item.overview : "Keine Beschreibung vorhanden."}
          </p>

          <div class="mt-3 flex items-center gap-2">
            <button
              type="button"
              class="rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-950/70"
              data-action="preview-back"
            >
              Zurück zur Liste
            </button>

            ${
              showJumpButton
                ? `
                  <button
                    type="button"
                    class="rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-950/70"
                    data-action="preview-jump-fav"
                    data-id="${item.id}"
                  >
                    ${jumpLabel}
                  </button>
                `
                : ""
            }
          </div>
        </div>
      </div>
    </div>
  `;

  openDropdown(dropdown);
  inputEl.value = item.title;
};

const setupSearch = (container) => {
  const input = select(container, SELECTORS.searchInput);
  const dropdown = select(container, SELECTORS.dropdown);
  if (!input || !dropdown) return;

  const pageMode = detectCurrentPage(); // "home" | "journal"
  const isJournal = pageMode === "journal";

  let debounceTimer = null;
  let queryToken = 0;

  // TMDB state (home only)
  let currentQuery = "";
  let currentPage = 1;
  let totalPages = 1;
  let isLoadingMore = false;

  // Shared results store
  const resultsByKey = new Map();
  const getResultsArray = () => Array.from(resultsByKey.values());

  const resetState = () => {
    currentQuery = "";
    currentPage = 1;
    totalPages = 1;
    isLoadingMore = false;
    resultsByKey.clear();
  };

  const hasMore = () =>
    !isJournal &&
    currentQuery &&
    currentPage < totalPages &&
    currentPage < SEARCH.maxPages;

  const mergeResults = (items) => {
    items.forEach((item) => resultsByKey.set(keyOf(item), item));
  };

  // -------------------------
  // JOURNAL: local favourites search
  // -------------------------
  const runFavouritesSearch = (q) => {
    resetState();

    const favs = (getFavourites() || []).map(normalizeFavourite);

    const query = q.trim().toLowerCase();
    const filtered = favs.filter((f) =>
      (f.title || "").toLowerCase().includes(query),
    );

    mergeResults(filtered);

    if (filtered.length === 0) {
      renderEmpty(dropdown, q, "favs");
      return;
    }

    renderResultsList(dropdown, filtered, {
      hasMore: false,
      footerLeft: `${filtered.length} Favorit${filtered.length === 1 ? "" : "en"}`,
      footerRight: "Gefiltert aus Favoriten",
    });
  };

  // -------------------------
  // HOME: TMDB search
  // -------------------------
  const fetchPage = async ({ query, page, token, mode }) => {
    if (!TMDBClient.isReady()) {
      renderError(
        dropdown,
        "Suche ist nicht verfügbar (API nicht initialisiert).",
      );
      return;
    }

    try {
      const res = await TMDBClient.searchMulti(query, { page });
      if (token !== queryToken) return;

      const normalized = (res?.results || [])
        .filter((r) => r && (r.media_type === "movie" || r.media_type === "tv"))
        .map(normalizeTmdbResult);

      totalPages = Number(res?.total_pages || 1);
      currentPage = page;

      mergeResults(normalized);

      const list = getResultsArray();
      if (mode === "first" && list.length === 0) {
        renderEmpty(dropdown, query, "tmdb");
        return;
      }

      renderResultsList(dropdown, list, {
        isLoadingMore,
        hasMore: hasMore(),
      });
    } catch (e) {
      console.warn("[NavbarSearch] search failed:", e);
      renderError(dropdown);
    }
  };

  const startTmdbSearch = async (query) => {
    queryToken += 1;
    const token = queryToken;

    resetState();
    currentQuery = query;

    renderLoading(dropdown, "Suche…");
    await fetchPage({ query, page: 1, token, mode: "first" });
  };

  const loadMore = async () => {
    if (!hasMore() || isLoadingMore) return;

    isLoadingMore = true;
    renderResultsList(dropdown, getResultsArray(), {
      isLoadingMore: true,
      hasMore: true,
    });

    queryToken += 1;
    const token = queryToken;

    await fetchPage({
      query: currentQuery,
      page: currentPage + 1,
      token,
      mode: "more",
    });

    isLoadingMore = false;
    renderResultsList(dropdown, getResultsArray(), {
      isLoadingMore: false,
      hasMore: hasMore(),
    });
  };

  // Input handler (debounced)
  input.addEventListener("input", () => {
    const q = input.value.trim();

    if (q.length < SEARCH.minChars) {
      resetState();
      closeDropdown(dropdown);
      return;
    }

    if (debounceTimer) window.clearTimeout(debounceTimer);

    debounceTimer = window.setTimeout(() => {
      if (isJournal) {
        runFavouritesSearch(q);
      } else {
        startTmdbSearch(q);
      }
    }, SEARCH.debounceMs);
  });

  // Dropdown scroll -> load more (home only)
  dropdown.addEventListener("scroll", () => {
    if (!hasMore() || isLoadingMore) return;

    const remaining =
      dropdown.scrollHeight - dropdown.scrollTop - dropdown.clientHeight;
    if (remaining < SEARCH.scrollThresholdPx) loadMore();
  });

  // Pointerdown: reliable click behaviour
  dropdown.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const selectBtn = e.target.closest('[data-action="search-select"]');
    const backBtn = e.target.closest('[data-action="preview-back"]');
    const toggleFavBtn = e.target.closest('[data-action="preview-toggle-fav"]');
    const jumpFavBtn = e.target.closest('[data-action="preview-jump-fav"]');

    if (backBtn) {
      renderResultsList(dropdown, getResultsArray(), {
        isLoadingMore,
        hasMore: hasMore(),
        footerLeft: isJournal ? `${getResultsArray().length} Favoriten` : null,
        footerRight: isJournal ? "Gefiltert aus Favoriten" : null,
      });
      return;
    }

    if (jumpFavBtn) {
      const id = Number(jumpFavBtn.dataset.id);
      if (!id) return;

      const modeNow = detectCurrentPage();
      closeDropdown(dropdown);

      if (modeNow === "journal") {
        const target = document.querySelector(`#fav-${id}`);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          target.classList.add("ring-2", "ring-slate-500");
          window.setTimeout(() => {
            target.classList.remove("ring-2", "ring-slate-500");
          }, 1200);
        } else {
          window.location.hash = `fav-${id}`;
        }
      } else {
        // Home: Button wird nur gerendert, wenn fav==true, daher ist Sprung sinnvoll.
        window.location.href = `./journal.html#fav-${id}`;
      }

      return;
    }

    if (selectBtn) {
      const key = selectBtn.dataset.key;
      let item = resultsByKey.get(key);

      if (!item) {
        const id = Number(selectBtn.dataset.id);
        const type = selectBtn.dataset.type || "movie";
        item = resultsByKey.get(`${type}:${id}`);
      }
      if (!item) {
        const id = Number(selectBtn.dataset.id);
        item = getResultsArray().find((x) => x.id === id) || null;
      }
      if (!item) return;

      renderPreview(dropdown, input, item);
      return;
    }

    if (toggleFavBtn) {
      const key = toggleFavBtn.dataset.key;
      const item = resultsByKey.get(key);
      if (!item) return;

      const already = isFavourite(item.id);

      if (already) {
        removeFavourite(item.id);
        toggleFavBtn.textContent = "Zu Favoriten";
        showToast(`${item.title} entfernt`);

        // Preview neu rendern, damit "Im Journal anzeigen" ggf. verschwindet
        renderPreview(dropdown, input, item);

        if (isJournal) {
          const q = input.value.trim();
          if (q.length >= SEARCH.minChars) runFavouritesSearch(q);
        }
      } else {
        const payload = {
          id: item.id,
          title: item.mediaType === "tv" ? undefined : item.title,
          name: item.mediaType === "tv" ? item.title : undefined,
          poster_path: item.poster_path || null,
          overview: item.overview || "",
          release_date:
            item.mediaType === "movie" ? item.raw.release_date || "" : "",
          first_air_date:
            item.mediaType === "tv" ? item.raw.first_air_date || "" : "",
          vote_average: item.raw.vote_average ?? item.raw.vote_average ?? null,
        };

        addFavourite(payload);
        toggleFavBtn.textContent = "Entfernen";
        showToast(`${item.title} zu Favoriten hinzugefügt`);

        // Preview neu rendern, damit "Im Journal anzeigen" erscheint (Home)
        renderPreview(dropdown, input, item);

        if (isJournal) {
          const q = input.value.trim();
          if (q.length >= SEARCH.minChars) runFavouritesSearch(q);
        }
      }
    }
  });

  /**
   * Outside click closes dropdown (robust)
   */
  document.addEventListener("click", (e) => {
    const path = typeof e.composedPath === "function" ? e.composedPath() : [];
    const isInside =
      path.includes(container) ||
      path.includes(dropdown) ||
      path.includes(input);

    if (!isInside) closeDropdown(dropdown);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDropdown(dropdown);
  });

  input.addEventListener("focus", () => {
    if (dropdown.innerHTML.trim()) openDropdown(dropdown);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const list = getResultsArray();
    if (!list.length) return;
    renderPreview(dropdown, input, list[0]);
  });
};

const setupScrollBehavior = (container) => {
  const navbar = select(container, SELECTORS.container) || container;

  const handleScroll = () => {
    if (window.scrollY > 10) addClass(navbar, "shadow-lg", "shadow-black/20");
    else removeClass(navbar, "shadow-lg", "shadow-black/20");
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
};

const initNavbar = (container) => {
  const navContainer = select(container, SELECTORS.container) || container;
  if (!navContainer) {
    console.warn("[Navbar] Container element not found");
    return;
  }

  highlightActiveLink(container);
  setupSearch(container);
  setupScrollBehavior(container);

  console.info("[Navbar] Component initialized");
};

export { initNavbar };
