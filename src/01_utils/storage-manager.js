// src/01_utils/storage-manager.js
// LocalStorage-Manager für Favoriten + Notizen (Journal)

const KEY = "filmzimmer:favourites";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function normalizeItem(item) {
  return {
    id: item.id,
    title: item.title || item.name || "",
    // kann TMDB-Pfad "/abc.jpg" oder vollständige URL sein (deine Index-Sections speichern aktuell URL)
    poster_path: item.poster_path || null,
    overview: item.overview || "",
    release_date: item.release_date || item.first_air_date || "",
    vote_average: item.vote_average ?? null,
    note: item.note || "",
  };
}

export function getFavourites() {
  return load();
}

export function isFavourite(id) {
  return load().some((m) => m.id === id);
}

export function addFavourite(item) {
  if (!item || item.id === undefined || item.id === null) return load();

  const list = load();
  if (list.some((m) => m.id === item.id)) return list;

  const minimal = normalizeItem(item);
  const next = [minimal, ...list];
  save(next);
  return next;
}

export function removeFavourite(id) {
  const next = load().filter((m) => m.id !== id);
  save(next);
  return next;
}

export function setNote(id, note) {
  const list = load();
  const idx = list.findIndex((m) => m.id === id);
  if (idx === -1) return null;

  list[idx].note = note || "";
  save(list);
  return list[idx];
}
