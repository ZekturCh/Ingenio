import { SONGS, roomFromUrl, subscribeRoom, sendCommand, getSong, getVersion, controllerUrl } from "./shared.js?v=20261029-5";
import { icons, loadFavorites, toggleFavorite, toggleFullscreen } from "./ui.js";
import { getDelay, lyricTime, heardPosition, DELAY_KEY } from "./audio-settings.js";
import { getCalibration, setActiveTrack, calibratedTime } from "./track-timing.js";
import { cueProgress, lyricParts } from "./lyric-progress.js";

export function mountPlayer(root = document, { embedded = false, onBack } = {}) {
const nodes = new Map();
const $ = (selector) => {
  if (!nodes.has(selector)) nodes.set(selector, root.querySelector(selector));
  return nodes.get(selector);
};
const room = roomFromUrl(), audio = $("#audio"), stage = $("#stage");
$("#backBtn").href = controllerUrl(room);
let unlocked = false, pending = null, activeState = null, activeSong = null, activeVersion = null;
let lyricData = [], lastCommand = "stop", commandToken = 0, shuffle = false, seeking = false, ended = false;
let lineIndex = -2;
let wordNodes = [];
let visible = !embedded;
let delay = getDelay(), timing = null, calibration = null;
let finishTimer = 0, finishAt = 0, heardEnd = false;
let paintFrame = 0, lastPaint = 0, lastPercent = -1, lastElapsed = "", lastDuration = "";
const lyricCache = new Map();
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
function resetFinish() {
  clearTimeout(finishTimer); finishTimer = 0; finishAt = 0; heardEnd = false;
}
function mediaClock() {
  const latency = Math.max(0, delay) / 1000;
  if (heardEnd) return bounds().end + latency;
  return audio.currentTime + (finishAt ? Math.min(latency, (performance.now() - finishAt) / 1000) : 0);
}
function completePlayback() {
  finishTimer = 0; finishAt = 0; heardEnd = true;
  updateProgress(); stopPainting(); setState("Finalizado");
  if (shuffle) nextSong(1);
}
function finishPlayback() {
  if (ended) return;
  ended = true; audio.pause();
  if (delay > 0) {
    finishAt = performance.now();
    finishTimer = setTimeout(completePlayback, delay);
    startPainting();
  } else completePlayback();
}
function setSync(mode) {
  $("#syncState").textContent = mode === "online" ? "Sala en línea" : "Sala local";
}
function loadLyrics(song) {
  if (!lyricCache.has(song.id)) lyricCache.set(song.id, fetchLyrics(song));
  return lyricCache.get(song.id);
}
async function fetchLyrics(song) {
  const urls = song.lyrics ? [song.lyrics] : [`songs/${song.id}/lyrics-timed.json`, `songs/${song.id}/lyrics-template.json`];
  for (const url of urls) {
    try {
      const source = new URL(url, location.href);
      if (song.audioRevision) source.searchParams.set("recording", song.audioRevision);
      const response = await fetch(source);
      if (!response.ok) continue;
      const data = await response.json();
      const lines = (Array.isArray(data) ? data : data.lyrics || []).filter((line) =>
        typeof line.text === "string" && (line.start ?? line.time) != null && Number.isFinite(Number(line.start ?? line.time))
      ).map((line) => ({ ...line, start: Number(line.start ?? line.time) })).sort((a, b) => a.start - b.start);
      return lines.map((line, index) => ({ ...line, end: Number(line.end ?? lines[index + 1]?.start ?? line.start + 2.4) }));
    } catch {}
  }
  lyricCache.delete(song.id);
  return [];
}
function updateFavorite() {
  const on = activeSong && loadFavorites().has(activeSong.id);
  $("#favoriteBtn").classList.toggle("active", Boolean(on));
  $("#favoriteBtn").setAttribute("aria-pressed", Boolean(on));
  $("#favoriteBtn").title = on ? "Quitar de favoritas" : "Añadir a favoritas";
  $("#favoriteBtn").setAttribute("aria-label", `${on ? "Quitar de" : "Añadir a"} favoritas: ${activeSong?.title || "canción"}`);
}
function renderSong() {
  document.body.dataset.songId = activeSong.id;
  stage.classList.remove("idle");
  $("#kicker").textContent = "Ahora canta";
  $("#title").textContent = activeSong.title;
  $("#artist").textContent = activeSong.artist;
  $("#version").textContent = `${activeVersion.label} · ${activeVersion.durationLabel}${activeSong.lyricsStatus === "estimated" ? " · Letra con tiempos aproximados" : ""}`;
  $("#seek").disabled = false;
  ["#playBtn", "#previousBtn", "#nextBtn", "#favoriteBtn"].forEach((selector) => $(selector).disabled = false);
  updateFavorite();
}
function renderLyrics(time) {
  time = calibratedTime(lyricTime(time, delay), timing, calibration);
  let low = 0, high = lyricData.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (lyricData[middle].start <= time) low = middle + 1;
    else high = middle;
  }
  const index = low - 1;
  const candidate = lyricData[index];
  const { start, end } = bounds();
  const line = candidate && time >= start && time < end && candidate.start < end && candidate.end > start && time < candidate.end ? candidate : null;
  const contextText = index => {
    const cue = lyricData[index];
    return cue && cue.start >= start && cue.start < end ? cue.text : "";
  };
  const displayKey = line ? index : `gap-${index}`;
  if (lineIndex !== displayKey) {
    lineIndex = displayKey;
    const text = line?.text || (lyricData.length ? "♪" : "Letra pendiente de sincronizar");
    $("#currentBase").textContent = text;
    $("#currentFill").textContent = text;
    wordNodes = [];
    const parts = lyricParts(line);
    $("#currentFill").hidden = parts.length > 0;
    if (parts.length) {
      const fragment = document.createDocumentFragment();
      for (const part of parts) {
        if (part.start == null) { fragment.append(document.createTextNode(part.text)); continue; }
        const span = document.createElement("span");
        span.className = "lyricWord"; span.textContent = part.text;
        fragment.append(span); wordNodes.push({ node: span, start: part.start, end: part.end });
      }
      $("#currentBase").replaceChildren(fragment);
    }
    $("#prev").textContent = contextText(index - 1);
    $("#next").textContent = contextText(index + 1);
    $("#next2").textContent = contextText(index + 2);
    $("#next3").textContent = contextText(index + 3);
    fitLyrics();
  }
  for (const word of wordNodes) {
    const progress = (cueProgress(time, word.start, word.end) * 100).toFixed(1);
    if (word.progress !== progress) {
      word.progress = progress;
      word.node.style.setProperty("--word-fill", `${progress}%`);
    }
  }
  const fraction = line ? cueProgress(time, line.start, line.end) : 0;
  $("#currentFill").style.clipPath = `inset(0 ${((1 - fraction) * 100).toFixed(1)}% 0 0)`;
}
function updateProgress() {
  if (!activeVersion) return;
  const { start, end, span } = bounds();
  const clock = mediaClock();
  const position = heardPosition(clock, start, end, delay);
  if (!seeking) {
    const percent = Math.round(position / span * 1000) / 10;
    if (percent !== lastPercent) {
      lastPercent = percent;
      $("#seek").value = percent;
      $("#seek").style.setProperty("--progress", `${percent}%`);
    }
  }
  const elapsed = mmss(position), duration = mmss(span);
  if (elapsed !== lastElapsed) { $("#elapsed").textContent = elapsed; lastElapsed = elapsed; }
  if (duration !== lastDuration) { $("#remaining").textContent = duration; lastDuration = duration; }
  renderLyrics(clock);
}
function selectState(state) {
  const song = getSong(state.songId), version = getVersion(song, state.versionId);
  if (!song?.enabled || !version) return null;
  const changedSong = activeSong?.id !== song.id;
  const changed = changedSong || activeVersion?.id !== version.id;
  if (changed) resetFinish();
  activeState = state; activeSong = song; activeVersion = version;
  if (changedSong) {
    audio.pause();
    const source = new URL(song.audio, location.href);
    if (song.audioRevision) source.searchParams.set("recording", song.audioRevision);
    if (audio.src !== source.href) audio.src = source.href;
    lyricData = []; lineIndex = -2; timing = null; calibration = null;
    setActiveTrack(null);
    loadLyrics(song).then((lines) => {
      if (activeSong?.id === song.id) {
        lyricData = lines; lineIndex = -2;
        timing = lines.length ? { id: song.id, title: song.title, duration: song.durationSeconds, revision: song.audioRevision,
          first: lines[0].start, last: lines[lines.length - 1].end } : null;
        calibration = getCalibration(timing); setActiveTrack(timing); updateProgress();
      }
    });
  }
  if (changed) { ended = false; lineIndex = -2; renderSong(); }
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
    resetFinish();
    audio.pause(); audio.currentTime = start; ended = false;
    setState(command === "load" ? "Canción lista" : "Detenido");
  } else if (command === "pause") {
    resetFinish();
    audio.pause(); setState("Pausa");
  } else if (command === "restart" || command === "play") {
    resetFinish();
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
  if (visible && !document.hidden) updateProgress();
  if (activeVersion && !audio.paused && audio.currentTime >= bounds().end - .04) {
    finishPlayback();
  }
});
audio.addEventListener("play", () => { stage.classList.remove("paused"); $("#playBtn").setAttribute("aria-label", "Pausar"); $("#playBtn").title = "Pausar"; startPainting(); });
audio.addEventListener("pause", () => { stage.classList.add("paused"); $("#playBtn").setAttribute("aria-label", "Reproducir"); $("#playBtn").title = "Reproducir"; if (finishAt) startPainting(); else stopPainting(); });
audio.addEventListener("ended", () => { stage.classList.add("paused"); finishPlayback(); });
audio.addEventListener("error", () => { resetFinish(); stopPainting(); setState("Audio no disponible"); });
// No animation loop while paused, hidden or showing the song selector.
function paint(now) {
  paintFrame = 0;
  if (!visible || (audio.paused && !finishAt) || document.hidden) return;
  if (now - lastPaint >= 1000 / 30) { updateProgress(); lastPaint = now; }
  paintFrame = requestAnimationFrame(paint);
}
function startPainting() {
  if (!paintFrame && visible && (!audio.paused || finishAt) && !document.hidden) paintFrame = requestAnimationFrame(paint);
}
function stopPainting() { cancelAnimationFrame(paintFrame); paintFrame = 0; }
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopPainting();
  else { updateProgress(); startPainting(); }
});

function fitLyrics() {
  const panel = $(".lyricPanel"), lyrics = $("#lyrics");
  const style = getComputedStyle(panel);
  const available = panel.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  if (available <= 0) return;
  // Keep the current line readable before spending space on additional context.
  lyrics.dataset.context = available < 110 ? "single" : available < 240 ? "short" : "full";
  lyrics.style.setProperty("--lyric-scale", 1);
  let scale = 1;
  while (lyrics.scrollHeight > available && scale > .45) {
    scale -= .05;
    lyrics.style.setProperty("--lyric-scale", scale.toFixed(2));
  }
}
new ResizeObserver(fitLyrics).observe($(".lyricPanel"));
const refreshDelay = () => { delay = getDelay(); lineIndex = -2; updateProgress(); };
window.addEventListener("samay-delay-change", refreshDelay);
window.addEventListener("storage", event => { if (event.key === DELAY_KEY) refreshDelay(); });
window.addEventListener("samay-track-calibration", () => {
  calibration = getCalibration(timing); lineIndex = -2; updateProgress();
});
document.fonts.ready.then(fitLyrics);
document.fonts.addEventListener("loadingdone", fitLyrics);

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
  resetFinish();
  seeking = true;
  const { start, span } = bounds();
  const position = Number($("#seek").value) / 100;
  $("#seek").style.setProperty("--progress", `${position * 100}%`);
  audio.currentTime = start + span * position;
  ended = false; renderLyrics(audio.currentTime); $("#elapsed").textContent = mmss(heardPosition(audio.currentTime, start, start + span, delay));
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
    visible = false; ++commandToken; resetFinish(); audio.pause(); stopPainting(); lastCommand = "pause";
    return activeState;
  },
  show() { visible = true; fitLyrics(); updateProgress(); startPainting(); },
};
}
