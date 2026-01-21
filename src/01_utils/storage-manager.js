// src/utils/storage-manager.js
//LocalStorage-Manager für Favoriten + Notizen (Journal)

const KEY = "filmzimmer:favourites";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getFavourites() {
  return load();
}

export function isFavourite(id) {
  return load().some((m) => m.id === id);
}

export function addFavourite(movie) {
  const list = load();
  if (list.some((m) => m.id === movie.id)) return list;

  // Speichere fürs Journal (Bild, Titel, Info + Note)
  const minimal = {
    id: movie.id,
    title: movie.title || movie.name || "",
    poster_path: movie.poster_path || null,
    overview: movie.overview || "",
    release_date: movie.release_date || movie.first_air_date || "",
    vote_average: movie.vote_average ?? null,
    note: movie.note || "",
  };

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
