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
  pendingTrack("a-quien-le-importa", "A quién le importa"),
  pendingTrack("alma-corazon-y-vida", "Alma, corazón y vida"),
  pendingTrack("amor-eterno", "Amor eterno"),
  pendingTrack("cuando-pienses", "Cuando pienses en volver", "Pedro Suárez-Vértiz"),
  pendingTrack("el-muerto-vivo", "El muerto vivo"),
  pendingTrack("el-rey", "El rey"),
  pendingTrack("el-triste", "El triste"),
  pendingTrack("himno-peru", "Himno Nacional del Perú", "Perú"),
  pendingTrack("la-bruja", "La Bruja"),
  pendingTrack("la-llorona", "La Llorona"),
  pendingTrack("la-malaguena", "La Malagueña"),
  pendingTrack("mal-paso", "Mal paso"),
  pendingTrack("mujer-contra-mujer", "Mujer contra mujer"),
  pendingTrack("no-podras", "No podrás"),
  pendingTrack("nuestro-secreto", "Nuestro secreto"),
  pendingTrack("payaso", "Payaso"),
  pendingTrack("quien-sera", "Quién será"),
  pendingTrack("regresa", "Regresa"),
  pendingTrack("ritmo-color-sabor", "Ritmo, color y sabor", "Eva Ayllón"),
  pendingTrack("odiame", "Ódiame", "Eva Ayllón"),
];
