function track(id, title, artist, durationSeconds) {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = String(Math.floor(durationSeconds % 60)).padStart(2, "0");
  return {
    id, title, artist, enabled: true, durationSeconds,
    audio: `songs/${id}/audio.mp3`,
    lyrics: `songs/${id}/lyrics-timed.json`,
    text: `songs/${id}/letra.txt`,
    lyricsStatus: "pending",
    categories: ["criollo", "peru"],
    versions: [{ id: "full", label: "Completa", durationLabel: `${minutes}:${seconds}`,
      startAt: 0, endAt: durationSeconds, note: "Pista completa" }],
  };
}

const carinito = track("carinito", "Cariñito", "Bareto", 223.791);
carinito.lyricsStatus = "timed";
carinito.categories = ["fiesta", "peru"];
carinito.versions.unshift({ id: "chorus", label: "Coro", durationLabel: "1:00",
  startAt: 57.214, endAt: 117.214, note: "Versión rápida para activación" });

export const SONGS = [
  carinito,
  track("la-flor-de-la-canela", "La Flor de la Canela", "Chabuca Granda", 211.148),
  track("esta-es-mi-tierra", "Esta es mi tierra", "Eva Ayllón", 213.603),
  track("mi-propiedad-privada", "Mi propiedad privada", "Eva Ayllón", 204.042),
  track("fina-estampa", "Fina Estampa", "Lucha Reyes", 161.097),
  track("mi-peru", "Mi Perú", "Manuel Raygada", 87.536),
  track("contigo-peru", "Contigo Perú", "Arturo \"Zambo\" Cavero", 237.087),
  track("y-se-llama-peru", "Y se llama Perú", "Zambo Cavero y Óscar Avilés", 185.365),
  { id: "odiame", title: "Ódiame", artist: "Eva Ayllón", enabled: false, versions: [] },
  { id: "himno-peru", title: "Himno Nacional del Perú", artist: "Perú", enabled: false, versions: [] },
  { id: "cuando-pienses", title: "Cuando pienses en volver", artist: "Pedro Suárez-Vértiz", enabled: false, versions: [] },
  { id: "ritmo-color-sabor", title: "Ritmo, color y sabor", artist: "Eva Ayllón", enabled: false, versions: [] },
];
