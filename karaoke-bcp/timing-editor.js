import { SONGS } from "./songs/catalog.js?v=20261019-1";
import { parseText, timedLyrics } from "./lyrics.js";

const $ = selector => document.querySelector(selector);
const audio = $("#audio"), songs = SONGS.filter(song => song.enabled);
let selected, lines = [], cursor = 0, undoStack = [], loadToken = 0;
const key = () => `samay-timing-${selected.id}`;
const status = text => { $("#status").textContent = text; };
const fmt = time => time == null ? "--:--.---" : `${String(Math.floor(time / 60)).padStart(2, "0")}:${(time % 60).toFixed(3).padStart(6, "0")}`;
for (const song of songs) $("#song").add(new Option(`${song.title} · ${song.artist}`, song.id));

function save() {
  try { localStorage.setItem(key(), JSON.stringify({ text: $("#text").value, lines, cursor })); }
  catch { status("No se pudo guardar el borrador local. Descarga los archivos antes de salir."); }
}
function draw() {
  $("#current").textContent = lines[cursor]?.text || (lines.length ? "Marcas completadas" : "Sin letra");
  $("#next").textContent = lines[cursor + 1]?.text || "";
  $("#idx").textContent = `${Math.min(cursor + 1, lines.length)} / ${lines.length}`;
  $("#mark").disabled = !lines[cursor];
  $("#undo").disabled = !undoStack.length;
  $("#list").replaceChildren(...lines.map((line, i) => {
    const row = document.createElement("li"), button = document.createElement("button");
    row.classList.toggle("active", i === cursor);
    const time = document.createElement("time"), text = document.createElement("span");
    time.textContent = fmt(line.time); text.textContent = line.text;
    button.append(time, text); button.onclick = () => { cursor = i; draw(); save(); };
    const clear = document.createElement("button");
    clear.className = "clear"; clear.textContent = "×"; clear.title = "Borrar marca";
    clear.setAttribute("aria-label", `Borrar marca de frase ${i + 1}`);
    clear.onclick = () => { undoStack.push({ i, time: line.time, cursor }); line.time = null; cursor = i; draw(); save(); };
    row.append(button, clear); return row;
  }));
}
async function selectSong(id) {
  const token = ++loadToken;
  audio.pause(); selected = songs.find(song => song.id === id) || songs[0];
  $("#song").value = selected.id; audio.src = selected.audio;
  audio.playbackRate = Number($("#rate").value);
  lines = []; cursor = 0; undoStack = []; $("#text").value = ""; draw();
  status("Cargando…");
  try {
    const saved = JSON.parse(localStorage.getItem(key()) || "null");
    if (saved && typeof saved.text === "string" && Array.isArray(saved.lines) && saved.lines.every(line => typeof line.text === "string" && (line.time === null || Number.isFinite(line.time)))) {
      lines = saved.lines; cursor = Math.max(0, Math.min(Number(saved.cursor) || 0, lines.length));
      $("#text").value = saved.text; status("Borrador local recuperado."); draw(); return;
    }
  } catch {}
  try {
    const response = await fetch(selected.lyrics);
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (token !== loadToken) return;
    lines = (data.lyrics || []).map(line => ({ text: line.text, time: line.start ?? line.time ?? null }));
    if (!lines.length) {
      const response = await fetch(selected.text);
      if (!response.ok) throw new Error();
      const text = await response.text();
      if (token !== loadToken) return;
      lines = parseText(text).map(text => ({ text, time: null }));
    }
    $("#text").value = lines.map(line => line.text).join("\n");
    cursor = lines.findIndex(line => line.time == null); if (cursor < 0) cursor = 0;
    status(lines.length ? "Letra cargada." : "Letra pendiente.");
  } catch { if (token === loadToken) status("No se pudo cargar la letra."); }
  if (token === loadToken) draw();
}
function applyText() {
  const texts = parseText($("#text").value);
  lines = texts.map((text, i) => ({ text, time: lines[i]?.text === text ? lines[i].time : null }));
  cursor = lines.findIndex(line => line.time == null); if (cursor < 0) cursor = 0;
  undoStack = []; draw(); save(); status(`${lines.length} frases. Borrador guardado.`);
}
function mark() {
  if (!lines[cursor] || !Number.isFinite(audio.duration)) return;
  const time = Number(audio.currentTime.toFixed(3));
  if (time >= audio.duration || (cursor > 0 && lines[cursor - 1].time != null && time <= lines[cursor - 1].time) || (lines[cursor + 1]?.time != null && time >= lines[cursor + 1].time)) {
    status("La marca debe quedar entre la frase anterior y la siguiente."); return;
  }
  undoStack.push({ i: cursor, time: lines[cursor].time, cursor });
  lines[cursor++].time = time; draw(); save();
  status(`${lines.filter(line => line.time != null).length} / ${lines.length} frases marcadas.`);
  $("#list .active")?.scrollIntoView({ block: "nearest" });
}
function undo() { const old = undoStack.pop(); if (!old) return; lines[old.i].time = old.time; cursor = old.cursor; draw(); save(); }
function nudge(delta) {
  const i = cursor === lines.length || lines[cursor]?.time == null ? cursor - 1 : cursor;
  if (i < 0 || lines[i].time == null) return;
  const time = Number((lines[i].time + delta).toFixed(3));
  if (time < 0 || time >= audio.duration || (lines[i - 1]?.time != null && time <= lines[i - 1].time) || (lines[i + 1]?.time != null && time >= lines[i + 1].time)) return;
  undoStack.push({ i, time: lines[i].time, cursor }); lines[i].time = time; draw(); save();
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#song").onchange = () => { save(); selectSong($("#song").value); };
$("#text").oninput = save;
$("#apply").onclick = applyText;
$("#textFile").onchange = async event => {
  const file = event.target.files[0], token = loadToken;
  if (!file) return;
  const text = await file.text(); if (token !== loadToken) return;
  $("#text").value = text; applyText(); event.target.value = "";
};
$("#mark").onclick = mark; $("#undo").onclick = undo;
$("#nudgeBack").onclick = () => nudge(-.1); $("#nudgeFwd").onclick = () => nudge(.1);
$("#play").onclick = () => audio.paused ? audio.play().catch(() => status("No se pudo reproducir la pista.")) : audio.pause();
$("#back").onclick = () => { audio.currentTime = Math.max(0, audio.currentTime - 2); };
$("#forward").onclick = () => { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 2); };
$("#rate").onchange = () => { audio.playbackRate = Number($("#rate").value); };
audio.ontimeupdate = () => { $("#time").textContent = fmt(audio.currentTime); };
audio.onerror = () => status("Audio no disponible.");
$("#exportText").onclick = () => download("letra.txt", $("#text").value, "text/plain;charset=utf-8");
$("#export").onclick = () => {
  try {
    if (parseText($("#text").value).join("\n") !== lines.map(line => line.text).join("\n")) throw new Error("Aplica los cambios de letra antes de exportar.");
    const lyrics = timedLyrics(lines, audio.duration);
    download("lyrics-timed.json", JSON.stringify({ songId: selected.id, title: selected.title, status: "timed", durationSeconds: audio.duration, lyrics }, null, 2), "application/json");
    status(`Exportado: songs/${selected.id}/lyrics-timed.json`);
  } catch (error) { status(error.message); }
};
document.addEventListener("keydown", event => {
  if (/INPUT|TEXTAREA|SELECT|BUTTON|A/.test(event.target.tagName)) return;
  if (event.code === "Space") { event.preventDefault(); mark(); }
  else if (event.key.toLowerCase() === "z") undo();
});
const initial = new URLSearchParams(location.search).get("song");
selectSong(initial);
window.lucide?.createIcons();
