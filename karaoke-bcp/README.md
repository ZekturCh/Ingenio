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

Las letras de practica aportadas por el usuario estan respaldadas en
[`letras-para-lector/`](letras-para-lector/README.md): 27 TXT independientes del
reproductor, sin marcas de tiempo. Carinito conserva su letra en `songs/carinito/`.

Editar `SONGS` en `songs/catalog.js` (compartido por la web y el editor). Cada cancion habilitada requiere `audio`, `lyrics`
y `versions`. `lyrics` apunta a un JSON con una propiedad `lyrics` que contiene
objetos `{ "text": "Frase", "start": 12.5, "end": 15.2 }`. Los tiempos son segundos
desde el inicio del audio completo, incluso para una version corta.

Las categorias se pueden definir en el campo `categories` de cada cancion:
`criollo`, `peru`, `fiesta`, `clasicos`, `halloween`.
Hay ocho pistas disponibles: Carinito y las siete incorporadas el 19/10/2026.
Solo Carinito tiene letra sincronizada. Las siete nuevas permiten reproducir la
pista completa y muestran su letra como pendiente; no se han inventado coros ni
marcas. Mi Peru dura 1:27: se conserva el archivo recibido sin alargarlo.

Cada carpeta `songs/<id>/` contiene `audio.mp3`, `letra.txt` y
`lyrics-timed.json`. Los TXT nuevos son plantillas comentadas, no letras completas.
Las lineas que empiezan por `#` no se consideran letra. El archivo JSON permanece
vacio con `status: pending` hasta disponer de marcas verificadas.

### Preparar letras

1. Sustituir los comentarios de `letra.txt` por la letra aportada/autorizada,
   una frase por linea y repitiendo los estribillos tal como aparecen en la pista.
2. Abrir `timing-editor.html`, elegir la cancion y cargar el TXT o pegar su texto.
3. Aplicar la letra, reproducir el audio y marcar cada entrada. Los ajustes de
   0.1 segundos, deshacer y velocidad ayudan a revisar las marcas.
4. Descargar `lyrics-timed.json` y reemplazar el de esa misma carpeta en GitHub.
   Cambiar `lyricsStatus` a `timed` en el catalogo cuando se haya revisado.

El editor guarda borradores separados por cancion en este navegador; no modifica
el repo ni publica archivos automaticamente. Rechaza una exportacion incompleta
o con tiempos fuera de orden. TXT por si solo no proporciona sincronizacion;
una pista sin voz tampoco determina las entradas exactas de las palabras.
La web solo carga el audio seleccionado, no todas las pistas a la vez.

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
La reproduccion adapta su densidad al alto disponible: en ventanas bajas o casi
cuadradas compacta las marcas y agrupa metadatos y controles en horizontal cuando
caben. Las letras priorizan la frase actual y reducen las lineas de contexto si
falta espacio, sin invadir la marca ni los controles.
Los fondos ilustrados anteriores se conservan como archivos de referencia,
pero ya no se usan en estas dos pantallas.

En reproduccion, Hallowow y Samay permanecen apilados en todas las orientaciones.
El bloque de marca cruza ligeramente el borde superior de la zona de letras; su zona
de superposicion queda reservada en el padding de la letra. Las variables
`--brand-row`, `--wordmark-width`, `--samay-width` y `--brand-overlap` controlan
este encaje y se compactan segun el alto disponible, sin alterar el selector.

Desde el 23/10/2026, la reproduccion no usa una franja negra: las letras quedan
sobre el fondo original, sin rectangulo, franja, panel, sombras ni halos. La escena
mantiene su luminosidad original: no hay una capa que oscurezca toda la pantalla.
La familia completa aportada en `FLEXO (1).zip` esta en `assets/fonts/flexo/`;
`flexo.css` declara sus 16 variantes bajo el nombre `Flexo Karaoke`. La frase
actual usa Heavy (800), las siguientes Demi (600) y la anterior Regular (400).
El texto base es oscuro y el barrido sincronizado naranja `#d94b00`.
Solo se descargan los pesos utilizados.

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
