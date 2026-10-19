export function parseText(text) {
  return text.replace(/^\uFEFF/, "").split(/\r?\n/).map(line => line.trim())
    .filter(line => line && !line.startsWith("#"));
}

export function timedLyrics(lines, duration) {
  if (!lines.length) throw new Error("La letra está vacía.");
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("El audio aún no está listo.");
  return lines.map((line, i) => {
    if (line.time == null || !Number.isFinite(line.time) || line.time < 0 || line.time >= duration)
      throw new Error(`Falta una marca válida en la frase ${i + 1}.`);
    const next = lines[i + 1]?.time;
    if (next != null && next <= line.time) throw new Error("Las marcas deben estar en orden creciente.");
    return { text: line.text, start: line.time, end: next ?? duration };
  });
}
