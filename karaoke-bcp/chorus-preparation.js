export const PREPARATION_SECONDS = 5;

export function preparationStart(start, versionId) {
  return versionId === "chorus" ? Math.max(0, start - PREPARATION_SECONDS) : start;
}

export function preparationCount(heardTime, chorusStart, versionId) {
  if (versionId !== "chorus" || heardTime >= chorusStart) return 0;
  return Math.min(PREPARATION_SECONDS, Math.max(1, Math.ceil(chorusStart - heardTime)));
}
