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

// Estimated cues distribute the supplied text across the file; review against the audio.
function estimatedTrack(id, title, artist, durationSeconds) {
  return { ...track(id, title, artist, durationSeconds), lyricsStatus: "estimated" };
}

function pendingTrack(id, title, artist = "Versión por confirmar") {
  return {
    id, title, artist, enabled: false, audioStatus: "missing",
    audio: `songs/${id}/audio.mp3`,
    text: `songs/${id}/letra.txt`,
    lyrics: `songs/${id}/lyrics-timed.json`,
    lyricsStatus: "pending", versions: [],
  };
}

export const SONGS = [
  carinito,
  track("la-flor-de-la-canela", "La Flor de la Canela", "Chabuca Granda", 211.148),
  track("esta-es-mi-tierra", "Esta es mi tierra", "Eva Ayllón", 213.603),
  track("mi-propiedad-privada", "Mi propiedad privada", "Eva Ayllón", 204.042),
  track("fina-estampa", "Fina Estampa", "Lucha Reyes", 161.097),
  track("mi-peru", "Mi Perú", "Manuel Raygada", 87.536),
  track("contigo-peru", "Contigo Perú", "Arturo \"Zambo\" Cavero", 237.087),
  track("y-se-llama-peru", "Y se llama Perú", "Zambo Cavero y Óscar Avilés", 185.365),
  estimatedTrack("a-quien-le-importa", "A quién le importa", "Alaska y Dinarama", 196.806531),
  pendingTrack("alma-corazon-y-vida", "Alma, corazón y vida"),
  estimatedTrack("amor-eterno", "Amor eterno", "Juan Gabriel", 281.312653),
  estimatedTrack("cuando-pienses", "Cuando pienses en volver", "Pedro Suárez-Vértiz", 251.506939),
  pendingTrack("el-muerto-vivo", "El muerto vivo"),
  pendingTrack("el-rey", "El rey"),
  estimatedTrack("el-triste", "El triste", "José José", 238.262857),
  estimatedTrack("himno-peru", "Himno Nacional del Perú", "Perú", 161.593469),
  estimatedTrack("la-bruja", "La Bruja", "Rosy Arango", 233.586939),
  estimatedTrack("la-llorona", "La Llorona", "Chavela Vargas", 337.057959),
  estimatedTrack("la-malaguena", "La Malagueña", "Ángela Aguilar", 297.691429),
  pendingTrack("mal-paso", "Mal paso"),
  estimatedTrack("mujer-contra-mujer", "Mujer contra mujer", "Mecano", 247.301224),
  estimatedTrack("no-podras", "No podrás", "Cristian Castro", 236.094694),
  estimatedTrack("nuestro-secreto", "Nuestro secreto", "Arturo \"Zambo\" Cavero", 159.425306),
  estimatedTrack("payaso", "Payaso", "José José", 178.155102),
  estimatedTrack("quien-sera", "Quién será", "Julio Iglesias", 166.321633),
  estimatedTrack("regresa", "Regresa", "Eva Ayllón", 247.118367),
  estimatedTrack("ritmo-color-sabor", "Ritmo, color y sabor", "Eva Ayllón", 257.07102),
  pendingTrack("odiame", "Ódiame", "Eva Ayllón"),
];
