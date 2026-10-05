# Hallowow Criollazo

Selector tactil y reproductor de karaoke para Samay BCP. Ambas pantallas comparten
la sala indicada por `?room=HALLOWOW`. El selector envia la version elegida al
reproductor; este requiere un toque inicial en Activar audio. Firebase sincroniza
dispositivos diferentes y localStorage sincroniza pestanas del mismo navegador.

## Pantallas

- `index.html`: canciones, busqueda sin distinguir tildes, categorias y favoritos.
- `player.html`: audio, letras sincronizadas, pausa, anterior/siguiente,
  favoritos, aleatorio y barra tactil de progreso.
- `admin.html` y `timing-editor.html`: administracion existente.

El selector usa dos columnas en horizontal y una en vertical. El reproductor
usa ilustraciones distintas para cada orientacion y ajusta las estrofas al espacio
disponible. Los controles principales tienen al menos 44 px de area tactil.
Las letras y los botones son HTML real, no forman parte de una captura.

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
- `assets/backgrounds/selector-hero.webp`: arte de cabecera.
- `assets/backgrounds/karaoke-frame.webp`: marco vertical.
- `assets/backgrounds/karaoke-frame-landscape.webp`: marco horizontal.

Se incorporaron los fondos, adornos e iconos de Hallowow_Web_Visual_Assets.zip.
Los tres nuevos artes se generaron con la herramienta integrada imagegen para
aproximar el acabado de la referencia. Ver `assets/ARTWORK.md` para sus prompts.
Flexo se conserva; Lilita One y Lucide se sirven localmente con sus licencias.

## Publicacion

Se sirve directamente en GitHub Pages desde `karaoke-bcp/`, sin build ni rutas
absolutas. Para una prueba local usar un servidor HTTP de archivos estaticos con
soporte de solicitudes Range para poder adelantar el MP3. Las pruebas visuales
usan una sala aislada y simulan Firebase para no escribir en las salas reales.
