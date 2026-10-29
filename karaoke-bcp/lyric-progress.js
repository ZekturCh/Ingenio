export function cueProgress(time, start, end) {
  return Math.max(0, Math.min(1, (time - start) / Math.max(.02, end - start)));
}

// Keep the original characters, including punctuation, when constructing word spans.
export function lyricParts(line) {
  if (!Array.isArray(line?.words) || !line.words.length) return [];
  // Partial word matches would leave permanently unpainted holes in the phrase.
  // Use the continuous phrase sweep until every sung word has a timestamp.
  const tokens = [...line.text.matchAll(/[\p{L}\p{N}]+/gu)];
  if (!tokens.every(token => line.words.some(word => word.from === token.index && word.to === token.index + token[0].length))) return [];
  const result = [];
  let offset = 0;
  for (const word of line.words) {
    if (!Number.isInteger(word.from) || !Number.isInteger(word.to) ||
        word.from < offset || word.to <= word.from || word.to > line.text.length ||
        !Number.isFinite(word.start) || !Number.isFinite(word.end) || word.end <= word.start) continue;
    if (word.from > offset) result.push({ text: line.text.slice(offset, word.from) });
    result.push({ text: line.text.slice(word.from, word.to), start: word.start, end: word.end });
    offset = word.to;
  }
  if (offset < line.text.length) result.push({ text: line.text.slice(offset) });
  return result.some(part => part.start != null) ? result : [];
}
