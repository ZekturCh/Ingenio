export const $ = (selector) => document.querySelector(selector);
export const icons = () => window.lucide?.createIcons();
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
}

export function normalizeSearch(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}
