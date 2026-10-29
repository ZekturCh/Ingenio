import { SONGS, roomFromUrl, sendCommand } from "./shared.js?v=20261029-4";
import { $, icons, loadFavorites, toggleFavorite, toggleFullscreen, normalizeSearch, escapeHtml } from "./ui.js";
import { mountPlayer } from "./player.js?v=20261029-4";

const room = roomFromUrl();
const categories = {
  carinito: ["fiesta", "peru"], odiame: ["criollo", "peru", "clasicos"],
  "himno-peru": ["peru", "clasicos"], "cuando-pienses": ["peru", "fiesta"],
  "ritmo-color-sabor": ["criollo", "fiesta", "peru"],
};
let query = "", onlyFavorites = false, toastTimer;
let player = null, selectedState = null, selectedSongId = null;
let playlistScroll = 0;
let preparingPlayer = false;
history.replaceState({ ...history.state, karaokeView: "selector" }, "", location.pathname + location.search);

async function preparePlayer() {
  if (player || preparingPlayer) return;
  preparingPlayer = true;
  try {
    // Reuse the standalone screen's markup so both playback modes stay visually identical.
    const response = await fetch("./player.html?v=20261029-4");
    if (!response.ok) throw new Error("Player unavailable");
    const page = new DOMParser().parseFromString(await response.text(), "text/html");
    const stage = page.querySelector("#stage"), audio = page.querySelector("#audio");
    if (!stage || !audio) throw new Error("Invalid player view");
    $("#playbackView").replaceChildren(document.importNode(stage, true), document.importNode(audio, true));
    player = mountPlayer($("#playbackView"), { embedded: true, onBack: () => history.back() });
    document.querySelectorAll("#versions button").forEach((button) => button.disabled = false);
    $("#modalNote").textContent = "";
  } catch {
    $("#modalNote").textContent = "No se pudo preparar el karaoke. Cierra y vuelve a elegir la canción para reintentar.";
  } finally {
    preparingPlayer = false;
  }
}
preparePlayer();

function showPlayback() {
  playlistScroll = $("#songs").scrollTop;
  $("#selectorView").hidden = true;
  $("#playbackView").hidden = false;
  document.body.className = "player-page";
  window.scrollTo(0, 0);
  player.show();
  $("#backBtn").focus({ preventScroll: true });
}

function showSelector() {
  const stoppedState = player?.hide();
  $("#playbackView").hidden = true;
  $("#selectorView").hidden = false;
  document.body.className = "controller-page";
  renderSongs();
  $("#songs").scrollTop = playlistScroll;
  if (stoppedState) sendCommand(room, { ...stoppedState, command: "pause" }).catch(() => {});
  document.querySelector(`[data-song="${CSS.escape(selectedSongId || "")}"]`)?.focus({ preventScroll: true });
}
window.addEventListener("popstate", (event) => {
  if (event.state?.karaokeView === "player" && player && selectedState) showPlayback();
  else showSelector();
});

function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3200);
}

function renderSongs() {
  const favorites = loadFavorites();
  const list = SONGS.filter((song) => {
    if (!song.enabled || !song.audio || !song.text || !song.versions?.length) return false;
    const tags = song.categories || categories[song.id] || [];
    const text = normalizeSearch(`${song.title} ${song.artist} ${tags.join(" ")}`);
    return text.includes(normalizeSearch(query)) && (!onlyFavorites || favorites.has(song.id));
  });
  $("#listTitle").textContent = onlyFavorites ? "Mis favoritas" : query ? "Canciones" : "Canciones destacadas";
  $("#songs").innerHTML = list.length ? list.map((song) => `
    <article class="song enabled">
      <button class="songSelect" data-song="${escapeHtml(song.id)}" aria-label="${escapeHtml(song.title)}">
        <i class="songNote" data-lucide="music-2" aria-hidden="true"></i>
        <span class="songCopy"><b>${escapeHtml(song.title)}</b><span class="artist">${escapeHtml(song.artist)}</span></span>
      </button>
      <button class="fav ${favorites.has(song.id) ? "on" : ""}" data-fav="${escapeHtml(song.id)}" aria-label="Favorita: ${escapeHtml(song.title)}" aria-pressed="${favorites.has(song.id)}" title="Favorita"><img class="favoriteGlyph" src="assets/icons/icon-halloween.png" alt=""></button>
    </article>`).join("") : '<p class="empty">No hay canciones con ese filtro.</p>';
  icons();
}

function openVersions(song) {
  $("#dlgTitle").textContent = song.title;
  $("#dlgArtist").textContent = song.artist;
  $("#modalNote").textContent = player ? (song.lyricsStatus === "pending" ? "Letra pendiente de sincronizar" : song.lyricsStatus === "estimated" ? "Letra con tiempos aproximados; pendiente de revisión" : "") : "Preparando karaoke…";
  $("#versions").innerHTML = song.versions.map((version) => `
    <button class="versionOption ${version.id === "chorus" ? "recommended" : ""}" data-version="${escapeHtml(version.id)}" ${player ? "" : "disabled"}>
      <strong>${escapeHtml(version.label)}</strong><span class="duration">${escapeHtml(version.durationLabel)}</span><small>${escapeHtml(version.note || "")}</small>
    </button>`).join("");
  $("#versions").onclick = (event) => {
    const button = event.target.closest("[data-version]");
    if (!button || !player || button.disabled) return;
    const version = song.versions.find((entry) => entry.id === button.dataset.version);
    $("#modal").close();
    selectedSongId = song.id;
    selectedState = { songId: song.id, versionId: version.id, command: "restart", startAt: version.startAt, endAt: version.endAt };
    history.pushState({ karaokeView: "player" }, "", "#reproduccion");
    showPlayback();
    player.start(selectedState);
    sendCommand(room, selectedState).catch(() => toast("El audio es local; no se pudo sincronizar la sala."));
  };
  $("#modal").showModal();
  if (!player) preparePlayer();
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

$("#fullscreenBtn").onclick = () => toggleFullscreen().catch(() => toast("Pantalla completa no disponible"));
window.addEventListener("storage", renderSongs);
renderSongs();
icons();
