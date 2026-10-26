import { getDelay, setDelay, lyricTime, MIN_DELAY, MAX_DELAY, DELAY_KEY } from "./audio-settings.js";
import { onOfflineStatus, downloadOffline } from "./offline.js";
import { getActiveTrack, getCalibration, saveCalibration, resetCalibration } from "./track-timing.js";

const controls = document.createElement("div");
controls.className = "device-controls";
controls.innerHTML = `
  <button class="device-open" type="button" aria-label="Abrir ajustes de audio y descarga" title="Audio y descarga">⚙</button>
  <button class="offline-indicator" data-state="checking" type="button" aria-label="Comprobando descarga sin conexión" title="Comprobando descarga sin conexión"><span aria-hidden="true"></span></button>
  <dialog class="device-dialog" aria-labelledby="deviceTitle">
    <div class="device-heading"><h2 id="deviceTitle">Audio y descarga</h2><button class="device-close" type="button" aria-label="Cerrar ajustes">×</button></div>
    <section aria-labelledby="bluetoothTitle">
      <h3 id="bluetoothTitle">Sincronización Bluetooth</h3>
      <p>Conecta tu altavoz y reproduce la prueba. Ajusta el retraso hasta que cada pitido coincida con el destello del círculo.</p>
      <div class="calibration-preview"><div class="calibration-pulse" id="calibrationPulse" aria-hidden="true">●</div><span id="calibrationHint">Sonido y destello al mismo tiempo</span></div>
      <button class="calibration-play" type="button" id="calibrationPlay">Reproducir prueba</button>
      <audio id="calibrationAudio" preload="none" loop src="assets/audio/bluetooth-calibration.wav"></audio>
      <p>Si escuchas la voz después de ver la letra, aumenta el retraso. Si la letra llega tarde, redúcelo.</p>
      <label for="bluetoothDelay">Retraso de la letra <output id="delayValue" for="bluetoothDelay">0 ms</output></label>
      <input id="bluetoothDelay" type="range" min="${MIN_DELAY}" max="${MAX_DELAY}" step="10" value="${getDelay()}">
      <div class="delay-actions"><button type="button" data-delay-step="-50">−50 ms</button><button type="button" data-delay-step="50">+50 ms</button><button type="button" id="resetDelay">Restablecer</button></div>
      <p class="device-hint">Se guarda en este navegador y se aplica al instante. 0 ms para altavoces sin retraso. Ajusta la compensación en el dispositivo que reproduce el audio.</p>
      <a class="device-editor" id="timingEditorLink" href="timing-editor.html">Escuchar y ajustar la letra de esta canción</a>
      <details class="song-adjustment"><summary>Ajuste rápido de esta canción</summary>
        <p id="songTimingTitle">Elige una canción para ajustar su letra.</p>
        <p class="device-hint">Indica cuándo entra la primera frase y cuándo termina la última. Las frases intermedias se acomodan dentro de ese tramo.</p>
        <label for="songFirst">Primera frase, en segundos</label><input id="songFirst" type="number" min="0" step="0.1" disabled>
        <button type="button" id="markFirst" disabled>Primera frase aquí</button>
        <label for="songLast">Fin de la última frase, en segundos</label><input id="songLast" type="number" min="0" step="0.1" disabled>
        <button type="button" id="markLast" disabled>Fin de letra aquí</button>
        <button type="button" id="resetSongTiming" disabled>Restablecer esta canción</button>
        <p id="songTimingMessage" class="device-hint" role="status">Se guarda en este navegador y solo afecta a esta canción.</p>
      </details>
    </section>
    <section aria-labelledby="offlineTitle">
      <h3 id="offlineTitle">Usar sin internet</h3>
      <p id="offlineMessage" role="status">Comprobando los archivos guardados…</p>
      <progress id="offlineProgress" max="1" value="0" aria-label="Descarga para uso sin internet"></progress>
      <button type="button" id="retryOffline">Completar descarga</button>
      <button type="button" id="applyUpdate" hidden>Aplicar actualización</button>
      <p class="device-hint">El punto verde confirma que están guardadas las páginas, imágenes, letras y todas las pistas disponibles. Mantén esta página abierta hasta que termine. Sin internet, el control de sala funciona entre pestañas de este navegador; otros dispositivos necesitan conexión.</p>
    </section>
  </dialog>`;
document.body.append(controls);
const dialog = controls.querySelector("dialog");
const slider = controls.querySelector("#bluetoothDelay");
const output = controls.querySelector("#delayValue");
const indicator = controls.querySelector(".offline-indicator");
const progress = controls.querySelector("#offlineProgress");
const retry = controls.querySelector("#retryOffline");
const calibration = controls.querySelector("#calibrationAudio");
const calibrationPlay = controls.querySelector("#calibrationPlay");
const pulse = controls.querySelector("#calibrationPulse");
let animation, calibrationDelay = getDelay();
function drawCalibration() {
  const time = lyricTime(calibration.currentTime, calibrationDelay);
  const active = [2, 3, 4, 5, 6, 7].some(beat => time >= beat && time < beat + .12);
  pulse.classList.toggle("flash", active && !calibration.paused);
  controls.querySelector("#calibrationHint").textContent = active ? "¡Ahora!" : "Haz coincidir el pitido y el destello";
  if (!calibration.paused) animation = requestAnimationFrame(drawCalibration);
}
calibrationPlay.onclick = async () => {
  if (!calibration.paused) { calibration.pause(); return; }
  document.querySelector("#audio")?.pause();
  try { await calibration.play(); }
  catch { controls.querySelector("#calibrationHint").textContent = "No se pudo cargar la prueba. Completa la descarga o vuelve a intentarlo."; }
};
calibration.onplay = () => {
  calibrationPlay.textContent = "Pausar prueba";
  cancelAnimationFrame(animation);
  drawCalibration();
};
calibration.onpause = () => {
  calibrationPlay.textContent = "Reproducir prueba";
  cancelAnimationFrame(animation);
  pulse.classList.remove("flash");
};
dialog.addEventListener("close", () => { calibration.pause(); calibration.currentTime = 0; });
function reflectDelay() {
  calibrationDelay = getDelay();
  slider.value = getDelay();
  output.value = `${Number(slider.value) > 0 ? "+" : ""}${slider.value} ms`;
  slider.setAttribute("aria-valuetext", output.value);
}
export function openDeviceMenu() {
  reflectDelay();
  reflectSongTiming();
  const target = new URL("timing-editor.html", location.href);
  if (document.body.dataset.songId) target.searchParams.set("song", document.body.dataset.songId);
  controls.querySelector("#timingEditorLink").href = target.href;
  if (!dialog.open) dialog.showModal();
}
controls.querySelector(".device-open").onclick = openDeviceMenu;
indicator.onclick = openDeviceMenu;
document.addEventListener("click", event => { if (event.target.closest("[data-device-settings]")) openDeviceMenu(); });
controls.querySelector(".device-close").onclick = () => { calibration.pause(); dialog.close(); };
slider.oninput = () => { setDelay(slider.value); reflectDelay(); };
for (const button of controls.querySelectorAll("[data-delay-step]")) button.onclick = () => {
  setDelay(getDelay() + Number(button.dataset.delayStep)); reflectDelay();
};
controls.querySelector("#resetDelay").onclick = () => { setDelay(0); reflectDelay(); };
window.addEventListener("storage", event => { if (event.key === DELAY_KEY) reflectDelay(); });
reflectDelay();
function reflectSongTiming() {
  const track = getActiveTrack(), value = getCalibration(track);
  controls.querySelector("#songTimingTitle").textContent = track?.title || "Elige una canción para ajustar su letra.";
  for (const id of ["songFirst", "songLast", "markFirst", "markLast", "resetSongTiming"]) controls.querySelector(`#${id}`).disabled = !track;
  controls.querySelector("#songFirst").value = track ? (value?.first ?? track.first).toFixed(2) : "";
  controls.querySelector("#songLast").value = track ? (value?.last ?? track.last).toFixed(2) : "";
  controls.querySelector("#songFirst").max = track?.duration || 0;
  controls.querySelector("#songLast").max = track?.duration || 0;
}
function applySongTiming() {
  try {
    saveCalibration(getActiveTrack(), Number(controls.querySelector("#songFirst").value), Number(controls.querySelector("#songLast").value));
    controls.querySelector("#songTimingMessage").textContent = "Ajuste guardado y aplicado. Puedes restablecerlo en cualquier momento.";
  } catch (error) { controls.querySelector("#songTimingMessage").textContent = error.message; }
  reflectSongTiming();
}
for (const id of ["songFirst", "songLast"]) controls.querySelector(`#${id}`).onchange = applySongTiming;
for (const [button, input] of [["markFirst", "songFirst"], ["markLast", "songLast"]]) controls.querySelector(`#${button}`).onclick = () => {
  const audio = document.querySelector("#audio");
  if (!audio || !getActiveTrack()) return;
  controls.querySelector(`#${input}`).value = Math.max(0, audio.currentTime - getDelay() / 1000).toFixed(2);
  applySongTiming();
};
controls.querySelector("#resetSongTiming").onclick = () => {
  try {
    resetCalibration(getActiveTrack()); reflectSongTiming();
    controls.querySelector("#songTimingMessage").textContent = "Se recuperaron los tiempos originales de esta canción.";
  } catch { controls.querySelector("#songTimingMessage").textContent = "No se pudo guardar el cambio en este navegador."; }
};
window.addEventListener("samay-active-track", reflectSongTiming);
window.addEventListener("samay-track-calibration", reflectSongTiming);
controls.querySelector("#applyUpdate").onclick = () => location.reload();
retry.onclick = async () => {
  // Ask the browser to keep the downloaded files when it supports persistent storage.
  try { await navigator.storage?.persist?.(); } catch {}
  downloadOffline();
};
const mb = bytes => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
onOfflineStatus(status => {
  const ready = status.state === "ready", downloading = status.state === "downloading";
  indicator.dataset.state = status.state;
  let message = ready ? (status.updateAvailable ? "Descarga completa. Hay una actualización lista para aplicar." : "Todo listo para usar sin internet.") : downloading
    ? `Descargando: ${status.done} de ${status.total} archivos · ${mb(status.bytes)} de ${mb(status.totalBytes)}.`
    : status.message || "Comprobando los archivos guardados…";
  indicator.title = message;
  indicator.setAttribute("aria-label", message);
  controls.querySelector("#offlineMessage").textContent = message;
  progress.max = status.totalBytes || 1;
  progress.value = ready ? progress.max : status.bytes || 0;
  retry.disabled = downloading;
  retry.textContent = ready ? "Verificar descarga" : "Reintentar descarga";
  controls.querySelector("#applyUpdate").hidden = !ready || !status.updateAvailable;
});
