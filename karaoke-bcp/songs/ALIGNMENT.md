# Marcas revisadas contra audio

El 25/10/2026 se analizó localmente el audio exacto del repositorio. Los modelos de
reconocimiento de voz y alineación de palabras permitieron mejorar estas dos pistas;
los JSON conservan `status: estimated` y `reviewRequired: true` porque todavía
requieren una revisión humana al oído.

- **Himno Nacional del Perú:** la grabación contiene la sexta estrofa. Se reemplazó
  la primera estrofa en la letra activa, se incorporaron las repeticiones del coro
  y se alinearon 45 frases. Primera entrada aproximada: 4,58 s; estrofa: 53,58 s;
  regreso del coro: 108,46 s. El TXT original de práctica queda conservado en
  `letras-para-lector/`, como respaldo del texto aportado.
- **La Flor de la Canela:** 40 frases alineadas con las entradas vocales de esta
  grabación. Primera entrada aproximada: 26,84 s. Se mantuvo el texto aportado.

Los intervalos sin frase se muestran como una pausa musical. Las probabilidades
guardadas son valores del modelo, no garantías de precisión. Cada JSON registra el
SHA-256 de la pista usada para impedir confundir sus marcas con otra versión.

En las otras pistas no se sustituyen las marcas por transcripciones de baja
confianza: varias no tienen una voz utilizable para alinear palabras; otras solo
permiten reconocer fragmentos. Sus marcas anteriores siguen siendo aproximadas.
La forma de onda del editor muestra el sonido completo y ayuda a escuchar tramos y
marcar entradas manualmente. No distingue por sí sola una entrada vocal.
