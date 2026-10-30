export const VOLUME_KEY = "samay-karaoke-music-volume";

function normalize(value) {
  if (value == null || value === "") return 1;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 1;
}
export function getMusicVolume() {
  try { return normalize(localStorage.getItem(VOLUME_KEY)); }
  catch { return 1; }
}
function setMusicVolume(value) {
  const volume = normalize(value);
  try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch {}
  // Apply even if this browser cannot persist settings.
  const audio = document.querySelector("#audio");
  if (audio) audio.volume = volume;
  window.dispatchEvent(new CustomEvent("samay-music-volume", { detail: volume }));
  return volume;
}
export function mountMusicVolume() {
  if (document.querySelector("#musicVolumeControl")) return;
  const control = document.createElement("div");
  control.id = "musicVolumeControl"; control.className = "music-volume";
  control.setAttribute("role", "group"); control.setAttribute("aria-label", "Volumen de la música");
  control.innerHTML = `<button type="button" class="music-volume-mute" aria-label="Silenciar música" aria-pressed="false" title="Silenciar música">
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m11 5-6 4H2v6h3l6 4z"/><g class="music-volume-waves"><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></g><path class="music-volume-cross" d="m16 9 6 6m0-6-6 6"/></svg>
    </button><label class="sr" for="musicVolume">Volumen de la música</label>
    <input id="musicVolume" type="range" min="0" max="100" step="1" value="100" aria-label="Volumen de la música">
    <output for="musicVolume" id="musicVolumeValue">100%</output>`;
  document.body.append(control);
  document.documentElement.classList.add("has-music-volume");
  const slider = control.querySelector("input"), mute = control.querySelector("button"), output = control.querySelector("output");
  let lastAudible = getMusicVolume() || 1;
  function reflect(volume = getMusicVolume()) {
    const percent = Math.round(normalize(volume) * 100), muted = percent === 0;
    if (!muted) lastAudible = percent / 100;
    slider.value = percent; slider.setAttribute("aria-valuetext", `${percent}%`);
    output.value = `${percent}%`;
    control.classList.toggle("muted", muted);
    mute.setAttribute("aria-pressed", String(muted));
    mute.setAttribute("aria-label", muted ? "Activar sonido de la música" : "Silenciar música");
    mute.title = muted ? "Activar sonido de la música" : "Silenciar música";
  }
  slider.oninput = () => setMusicVolume(Number(slider.value) / 100);
  mute.onclick = () => setMusicVolume(Number(slider.value) > 0 ? 0 : lastAudible);
  window.addEventListener("samay-music-volume", event => reflect(event.detail));
  window.addEventListener("storage", event => { if (event.key === VOLUME_KEY) reflect(); });
  reflect();
}
