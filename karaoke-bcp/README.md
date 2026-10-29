# Hallowow Criollazo

## Vista publica y coros

La vista publica no tiene menus desplegables ni engranaje de configuracion.
El boton cuadrado superior derecho alterna pantalla completa (52 x 52 px).
En reproduccion, el icono de menu izquierdo vuelve directamente al selector.
Los controles de favoritos de cada cancion se conservan.

Las 28 canciones ofrecen Coro y Completa. Coro reproduce solo un intervalo del
MP3 original, con las mismas marcas de letra y compensacion Bluetooth, sin
descargar ni recomprimir otra pista. Carinito mantiene su corte anterior.
Los otros 27 fragmentos se seleccionaron por sus frases centrales; los cortes
basados en marcas automaticas siguen pendientes de revision musical al oido.

Editar `songs/chorus-selections.json` (primera y ultima entrada vocal del corte)
y ejecutar `node karaoke-bcp/scripts/build-choruses.cjs` para actualizar el catalogo.
El generador avisa si las marcas se movieron al cambiar una grabacion.
Despues, ejecutar `node karaoke-bcp/scripts/build-offline.cjs`.

La descarga offline sigue siendo automatica y su punto de estado no abre menus.
Una actualizacion descargada se aplica automaticamente en el selector, sin
dialogos abiertos; nunca recarga una cancion en curso. La descarga fallida se
reintenta hasta tres veces con espera creciente, ademas del reintento al reconectar.
Para mantenimiento y calibracion Bluetooth abrir la pagina con `?settings=1`;
el engranaje solo aparece en ese modo o en las paginas de administracion.

## Grabaciones con voz del 29/10/2026

Se reemplazaron o incorporaron 23 MP3 proporcionados por el usuario, sin convertir
ni recomprimir los archivos. Las 28 canciones del catalogo tienen ahora audio.
Carinito, Himno Nacional del Peru, La Bruja, La Llorona y Quien sera conservan las
grabaciones anteriores. El WAV de voz personal se excluyo por indicacion del usuario.

Las letras de las 23 grabaciones nuevas se contrastan con reconocimiento local de
voz y alineacion acustica: no se reparten uniformemente sobre la duracion. Los
JSON conservan `reviewRequired: true` y `status: estimated`: son marcas automaticas,
no una sincronizacion certificada al oido. Los fragmentos que no se pudieron
alinear quedan documentados, sin inventarles tiempos. Se muestra una pausa musical
en los huecos. Las repeticiones recuperadas se apoyan en palabras reconocidas.
El informe por cancion esta en `songs/VOCAL-IMPORT-20261029.json`.

Cuando hay marcas de palabras, el naranja sigue sus entradas y duraciones, incluso
en frases partidas en varias lineas. Las canciones antiguas sin marcas de palabras
conservan el barrido por frase. El retraso Bluetooth global se aplica antes de
seleccionar la frase y pintar las palabras; no cambia el tono ni la velocidad del MP3.
Cada pantalla debe calibrarse con su altavoz real desde Audio y descarga.
Esto compensa la letra respecto del sonido, no elimina la latencia del microfono
ni sincroniza dos altavoces Bluetooth que tengan retrasos distintos.

Cada grabacion tiene su SHA-256 en el informe y en sus marcas. Un cambio de pista
invalida los ajustes locales de tiempos de la version anterior. La cache sin
conexion solo reutiliza archivos cuyo hash coincide con la version actual.
Despues de actualizar, completar la descarga y aplicar la actualizacion antes
de desconectar internet; los MP3 anteriores no se mezclan con las letras nuevas.

Herramientas reproducibles: `scripts/import-vocal-tracks.json`,
`scripts/align-vocal-tracks.py`, `scripts/update-vocal-catalog.cjs` y
`scripts/build-offline.cjs`. Los TXT de `letras-para-lector/` no se modificaron.

Las secciones siguientes describen tambien etapas previas del proyecto; este
apartado y el informe fechado indican el estado actual de las grabaciones.

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
La calabaza del reproductor añade o quita la canción de Mis favoritas; su estado
y el texto de ayuda cambian al pulsarla.

## Cambiar canciones

Las letras de practica aportadas por el usuario estan respaldadas en
[`letras-para-lector/`](letras-para-lector/README.md): 27 TXT originales, sin marcas de tiempo. Sus copias sin la línea del título
están organizadas en `songs/<id>/letra.txt`. Consulta [los 5 audios pendientes](songs/PENDIENTES.md). Carinito conserva su letra en `songs/carinito/`.

Editar `SONGS` en `songs/catalog.js` (compartido por la web y el editor). Cada cancion habilitada requiere `audio`, `lyrics`
y `versions`. `lyrics` apunta a un JSON con una propiedad `lyrics` que contiene
objetos `{ "text": "Frase", "start": 12.5, "end": 15.2 }`. Los tiempos son segundos
desde el inicio del audio completo, incluso para una version corta.

Las categorias se pueden definir en el campo `categories` de cada cancion:
`criollo`, `peru`, `fiesta`, `clasicos`, `halloween`.
Hay 23 pistas disponibles: Cariñito, las siete incorporadas el 19/10/2026 y 15 MP3 aportados por el usuario.
Las cinco canciones sin audio quedan ocultas del selector.
Las 22 pistas distintas de Cariñito tienen JSON con frases y tiempos aproximados, identificados como tales en la app; requieren revisión contra cada grabación.
El Himno y La Flor de la Canela tienen marcas rehechas mediante reconocimiento de
voz y alineación de palabras sobre sus MP3 exactos. El Himno usa la sexta estrofa
que canta esa grabación. Ver [el detalle de alineación](songs/ALIGNMENT.md).
Cariñito conserva su sincronización original. Todas las otras pistas activas muestran
su letra con tiempos aproximados. Ninguna pista activa queda con un JSON vacío.
Mi Perú dura 1:27: se conserva el archivo recibido sin alargarlo.

Cada carpeta disponible `songs/<id>/` contiene `audio.mp3`, `letra.txt` y
`lyrics-timed.json`. Los TXT contienen las letras aportadas; las 5 carpetas pendientes todavía no tienen audio.
Las lineas que empiezan por `#` no se consideran letra. Las cinco canciones sin
pista conservan un JSON vacío con `status: pending`.

### Preparar letras

1. Sustituir los comentarios de `letra.txt` por la letra aportada/autorizada,
   una frase por linea y repitiendo los estribillos tal como aparecen en la pista.
2. Abrir `timing-editor.html`, elegir la cancion y cargar el TXT o pegar su texto.
   El engranaje del reproductor incluye un acceso al editor de la canción actual.
   Tocar la onda reproduce desde ese punto; las flechas mueven un segundo y
   Escuchar frase empieza un poco antes de la marca seleccionada.
3. Aplicar la letra, reproducir el audio y marcar cada entrada. Los ajustes de
   0.1 segundos, deshacer y velocidad ayudan a revisar las marcas.
   Rehacer marcas elimina las marcas aproximadas para poder registrarlas de nuevo,
   conservando la letra. Deshacer recupera las marcas anteriores.
4. Descargar `lyrics-timed.json` y reemplazar el de esa misma carpeta en GitHub.
   Cambiar `lyricsStatus` a `timed` en el catalogo cuando se haya revisado.

El editor guarda borradores separados por cancion en este navegador; no modifica
el repo ni publica archivos automaticamente. Rechaza una exportacion incompleta
o con tiempos fuera de orden. TXT por si solo no proporciona sincronizacion;
una pista sin voz tampoco determina las entradas exactas de las palabras.
El reproductor respeta el final de cada frase y muestra una pausa musical durante
los intervalos que no tienen letra, incluidos introducciones e intermedios.
La reproducción solo carga el audio seleccionado. La descarga sin conexión guarda
además todas las pistas disponibles en segundo plano.

## Uso sin internet

Abrir la página una vez con internet mediante HTTPS (o localhost para desarrollo)
y mantenerla abierta hasta que el punto de la esquina inferior derecha esté verde.
La descarga actual ocupa aproximadamente 94 MB e incluye las cuatro pantallas,
imágenes, fuentes, letras, la prueba de sincronización y los 23 MP3 disponibles.
El punto rojo parpadea durante la descarga; al tocarlo se ve el progreso o el error
y se puede reintentar. Un archivo faltante impide confirmar el estado verde.
Se guardan 120 recursos usados por la app, incluidas las licencias. Las imágenes
de referencia y los respaldos que no usan las pantallas permanecen en el repositorio,
sin ampliar la descarga offline. Una actualización lista se puede aplicar desde
el menú sin borrar los MP3 ni las preferencias.

La descarga verifica tamaño y SHA-256 de cada archivo. Si se interrumpe, conserva
los archivos completos y continúa con los pendientes. Las actualizaciones reutilizan
archivos sin cambios y solo eliminan la caché anterior al completar la nueva.
El navegador guarda los archivos para ese sitio, perfil y dispositivo. Si se borran
los datos del sitio, hay que descargarlos otra vez. El botón de reintento solicita
almacenamiento persistente cuando el navegador lo permite.

Sin internet funcionan el selector, las pistas, las letras, favoritas, editor,
ajustes y administración entre pestañas del mismo navegador. La sincronización
de sala entre dispositivos mediante Firebase necesita conexión. La app local no
depende de descargar Firebase para arrancar.

Después de cambiar archivos de la app o incorporar pistas, ejecutar
`node karaoke-bcp/scripts/build-offline.cjs` y guardar también `offline-assets.json`
y `sw.js`. El generador conserva rutas relativas para GitHub Pages.

## Calibrar Bluetooth

El botón de engranaje de la esquina inferior izquierda abre Audio y descarga.
Conectar el altavoz, pulsar Reproducir prueba y ajustar hasta que el pitido y el
destello coincidan. La pista original tiene seis pitidos de 880 Hz, en los segundos
2 a 7, con bordes suaves; el círculo sigue el mismo reloj del audio y la compensación.
Al iniciar la prueba se pausa la canción; al cerrar el menú se detiene la prueba.

Un valor positivo retrasa la letra y el destello, para compensar un altavoz que
suena tarde; uno negativo los adelanta. El intervalo es de −1500 a +2500 ms, con
pasos de 10 ms y botones de 50 ms. Se aplica al instante sin modificar el MP3 ni
sus marcas, y se guarda en ese navegador. Restablecer vuelve a 0 ms.
El ajuste es global para ese dispositivo; no corrige los tiempos aproximados de
cada frase de las pistas pendientes de revisión.

### Ajuste rápido por canción

En el mismo menú, desplegar Ajuste rápido de esta canción. Primera frase aquí
coloca la entrada inicial en el punto escuchado; Fin de letra aquí fija el final.
También se pueden escribir los segundos. La app acomoda las frases intermedias
dentro de ese tramo y conserva el Bluetooth global por separado. Este ajuste es
aproximado: no identifica repeticiones ni corrige cada frase individual.

Se guarda solo en el navegador y para esa canción. No modifica el TXT ni el JSON
del repositorio. Restablecer esta canción elimina el ajuste local. Si cambia la
duración o los extremos del archivo de letras publicado, el ajuste anterior se
descarta para evitar aplicarlo sobre otra versión.

### Rendimiento

El reproductor deja de solicitar animaciones al pausarse, ocultarse o volver al
selector. Mientras reproduce, actualiza el barrido hasta 30 veces por segundo y
evita consultar el almacenamiento o buscar nodos del DOM en cada cuadro. Las
letras se reutilizan al cambiar de canción y volver. El audio offline usa trozos
de Blob y conserva como máximo dos pistas recientes para resolver avances sin
crear un ArrayBuffer completo en cada solicitud Range.

La prueba se puede regenerar con
`node karaoke-bcp/scripts/generate-calibration.cjs`; después regenerar el manifiesto.
`tests/offline-bluetooth.cjs` comprueba descarga completa, recarga sin internet,
las 23 pistas, solicitudes Range, recuperación de un archivo perdido, pantallas
no visitadas, calibración y persistencia del retraso.

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
