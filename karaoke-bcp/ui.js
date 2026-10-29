export const $ = (selector) => document.querySelector(selector);
export const icons = () => { window.lucide?.createIcons(); reflectFullscreen(); };
const FAV_KEY = "samay-karaoke-favs";

export function loadFavorites() {
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); }
  catch { return new Set(); }
}

export function toggleFavorite(id) {
  const favorites = loadFavorites();
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  try { localStorage.setItem(FAV_KEY, JSON.stringify([...favorites])); } catch {}
  return favorites.has(id);
}

export async function toggleFullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen();
  else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
  else throw new Error("Fullscreen unavailable");
}

function reflectFullscreen() {
  const active = Boolean(document.fullscreenElement);
  for (const button of document.querySelectorAll('.fullscreenControl')) {
    button.setAttribute('aria-pressed', String(active));
    button.title = active ? 'Salir de pantalla completa' : 'Pantalla completa';
    button.setAttribute('aria-label', button.title);
  }
}
document.addEventListener("fullscreenchange", reflectFullscreen);

export function normalizeSearch(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}
