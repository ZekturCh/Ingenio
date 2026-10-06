# Hallowow Criollazo

Selector tactil y reproductor de karaoke para Samay BCP. Elegir una cancion y su
version abre la reproduccion y activa el audio en la misma pestana, sin otro toque.
La flecha de volver o el boton atras del navegador pausa el audio y devuelve al
selector, conservando busqueda, favoritas y desplazamiento de la lista.
Ambas vistas comparten la sala indicada por `?room=HALLOWOW`. Firebase sincroniza
dispositivos diferentes y localStorage sincroniza pestanas del mismo navegador.

## Pantallas

- `index.html`: seleccion y reproduccion en una sola pantalla, busqueda sin
  distinguir tildes y favoritos.
- `player.html`: vista reutilizable de audio, letras sincronizadas, pausa,
  anterior/siguiente, favoritos, aleatorio y barra tactil de progreso. Puede abrirse
  por separado para otra pantalla; solo en ese modo requiere Activar audio.
- `admin.html` y `timing-editor.html`: administracion existente.

La composicion prioriza una pantalla touch vertical (referencia 1080 x 1920).
El arte ocupa toda la pagina: marca arriba, canciones o letras en el centro,
calabaza y guitarra abajo, sin flores ni follaje. Las piezas tienen transparencia
y se posicionan por separado, sin un flyer insertado. El selector conserva dos
columnas en horizontal y una en vertical; en pantallas pequenas la lista permite
desplazamiento tactil. Los controles principales tienen al menos 44 px de area
tactil. Las letras y los botones son HTML real, no parte de una captura.
Las favoritas se muestran con calabazas, conservando su comportamiento anterior.

## Cambiar canciones

Editar `SONGS` en `shared.js`. Cada cancion habilitada requiere `audio`, `lyrics`
y `versions`. `lyrics` apunta a un JSON con una propiedad `lyrics` que contiene
objetos `{ "text": "Frase", "start": 12.5, "end": 15.2 }`. Los tiempos son segundos
desde el inicio del audio completo, incluso para una version corta.

Las categorias se pueden definir en el campo `categories` de cada cancion:
`criollo`, `peru`, `fiesta`, `clasicos`, `halloween`.
Actualmente solo Carinito tiene pista y tiempos; las otras canciones conservan
su estado de proximamente. Las pistas nuevas requieren los archivos respectivos.

## Cambiar el aspecto

- `karaoke.css`: estilos compartidos y reglas por orientacion/tamano.
- `controller.js`: seleccion, cambio de vista y navegacion sin recargar la pagina.
- `player.js`: reproductor compartido, montado con `mountPlayer`.
- `player-entry.js`: inicializa el modo de pantalla independiente.
- `ui.js`: iconos, favoritos y utilidades compartidas.
- `assets/decor/hallowow-wordmark.webp`: marca aislada, sin fondo ni otros adornos.
- `../Logo Samay.png`: logo original del repo, colocado como imagen independiente.
- `assets/decor/pumpkin-hat.webp`: calabaza con sombrero, independiente.
- `assets/decor/criollo-guitar.webp`: guitarra independiente.
- `assets/decor/telarana-esquina.png`: telaranas de las esquinas.
- `assets/decor/cinta-curva.webp`: cinta en canciones, pie y ventanas.
- `assets/icons/icon-halloween.png`: icono de favoritas (gris inactivo/color activo).

Las dimensiones del escenario se controlan con `--page-padding` y
`--scene-height` en `karaoke.css`. `.brandMasthead`, `.catalog`, `.playerWrap`
y `.sceneFooter` organizan las piezas. En el selector, `.playlistDecor` coloca
la calabaza y guitarra sobre los laterales de la lista, con la cinta detras.
`--playlist-inset` reserva los margenes para no tapar informacion ni controles.
El reproductor conserva su fila independiente de decoracion.
Los fondos ilustrados anteriores se conservan como archivos de referencia,
pero ya no se usan en estas dos pantallas.

Se incorporaron los fondos, adornos e iconos de Hallowow_Web_Visual_Assets.zip.
Los nuevos artes se generaron con la herramienta integrada imagegen para
aproximar el acabado de la referencia. Ver `assets/ARTWORK.md` para sus prompts.
Flexo se conserva; Lilita One y Lucide se sirven localmente con sus licencias.

## Publicacion

Se sirve directamente en GitHub Pages desde `karaoke-bcp/`, sin build ni rutas
absolutas. Para una prueba local usar un servidor HTTP de archivos estaticos con
soporte de solicitudes Range para poder adelantar el MP3. Las pruebas visuales
usan una sala aislada y simulan Firebase para no escribir en las salas reales.

## Prueba del flujo tactil

Con Playwright disponible y Chrome instalado, ejecutar
`node karaoke-bcp/tests/single-screen.cjs` contra el servidor local del puerto
5181. `KARAOKE_BASE_URL` permite indicar otra URL y `PLAYWRIGHT_CHANNEL` otro
canal de navegador. La prueba comprueba audio real, ambas versiones, regreso,
avance del historial, controles, letras y modo local sin escribir en Firebase.
