import { SONGS, roomFromUrl, sendCommand, subscribeRoom, playerUrl, adminUrl } from "./shared.js";
import { $, icons, loadFavorites, toggleFavorite, toggleFullscreen, normalizeSearch, escapeHtml } from "./ui.js";

const room = roomFromUrl();
$("#room").textContent = room;
$("#playerLink").href = playerUrl(room);
$("#adminLink").href = adminUrl(room);
const categories = {
  carinito: ["fiesta", "peru"], odiame: ["criollo", "peru", "clasicos"],
  "himno-peru": ["peru", "clasicos"], "cuando-pienses": ["peru", "fiesta"],
  "ritmo-color-sabor": ["criollo", "fiesta", "peru"],
};
let query = "", onlyFavorites = false, toastTimer;

function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3200);
}

function renderSongs() {
  const favorites = loadFavorites();
  const list = SONGS.filter((song) => {
    const tags = song.categories || categories[song.id] || [];
    const text = normalizeSearch(`${song.title} ${song.artist} ${tags.join(" ")}`);
    return text.includes(normalizeSearch(query)) && (!onlyFavorites || favorites.has(song.id));
  });
  $("#listTitle").textContent = onlyFavorites ? "Mis favoritas" : query ? "Canciones" : "Canciones destacadas";
  $("#songs").innerHTML = list.length ? list.map((song) => `
    <article class="song ${song.enabled ? "enabled" : "disabled"}">
      <button class="songSelect" data-song="${escapeHtml(song.id)}" ${song.enabled ? "" : "disabled"} aria-label="${escapeHtml(song.title + (song.enabled ? "" : ", próximamente"))}">
        <i class="songNote" data-lucide="music-2" aria-hidden="true"></i>
        <span class="songCopy"><b>${escapeHtml(song.title)}</b><span class="artist">${escapeHtml(song.artist)}</span>${song.enabled ? "" : '<span class="soon">Próximamente</span>'}</span>
      </button>
      <button class="fav ${favorites.has(song.id) ? "on" : ""}" data-fav="${escapeHtml(song.id)}" aria-label="Favorita: ${escapeHtml(song.title)}" aria-pressed="${favorites.has(song.id)}" title="Favorita"><img class="favoriteGlyph" src="assets/icons/icon-halloween.png" alt=""></button>
    </article>`).join("") : '<p class="empty">No hay canciones con ese filtro.</p>';
  icons();
}

function openVersions(song) {
  $("#dlgTitle").textContent = song.title;
  $("#dlgArtist").textContent = song.artist;
  $("#modalNote").textContent = "";
  $("#versions").innerHTML = song.versions.map((version) => `
    <button class="versionOption ${version.id === "chorus" ? "recommended" : ""}" data-version="${escapeHtml(version.id)}">
      <strong>${escapeHtml(version.label)}</strong><span class="duration">${escapeHtml(version.durationLabel)}</span><small>${escapeHtml(version.note || "")}</small>
    </button>`).join("");
  $("#versions").onclick = (event) => {
    const button = event.target.closest("[data-version]");
    if (!button) return;
    const version = song.versions.find((entry) => entry.id === button.dataset.version);
    $("#modal").close();
    toast(`${song.title} · ${version.label} seleccionada`);
    sendCommand(room, { songId: song.id, versionId: version.id, command: "play", startAt: version.startAt, endAt: version.endAt })
      .then((result) => toast(result.mode === "online" ? "Canción enviada a la pantalla de karaoke" : "Selección guardada en esta sala"))
      .catch(() => toast("No se pudo enviar la canción. Intenta nuevamente."));
  };
  $("#modal").showModal();
}

$("#songs").onclick = (event) => {
  const favorite = event.target.closest("[data-fav]");
  if (favorite) {
    toggleFavorite(favorite.dataset.fav);
    renderSongs();
    document.querySelector(`[data-fav="${CSS.escape(favorite.dataset.fav)}"]`)?.focus();
    return;
  }
  const button = event.target.closest("[data-song]");
  const song = SONGS.find((entry) => entry.id === button?.dataset.song);
  if (song?.enabled) openVersions(song);
};

$("#seeAll").onclick = () => { query = ""; onlyFavorites = false; $("#search").value = ""; renderSongs(); };
$("#searchForm").onsubmit = (event) => { event.preventDefault(); query = $("#search").value.trim(); renderSongs(); };
$("#search").oninput = () => { query = $("#search").value.trim(); renderSongs(); };
$("#close").onclick = () => $("#modal").close();
$("#modal").onclick = (event) => {
  const bounds = $("#modal").getBoundingClientRect();
  if (event.target === $("#modal") && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) $("#modal").close();
};

function toggleMenu(force) {
  const open = force ?? $("#menu").hidden;
  $("#menu").hidden = !open;
  $("#menuBtn").setAttribute("aria-expanded", open);
  $("#roomPill").setAttribute("aria-expanded", open);
}
$("#menuBtn").onclick = () => toggleMenu();
$("#roomPill").onclick = () => toggleMenu();
document.addEventListener("click", (event) => {
  if (!event.target.closest("#menu,#menuBtn,#roomPill")) toggleMenu(false);
});
document.addEventListener("keydown", (event) => { if (event.key === "Escape") toggleMenu(false); });
$("#favoritesFilter").onclick = () => { onlyFavorites = !onlyFavorites; query = ""; $("#search").value = ""; renderSongs(); toggleMenu(false); };
$("#fullscreenBtn").onclick = () => { toggleMenu(false); toggleFullscreen().catch(() => toast("Pantalla completa no disponible")); };
window.addEventListener("storage", renderSongs);
subscribeRoom(room, () => {}, (mode) => {
  $("#dot").className = `dot ${mode === "online" ? "online" : "local"}`;
  $("#roomPill").title = mode === "online" ? "Sala en línea" : "Sala local";
});
renderSongs();
icons();
