# Canciones pendientes de audio

Las 28 canciones están en el catálogo: 23 tienen audio y 5 quedan ocultas hasta incorporar su pista. Cada carpeta pendiente contiene la letra TXT y un JSON de tiempos vacío. No se han creado audios ni tiempos ficticios.

| Canción | Archivo de música pendiente |
| --- | --- |
| Alma, corazón y vida | `songs/alma-corazon-y-vida/audio.mp3` |
| El muerto vivo | `songs/el-muerto-vivo/audio.mp3` |
| El rey | `songs/el-rey/audio.mp3` |
| Mal paso | `songs/mal-paso/audio.mp3` |
| Ódiame | `songs/odiame/audio.mp3` |

## Incorporar una pista

1. Guardar la grabación correspondiente como `audio.mp3` en la carpeta indicada (un MP3 real).
2. Confirmar intérprete y versión; revisar el TXT contra esa grabación, incluidas sus repeticiones.
3. Reemplazar su entrada `pendingTrack(...)` por `track(id, título, intérprete, duraciónEnSegundos)` en `songs/catalog.js`. Esto habilita la pista completa y la carga de su letra en `timing-editor.html`.
4. En el editor, marcar las entradas de cada frase y reemplazar `lyrics-timed.json` por el archivo exportado. Cambiar `lyricsStatus` a `timed` solo después de revisar las marcas.

Las siete pistas incorporadas previamente ya tienen sus TXT, pero todavía requieren sincronización. Cariñito conserva su letra sincronizada.

## Audios incorporados el 25/10/2026

Se importaron 15 MP3 aportados por el usuario sin modificar sus bytes. Sus JSON contienen tiempos aproximados repartidos según la longitud de las frases sobre la duración medida del archivo; no detectan entradas vocales ni secciones instrumentales. La app los identifica como aproximados. Revisar las letras y las marcas en `timing-editor.html`; Cariñito conserva su sincronización original. El registro de archivos y duraciones está en `AUDIOS-IMPORTADOS.json`.
