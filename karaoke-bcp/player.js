import { SONGS, roomFromUrl, subscribeRoom, sendCommand, getSong, getVersion, controllerUrl } from "./shared.js";
import { icons, loadFavorites, toggleFavorite, toggleFullscreen } from "./ui.js";

export function mountPlayer(root = document, { embedded = false, onBack } = {}) {
const $ = (selector) => root.querySelector(selector);
const room = roomFromUrl(), audio = $("#audio"), stage = $("#stage");
$("#roomCode").textContent = room;
$("#backBtn").href = controllerUrl(room);
let unlocked = false, pending = null, activeState = null, activeSong = null, activeVersion = null;
let lyricData = [], lastCommand = "stop", commandToken = 0, shuffle = false, seeking = false, ended = false;
let lineIndex = -2;
let visible = !embedded;
if (onBack) $("#backBtn").onclick = (event) => { event.preventDefault(); onBack(); };

const mmss = (value) => {
  const seconds = Math.max(0, Number(value) || 0);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
};
function bounds() {
  const start = Number(activeState?.startAt ?? activeVersion?.startAt ?? 0);
  const end = Number(activeState?.endAt ?? activeVersion?.endAt ?? 0);
  return { start, end, span: Math.max(0.1, end - start) };
}
function setState(message) { $("#playerState").textContent = message; }
function setSync(mode) {
  $("#syncState").textContent = mode === "online" ? "Sala en línea" : "Sala local";
  $("#playerDot").className = `dot ${mode === "online" ? "online" : "local"}`;
}
async function loadLyrics(song) {
  const urls = song.lyrics ? [song.lyrics] : [`songs/${song.id}/lyrics-timed.json`, `songs/${song.id}/lyrics-template.json`];
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      const lines = (Array.isArray(data) ? data : data.lyrics || []).filter((line) =>
        typeof line.text === "string" && (line.start ?? line.time) != null && Number.isFinite(Number(line.start ?? line.time))
      ).map((line) => ({ ...line, start: Number(line.start ?? line.time) })).sort((a, b) => a.start - b.start);
      return lines.map((line, index) => ({ ...line, end: Number(line.end ?? lines[index + 1]?.start ?? line.start + 2.4) }));
    } catch {}
  }
  return [];
}
function updateFavorite() {
  const on = activeSong && loadFavorites().has(activeSong.id);
  $("#favoriteBtn").classList.toggle("active", Boolean(on));
  $("#favoriteBtn").setAttribute("aria-pressed", Boolean(on));
}
function renderSong() {
  stage.classList.remove("idle");
  $("#kicker").textContent = "Ahora canta";
  $("#title").textContent = activeSong.title;
  $("#artist").textContent = activeSong.artist;
  $("#version").textContent = `${activeVersion.label} · ${activeVersion.durationLabel}`;
  $("#seek").disabled = false;
  ["#playBtn", "#previousBtn", "#nextBtn", "#favoriteBtn"].forEach((selector) => $(selector).disabled = false);
  updateFavorite();
}
function renderLyrics(time) {
  let index = -1;
  for (let i = 0; i < lyricData.length; i++) { if (lyricData[i].start <= time) index = i; else break; }
  const line = lyricData[index];
  if (lineIndex !== index) {
    lineIndex = index;
    const text = line?.text || (lyricData.length ? "♪" : "Letra no disponible");
    $("#currentBase").textContent = text;
    $("#currentFill").textContent = text;
    $("#prev").textContent = lyricData[index - 1]?.text || "";
    $("#next").textContent = lyricData[index + 1]?.text || "";
    $("#next2").textContent = lyricData[index + 2]?.text || "";
    $("#next3").textContent = lyricData[index + 3]?.text || "";
    fitLyrics();
  }
  const fraction = line ? Math.max(0, Math.min(1, (time - line.start) / Math.max(.2, line.end - line.start))) : 0;
  $("#currentFill").style.clipPath = `inset(0 ${((1 - fraction) * 100).toFixed(1)}% 0 0)`;
}
function updateProgress() {
  if (!activeVersion) return;
  const { start, span } = bounds();
  const position = Math.min(span, Math.max(0, audio.currentTime - start));
  if (!seeking) {
    $("#seek").value = position / span * 100;
    $("#seek").style.setProperty("--progress", `${position / span * 100}%`);
  }
  $("#elapsed").textContent = mmss(position);
  $("#remaining").textContent = mmss(span);
  renderLyrics(audio.currentTime);
}
function selectState(state) {
  const song = getSong(state.songId), version = getVersion(song, state.versionId);
  if (!song?.enabled || !version) return null;
  const changedSong = activeSong?.id !== song.id;
  const changed = changedSong || activeVersion?.id !== version.id;
  activeState = state; activeSong = song; activeVersion = version;
  if (changedSong) {
    audio.pause();
    if (audio.src !== new URL(song.audio, location.href).href) audio.src = song.audio;
    lyricData = []; lineIndex = -2;
    loadLyrics(song).then((lines) => {
      if (activeSong?.id === song.id) { lyricData = lines; lineIndex = -2; updateProgress(); }
    });
  }
  if (changed) { ended = false; renderSong(); }
  return changed;
}
async function playAudio(token) {
  try {
    await audio.play();
    if (token === commandToken && !audio.paused) { ended = false; setState("Reproduciendo"); }
  } catch (error) {
    if (token === commandToken && error.name !== "AbortError") setState("Toca reproducir para activar el audio");
  }
}
async function execute(state) {
  const token = ++commandToken;
  const changed = selectState(state);
  if (changed === null || token !== commandToken) return;
  const { start, end } = bounds(), command = state.command || "load";
  if (command === "load" || command === "stop") {
    audio.pause(); audio.currentTime = start; ended = false;
    setState(command === "load" ? "Canción lista" : "Detenido");
  } else if (command === "pause") {
    audio.pause(); setState("Pausa");
  } else if (command === "restart" || command === "play") {
    if (command === "restart" || changed || lastCommand === "stop" || ended || audio.currentTime < start || audio.currentTime >= end - .05) audio.currentTime = start;
    updateProgress();
    await playAudio(token);
  }
  if (token === commandToken) { lastCommand = command; updateProgress(); }
}
function receive(state) {
  if (!visible) return;
  if (!unlocked) { pending = state; selectState(state); return; }
  execute(state).catch(() => setState("No se pudo cargar la canción"));
}

audio.addEventListener("timeupdate", () => {
  updateProgress();
  if (activeVersion && !audio.paused && audio.currentTime >= bounds().end - .04) {
    audio.pause(); ended = true; setState("Finalizado");
    if (shuffle) nextSong(1);
  }
});
audio.addEventListener("play", () => { stage.classList.remove("paused"); $("#playBtn").setAttribute("aria-label", "Pausar"); $("#playBtn").title = "Pausar"; });
audio.addEventListener("pause", () => { stage.classList.add("paused"); $("#playBtn").setAttribute("aria-label", "Reproducir"); $("#playBtn").title = "Reproducir"; });
audio.addEventListener("ended", () => { ended = true; setState("Finalizado"); stage.classList.add("paused"); if (shuffle) nextSong(1); });
audio.addEventListener("error", () => { setState("Audio no disponible"); });
// Paint against the audio clock, including seeks, pauses and resumed playback.
function paint() { if (!audio.paused && activeVersion) updateProgress(); requestAnimationFrame(paint); }
requestAnimationFrame(paint);

function fitLyrics() {
  const panel = $(".lyricPanel"), lyrics = $("#lyrics");
  lyrics.style.setProperty("--lyric-scale", 1);
  const style = getComputedStyle(panel);
  const available = panel.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  // Fit the entire stanza to its available area, independent of screen resolution.
  let scale = 1;
  while (lyrics.scrollHeight > available && scale > .45) {
    scale -= .05;
    lyrics.style.setProperty("--lyric-scale", scale.toFixed(2));
  }
}
new ResizeObserver(fitLyrics).observe($(".lyricPanel"));
document.fonts.ready.then(fitLyrics);

if (!embedded) {
$("#activateBtn").onclick = async () => {
  $("#activateBtn").disabled = true;
  audio.volume = 1;
  try { await audio.play(); audio.pause(); }
  catch {
    $("#activationState").textContent = "No se pudo activar el audio. Intenta nuevamente.";
    $("#activateBtn").disabled = false;
    return;
  }
  unlocked = true;
  $("#activate").close();
  setState("Sala lista");
  if (pending) { const state = pending; pending = null; await execute(state); }
};
$("#activate").addEventListener("cancel", (event) => event.preventDefault());
}
$("#playBtn").onclick = () => {
  if (!activeVersion) return;
  const command = audio.paused ? "play" : "pause";
  sendCommand(room, { ...activeState, command }).catch(() => setState("No se pudo sincronizar la sala"));
};
function nextSong(direction) {
  const available = SONGS.filter((song) => song.enabled && song.versions.length);
  if (!activeSong || !available.length) return;
  if (direction < 0 && audio.currentTime - bounds().start > 3) {
    sendCommand(room, { ...activeState, command: "restart" }).catch(() => setState("No se pudo sincronizar la sala"));
    return;
  }
  let index = available.findIndex((song) => song.id === activeSong.id);
  if (shuffle && available.length > 1) index = (index + 1 + Math.floor(Math.random() * (available.length - 1))) % available.length;
  else index = (index + direction + available.length) % available.length;
  const song = available[index], version = song.versions.find((entry) => entry.id === activeVersion.id) || song.versions[0];
  sendCommand(room, { songId: song.id, versionId: version.id, startAt: version.startAt, endAt: version.endAt, command: "restart" }).catch(() => setState("No se pudo sincronizar la sala"));
}
$("#previousBtn").onclick = () => nextSong(-1);
$("#nextBtn").onclick = () => nextSong(1);
$("#shuffleBtn").onclick = () => {
  shuffle = !shuffle;
  $("#shuffleBtn").classList.toggle("active", shuffle);
  $("#shuffleBtn").setAttribute("aria-pressed", shuffle);
};
$("#favoriteBtn").onclick = () => { if (activeSong) { toggleFavorite(activeSong.id); updateFavorite(); } };
window.addEventListener("storage", updateFavorite);
$("#seek").oninput = () => {
  seeking = true;
  const { start, span } = bounds();
  const position = Number($("#seek").value) / 100;
  $("#seek").style.setProperty("--progress", `${position * 100}%`);
  audio.currentTime = start + span * position;
  ended = false; renderLyrics(audio.currentTime); $("#elapsed").textContent = mmss(span * position);
};
$("#seek").onchange = () => { seeking = false; updateProgress(); };
$("#playerFullscreenBtn").onclick = () => toggleFullscreen().catch(() => setState("Pantalla completa no disponible"));
["#playBtn", "#previousBtn", "#nextBtn", "#favoriteBtn"].forEach((selector) => $(selector).disabled = true);
icons();
if (!embedded) $("#activate").showModal();
subscribeRoom(room, receive, setSync);
return {
  start(state) {
    visible = true; unlocked = true; pending = null;
    // Execute synchronously up to audio.play() to retain the version button's user gesture.
    execute(state).catch(() => setState("No se pudo cargar la canción"));
  },
  hide() {
    visible = false; ++commandToken; audio.pause(); lastCommand = "pause";
    return activeState;
  },
  show() { visible = true; fitLyrics(); },
};
}
