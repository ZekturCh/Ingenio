export const DELAY_KEY = "samay-karaoke-bluetooth-delay-ms";
export const MIN_DELAY = -1500;
export const MAX_DELAY = 2500;

export function normalizeDelay(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(MIN_DELAY, Math.min(MAX_DELAY, Math.round(number / 10) * 10)) : 0;
}

export function getDelay() {
  try { return normalizeDelay(localStorage.getItem(DELAY_KEY) || 0); }
  catch { return 0; }
}

export function setDelay(value) {
  const delay = normalizeDelay(value);
  try { localStorage.setItem(DELAY_KEY, String(delay)); } catch {}
  window.dispatchEvent(new CustomEvent("samay-delay-change", { detail: delay }));
  return delay;
}

// Bluetooth plays sound after the media clock. A positive offset holds the lyrics back.
export function lyricTime(audioTime, delay = getDelay()) {
  return audioTime - normalizeDelay(delay) / 1000;
}
