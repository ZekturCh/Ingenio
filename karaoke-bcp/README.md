# Hallowow Criollazo

Selector tactil y reproductor de karaoke para Samay BCP. Ambas pantallas comparten
la sala indicada por `?room=HALLOWOW`. El selector envia la version elegida al
reproductor; este requiere un toque inicial en Activar audio. Firebase sincroniza
dispositivos diferentes y localStorage sincroniza pestanas del mismo navegador.

## Pantallas

- `index.html`: canciones, busqueda sin distinguir tildes y favoritos.
- `player.html`: audio, letras sincronizadas, pausa, anterior/siguiente,
  favoritos, aleatorio y barra tactil de progreso.
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
- `controller.js`, `player.js`: interacciones de cada pantalla.
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
y `.sceneFooter` tienen areas propias: los adornos no bloquean controles.
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
