# Canciones pendientes de audio

Las 28 canciones están en el catálogo: 8 tienen audio y 20 quedan deshabilitadas hasta incorporar su pista. Cada carpeta pendiente contiene la letra TXT y un JSON de tiempos vacío. No se han creado audios ni tiempos ficticios.

| Canción | Archivo de música pendiente |
| --- | --- |
| A quién le importa | `songs/a-quien-le-importa/audio.mp3` |
| Alma, corazón y vida | `songs/alma-corazon-y-vida/audio.mp3` |
| Amor eterno | `songs/amor-eterno/audio.mp3` |
| Cuando pienses en volver | `songs/cuando-pienses/audio.mp3` |
| El muerto vivo | `songs/el-muerto-vivo/audio.mp3` |
| El rey | `songs/el-rey/audio.mp3` |
| El triste | `songs/el-triste/audio.mp3` |
| Himno Nacional del Perú | `songs/himno-peru/audio.mp3` |
| La Bruja | `songs/la-bruja/audio.mp3` |
| La Llorona | `songs/la-llorona/audio.mp3` |
| La Malagueña | `songs/la-malaguena/audio.mp3` |
| Mal paso | `songs/mal-paso/audio.mp3` |
| Mujer contra mujer | `songs/mujer-contra-mujer/audio.mp3` |
| No podrás | `songs/no-podras/audio.mp3` |
| Nuestro secreto | `songs/nuestro-secreto/audio.mp3` |
| Payaso | `songs/payaso/audio.mp3` |
| Quién será | `songs/quien-sera/audio.mp3` |
| Regresa | `songs/regresa/audio.mp3` |
| Ritmo, color y sabor | `songs/ritmo-color-sabor/audio.mp3` |
| Ódiame | `songs/odiame/audio.mp3` |

## Incorporar una pista

1. Guardar la grabación correspondiente como `audio.mp3` en la carpeta indicada (un MP3 real).
2. Confirmar intérprete y versión; revisar el TXT contra esa grabación, incluidas sus repeticiones.
3. Reemplazar su entrada `pendingTrack(...)` por `track(id, título, intérprete, duraciónEnSegundos)` en `songs/catalog.js`. Esto habilita la pista completa y la carga de su letra en `timing-editor.html`.
4. En el editor, marcar las entradas de cada frase y reemplazar `lyrics-timed.json` por el archivo exportado. Cambiar `lyricsStatus` a `timed` solo después de revisar las marcas.

Las siete pistas incorporadas previamente ya tienen sus TXT, pero todavía requieren sincronización. Cariñito conserva su letra sincronizada.
