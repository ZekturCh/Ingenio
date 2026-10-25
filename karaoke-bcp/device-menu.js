import { getDelay, setDelay, lyricTime, MIN_DELAY, MAX_DELAY, DELAY_KEY } from "./audio-settings.js";
import { onOfflineStatus, downloadOffline } from "./offline.js";

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
    </section>
    <section aria-labelledby="offlineTitle">
      <h3 id="offlineTitle">Usar sin internet</h3>
      <p id="offlineMessage" role="status">Comprobando los archivos guardados…</p>
      <progress id="offlineProgress" max="1" value="0" aria-label="Descarga para uso sin internet"></progress>
      <button type="button" id="retryOffline">Completar descarga</button>
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
let animation;
function drawCalibration() {
  const time = lyricTime(calibration.currentTime);
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
  slider.value = getDelay();
  output.value = `${Number(slider.value) > 0 ? "+" : ""}${slider.value} ms`;
  slider.setAttribute("aria-valuetext", output.value);
}
export function openDeviceMenu() { reflectDelay(); if (!dialog.open) dialog.showModal(); }
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
retry.onclick = async () => {
  // Ask the browser to keep the downloaded files when it supports persistent storage.
  try { await navigator.storage?.persist?.(); } catch {}
  downloadOffline();
};
const mb = bytes => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
onOfflineStatus(status => {
  const ready = status.state === "ready", downloading = status.state === "downloading";
  indicator.dataset.state = status.state;
  let message = ready ? "Todo listo para usar sin internet." : downloading
    ? `Descargando: ${status.done} de ${status.total} archivos · ${mb(status.bytes)} de ${mb(status.totalBytes)}.`
    : status.message || "Comprobando los archivos guardados…";
  indicator.title = message;
  indicator.setAttribute("aria-label", message);
  controls.querySelector("#offlineMessage").textContent = message;
  progress.max = status.totalBytes || 1;
  progress.value = ready ? progress.max : status.bytes || 0;
  retry.disabled = downloading;
  retry.textContent = ready ? "Verificar descarga" : "Reintentar descarga";
});
