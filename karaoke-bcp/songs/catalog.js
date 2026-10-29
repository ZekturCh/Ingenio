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

const carinito = track("carinito", "Cariñito", "Bareto", 226.168163);
carinito.audioRevision = "8f6273f3157d04d02cbf9b8846088fd081724d1cda651899b28cb1d460002cb5";
carinito.lyricsStatus = "estimated";
carinito.categories = ["fiesta", "peru"];

// Automatically aligned cues still require listening review before marking them verified.
function estimatedTrack(id, title, artist, durationSeconds, audioRevision) {
  return { ...track(id, title, artist, durationSeconds), audioRevision, lyricsStatus: "estimated" };
}

// BEGIN GENERATED CHORUSES
const CHORUS_WINDOWS = {
  "carinito": {
    "startAt": 55.96,
    "endAt": 84.34
  },
  "la-flor-de-la-canela": {
    "startAt": 68.56,
    "endAt": 109.62
  },
  "esta-es-mi-tierra": {
    "startAt": 126.4,
    "endAt": 177.48
  },
  "mi-propiedad-privada": {
    "startAt": 39.98,
    "endAt": 75.9
  },
  "fina-estampa": {
    "startAt": 137.4,
    "endAt": 166.04
  },
  "mi-peru": {
    "startAt": 86.78,
    "endAt": 126.52
  },
  "contigo-peru": {
    "startAt": 69.42,
    "endAt": 127.24
  },
  "y-se-llama-peru": {
    "startAt": 54.16,
    "endAt": 103.68
  },
  "a-quien-le-importa": {
    "startAt": 51.24,
    "endAt": 92.22
  },
  "alma-corazon-y-vida": {
    "startAt": 47.12,
    "endAt": 83.91
  },
  "amor-eterno": {
    "startAt": 90.42,
    "endAt": 135.82
  },
  "cuando-pienses": {
    "startAt": 78.16,
    "endAt": 97.08
  },
  "el-muerto-vivo": {
    "startAt": 69.18,
    "endAt": 85.18
  },
  "el-rey": {
    "startAt": 36.67,
    "endAt": 64.04
  },
  "el-triste": {
    "startAt": 90.82,
    "endAt": 142.56
  },
  "himno-peru": {
    "startAt": 107.66,
    "endAt": 151.88
  },
  "la-bruja": {
    "startAt": 46.484,
    "endAt": 116.355
  },
  "la-llorona": {
    "startAt": 67.412,
    "endAt": 119.415
  },
  "la-malaguena": {
    "startAt": 236.64,
    "endAt": 291.66
  },
  "mal-paso": {
    "startAt": 77.29,
    "endAt": 115.72
  },
  "mujer-contra-mujer": {
    "startAt": 180.86,
    "endAt": 230.9
  },
  "no-podras": {
    "startAt": 80.22,
    "endAt": 113.92
  },
  "nuestro-secreto": {
    "startAt": 36.62,
    "endAt": 80.18
  },
  "payaso": {
    "startAt": 19.4,
    "endAt": 75.64
  },
  "quien-sera": {
    "startAt": 75.733,
    "endAt": 100.492
  },
  "regresa": {
    "startAt": 56.48,
    "endAt": 94.5
  },
  "ritmo-color-sabor": {
    "startAt": 128.52,
    "endAt": 169.2
  },
  "odiame": {
    "startAt": 33.58,
    "endAt": 77.06
  }
};
function withChorus(song) {
  if (song.versions.some(version => version.id === "chorus")) return song;
  const window = CHORUS_WINDOWS[song.id];
  if (!window) return song;
  const seconds = Math.floor(window.endAt - window.startAt);
  return { ...song, versions: [{ id: "chorus", label: "Coro", ...window,
    durationLabel: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
    reviewRequired: song.lyricsStatus !== "timed", note: "Fragmento central" }, ...song.versions] };
}
// END GENERATED CHORUSES

export const SONGS = [
  carinito,
  estimatedTrack("la-flor-de-la-canela", "La Flor de la Canela", "Chabuca Granda", 211.226122, "be4f055454e0d2201b945663c2b759f49bb18636b247b186a4ab57fedd2eb111"),
  estimatedTrack("esta-es-mi-tierra", "Esta es mi tierra", "Eva Ayllón", 179.565714, "544ebc13ac88a28471e9ea56da5a3bb58b6f85ba75edd0fe7ebf20e061d5fb69"),
  estimatedTrack("mi-propiedad-privada", "Mi propiedad privada", "Intérprete por confirmar", 140.382041, "802597d70221f71d754293034112ee9b5487813ad4d7ceaccba1da9fdf975f42"),
  estimatedTrack("fina-estampa", "Fina Estampa", "Chabuca Granda", 174.106122, "f73d584241c54ed0ee0297007ef762e4b7dde00e8555b4932a89351f4c3018a9"),
  estimatedTrack("mi-peru", "Mi Perú", "Manuel Raygada y Óscar Avilés", 138.292245, "e9fe70f4a0376136f352982b620d32440eaae112c78378a7ab009a84b7306ed6"),
  estimatedTrack("contigo-peru", "Contigo Perú", "Arturo Zambo Cavero y Óscar Avilés", 210.050612, "8439d3d662ce46ff0ac293b3767fd31f58f3b0c47cdafce86090ef63c989ed29"),
  estimatedTrack("y-se-llama-peru", "Y se llama Perú", "Arturo Zambo Cavero y Óscar Avilés", 187.480816, "559e846efeb7c4485920fd5cfa81668070b605e4c87b0fdf895d2351f4d42da7"),
  estimatedTrack("a-quien-le-importa", "A quién le importa", "Alaska y Dinarama", 205.224, "71ba8c841737014186276425c681fe64a17ef14125141fa063317a10e69db422"),
  estimatedTrack("alma-corazon-y-vida", "Alma, corazón y vida", "Trío Los Panchos", 192.705306, "38a7ec7e4e1cff5d9fe7264d40642783357e9f4d97ef5f6fcf07512f2ad49ebb"),
  estimatedTrack("amor-eterno", "Amor eterno", "Juan Gabriel", 417.933061, "d7d57175123d31876ac25a6fc573b3054bc495aa173709597d6dadbb2e8e3da3"),
  estimatedTrack("cuando-pienses", "Cuando pienses en volver", "Pedro Suárez-Vértiz", 254.354286, "a6318ab0a76ebd1fa3c9e6778c0f248fe62a218c2d7eb81bb3ecd0adc8af5d10"),
  estimatedTrack("el-muerto-vivo", "El muerto vivo", "Peret", 139.128163, "caa1cf2ee123a0e80e7091bf9f717c4ad1c9015806459c810c98c7e3630318be"),
  estimatedTrack("el-rey", "El rey", "José Alfredo Jiménez", 130.011429, "c3067bc0408a0f66245d4d11f3df5ef30bce4dbd30b0e578cbd638f7c1879a80"),
  estimatedTrack("el-triste", "El triste", "José José", 253.272, "81d7e475989fb5e91340e75521476b697551d1052cf43af43e20c84c8d6ea464"),
  estimatedTrack("himno-peru", "Himno Nacional del Perú", "Perú", 161.593469),
  estimatedTrack("la-bruja", "La Bruja", "Rosy Arango", 233.586939),
  estimatedTrack("la-llorona", "La Llorona", "Chavela Vargas", 337.057959),
  estimatedTrack("la-malaguena", "La Malagueña", "Ángela Aguilar", 324.545306, "76ff3a36d89b9d30198d08c7ee7312ac916cf81407580ebd99e5b17b441a3715"),
  estimatedTrack("mal-paso", "Mal paso", "Los Kipus y Eva Ayllón", 161.802449, "1518698ef6653dd005f5608963eb90467cba07afa27eefcaab5151865788fdd6"),
  estimatedTrack("mujer-contra-mujer", "Mujer contra mujer", "Mecano", 245.368163, "13e3c782a804a16896ca1973ff5ac08ef05bc0aa46e6d06d3779932df74f0100"),
  estimatedTrack("no-podras", "No podrás", "Cristian Castro", 240.117551, "28777654c46ef8fd94fcd7a899b95ab6d8c2db51c1711492c164a470d33a959a"),
  estimatedTrack("nuestro-secreto", "Nuestro secreto", "Óscar Avilés y Arturo Zambo Cavero", 153.652245, "be8d5ec295d425f1ff47e4ad2c114909414bd336f659c8c12e8b6addb38f8d8c"),
  estimatedTrack("payaso", "Payaso", "José José", 179.591837, "9ef6837559c97aada034b1fe727b2dee21d217a7f4b1e73a40f8413de274773f"),
  estimatedTrack("quien-sera", "Quién será", "Julio Iglesias", 166.321633),
  estimatedTrack("regresa", "Regresa", "Lucha Reyes", 173.662041, "d207aec76b5f945877444061fd4ac2822fa5d43b73b994e4b1290e777c0a69e7"),
  estimatedTrack("ritmo-color-sabor", "Ritmo, color y sabor", "Eva Ayllón", 258.403265, "ee95ce5da0f1dbe3ca7b7e5c3fcd683341327f985b8bc718289c36b8e1c9e0bc"),
  estimatedTrack("odiame", "Ódiame", "Julio Jaramillo", 168.568163, "ce44d14fabfeb9fe4e3b2fcd882ec4ba8d8863da3adc93d4946ce61254e2313b"),
].map(withChorus);
