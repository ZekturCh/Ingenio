const KEY = "samay-karaoke-track-timing-v1";
let activeTrack = null;
const signature = track => `${track.duration}|${track.first}|${track.last}`;
const read = () => {
  try { const value = JSON.parse(localStorage.getItem(KEY) || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
  catch { return {}; }
};

export function normalizeCalibration(track, value) {
  if (!track || !value || value.signature !== signature(track)) return null;
  const first = Number(value.first);
  let last = Number(value.last);
  if (last > track.duration && last - track.duration <= .01) last = track.duration;
  if (!Number.isFinite(first) || !Number.isFinite(last) || first < 0 || last > track.duration || last - first < .5) return null;
  return { first, last, signature: value.signature };
}
export function getCalibration(track) {
  return track ? normalizeCalibration(track, read()[track.id]) : null;
}
export function saveCalibration(track, first, last) {
  if (!track) throw new Error("Elige una canción primero.");
  const value = normalizeCalibration(track, { first, last, signature: signature(track) });
  if (!value) throw new Error("La primera frase debe ir antes del final, dentro de la duración de la canción.");
  const values = read(); values[track.id] = value;
  localStorage.setItem(KEY, JSON.stringify(values));
  window.dispatchEvent(new Event("samay-track-calibration"));
  return value;
}
export function resetCalibration(track) {
  if (!track) return;
  const values = read(); delete values[track.id];
  localStorage.setItem(KEY, JSON.stringify(values));
  window.dispatchEvent(new Event("samay-track-calibration"));
}
export function calibratedTime(time, track, value) {
  if (!track || !value) return time;
  return track.first + (time - value.first) * (track.last - track.first) / (value.last - value.first);
}
export function setActiveTrack(track) {
  activeTrack = track;
  window.dispatchEvent(new Event("samay-active-track"));
}
export const getActiveTrack = () => activeTrack;
if (typeof window !== "undefined") window.addEventListener("storage", event => {
  if (event.key === KEY) window.dispatchEvent(new Event("samay-track-calibration"));
});
