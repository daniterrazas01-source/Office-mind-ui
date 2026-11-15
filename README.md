# Oficina · Monitoreo (pixel art)

La oficina de siempre (misma planta, mismos monitos, mismas viñetas), copiada de
`KALLEROS/oficina-cloud-monitoreo`, con dos reglas nuevas sobre quién aparece:

- **Supervisores (★)**: los eliges tú en `config/oficina.json`. Nunca se van. Si su sesión no reporta, se quedan dormidos esperando instrucciones (los de la tableta, en la Oficina Terrazas).
- **Visitantes**: cualquier otra sesión. Entran caminando cuando la usas, van al cuarto que toca según lo que hacen y pasan a Descanso cuando paran. A las **24 horas sin actividad** salen de la oficina. En sus últimas 3 horas el gafete dice “se va en X h”.

Solo muestra; no edita nada.

## Dónde verla

| | Enlace | Qué muestra |
|---|---|---|
| **En Claude** (Artifact) | https://claude.ai/artifact/KbxrcsXckzZSE5F65iZwCE | Todas tus sesiones de Claude Code (compu, tableta, teléfono, nube), leídas con tu propia cuenta. Privada: solo tú la abres. |
| **Página web / app** | https://daniterrazas01-source.github.io/Office-mind-ui/ | Lo que publican la laptop de Calleros y la tableta, igual que la oficina anterior. Se instala como app: en Chrome, menú ⋮ → *Instalar app* (iPhone: Compartir → *Agregar a inicio*). |
| **En la compu** | `iniciar_oficina.bat`, o `node collector/recolector.mjs --servir` y abrir `http://localhost:8765/oficina.html` | Las sesiones de Claude Code de esa computadora. |

Datos de ejemplo: agrega `?demo` (o `#demo`) al final de la dirección. Pruebas: `npm test`. Solo necesita Node 18 o más nuevo.

Para volver a publicar: la página web sale de la rama `gh-pages`; el Artifact se arma con `node tools/armar_artefacto.mjs`.

## Elegir supervisores

En el Artifact se eligen desde la página: toca un monito y pica **★ Hacer supervisor**. Queda guardado para todos tus aparatos.

En la página web y en la compu, cada supervisor de `config/oficina.json` se amarra a sus sesiones con una de estas llaves:

| Llave | Ejemplo | Agarra |
|---|---|---|
| `id` | `"calleros"` | la sesión que reporta exactamente ese id |
| `proyecto` | `"dragtrim"` | cualquier sesión abierta en una carpeta con ese nombre |
| `titulo` | `"dragtree"` | sesiones cuyo nombre o título contiene ese texto |

Un supervisor es un solo monito: si tiene varias sesiones, muestra la más reciente y las demás no salen como visitantes. `modelo`, `dispositivo` y `persona` dicen cómo se ve mientras no tiene sesión (`"dispositivo": "tableta-android"` lo deja en la Oficina Terrazas).

`venceHoras` (24) y `avisoHoras` (3) cambian el plazo de los visitantes.

## Monitos con tarea programada (◆)

Son permanentes, como los supervisores, pero trabajan solos: cada uno es una tarea programada de Claude que corre cuando le toca, deja su resumen en la base del Artifact y aquí se lee. Viven en un cuarto, salen a trabajar, y avisan con una viñeta cuando traen resumen nuevo. Al tocarlos sale el resumen y los anteriores. En el Artifact se leen de su base; en la página web, del archivo público `monitos.json` de la rama `datos`, que la misma tarea actualiza con `publicar.py`.

El primero es **Nitro**: noticias de arrancones, diario a las 7:23 a.m. (hora de la Ciudad de México).

Entre tarea y tarea no se quedan quietos: cada pocos minutos cambian de plan. A veces hacen algo por su cuenta (el campo `rutina` de su ficha: lista de `{ area, actividad }`), a veces se quedan en su lugar y a veces se van a Descanso, donde también se pasean. Eso es ambiente; la tarea de verdad es la programada.

Para agregar otro, desde cualquier sesión de Claude Code en la nube:

1. Crear su ficha en la base del Artifact, colección `monitos`, con `ArtifactData`: `nombre`, `descripcion`, `casa` (cuarto donde vive: `terrazas`, `descanso`, `calleros`…), `aspecto` (`gorra_roja`, `lentes`, `audifonos`, `bufanda`, `moño`…), `modelo`, `horario` (texto para leer), `frases` (lo que dice de vez en cuando), `estado: "listo"`.
2. Crear la tarea programada (`create_trigger`, sesión nueva en cada corrida) con un mensaje como el de Nitro: avisar `estado: "trabajando"` con su `area` y `actividad`, hacer el trabajo, guardar el resumen en `monitos/<id>/reportes/<AAAA-MM-DD>` (`titulo`, `fecha`, `intro`, `puntos[]` con `titulo`, `resumen`, `fuente`, `url`, `cierre`, `creado`) y terminar con `estado: "listo"`.

## Memoria, archivo y pantalla

Tres cuartos trabajan con lo que dejan los monitos programados. Los tres se pueden tocar:

- **Centro de Pensado (memoria).** La computadora guarda las notas de `monitos/<id>/memoria` (`pendientes`, `ya-contado`, `fuentes`). El monito las lee al empezar su tarea y las actualiza al terminar; así recuerda de un día para otro aunque cada corrida sea una sesión nueva.
- **Almacén (archivo).** Guarda los resúmenes de cada día (`monitos/<id>/reportes/<AAAA-MM-DD>`). En los anaqueles hay una caja por día guardado.
- **Sala de Noticias (pantalla).** Cambia cada 5 minutos, y una de cada dos veces muestra una noticia del día (las del último resumen; si tiene menos de 24 horas dice «NOTICIA DE HOY»). Lo demás se turna: cápsulas, tareas y pendientes de cada monito, y avisos de la oficina (colección `avisos`: `titulo`, `texto`, `creado`). Cada 20 minutos, el monito que trae la noticia la presenta un rato junto a la pantalla. El orden está en `src/pantalla.js`.

Para anunciar un cambio de la oficina en la pantalla, agrega un documento a `avisos` con `ArtifactData`.

La página web recibe todo esto con el **mensajero**: una segunda tarea programada (7:38 a.m.) que copia la base del Artifact a `monitos.json` en la rama `datos` (monitos, resúmenes, memoria, avisos y envíos).

## El periférico y los envíos

El periférico es una sola línea que recorre la oficina de arriba a abajo: sale de **Internet**, cruza el pasillo 1, pasa por debajo de la **Sala de Juntas**, cruza el pasillo 2, baja entre la **Oficina Calleros** y el **Cerebro Delta**, sigue por el **túnel central** (su parte ancha, en el gran pasillo), cruza el pasillo 4, pasa por debajo del cuarto libre de en medio y termina en la **Ampliación**. Se ve como un canal con tapa de vidrio en el piso; debajo de los muros no se ve. De él salen ramales cortos a Calleros, Cerebro Delta, **Oficina Terrazas**, **Centro de Pensado** (que también atiende al almacén) y **Sala de Noticias**. En cada uno hay una **estación** con buzón: siete en total.

Los supervisores y los monitos con tarea programada (los que nunca se van) también lo usan para moverse: cuando les queda más corto, caminan a la estación de su cuarto, viajan como cápsula y salen por la estación de destino.

Los pasillos 1 y 2 son de cuatro casillas de ancho. El mapa se escribió con dos y se le agregaron filas: lo de siempre sigue escrito con sus medidas de antes y se dibuja recorrido (`FILA()`, `PY()`, `enBandas()` en `oficina.html`); el periférico y sus estaciones ya usan las medidas de ahora.

La **Ampliación** es la zona grande de hasta abajo, en obra y sin cuartos.

Un **envío** es algo que un monito o una sesión le manda a otro cuarto. Se escribe en uno de dos lugares:

- En el campo `envios` del resumen del día de un monito (`monitos/<id>/reportes/<AAAA-MM-DD>`): una lista de `{ para, tipo, titulo, texto, url }`, más `enviado` con la hora. Salen del cuarto donde vive el monito. Así lo hace Nitro, y así llegan también a la página web, porque el mensajero ya copia los resúmenes.
- Como documento suelto en la colección `envios` de la base del Artifact, para cualquier sesión:

```json
{ "de": "terrazas", "para": "almacen", "tipo": "archivo", "autor": "Nitro",
  "titulo": "Resumen del 15 de noviembre", "texto": "…", "url": "", "creado": "2026-11-15T13:30:00Z" }
```

- `de` y `para`: `internet`, `calleros`, `cerebro delta`, `terrazas`, `centro de pensado` (o `almacen`, `memoria`), `noticias` y `ampliacion`. Si falta `de`, sale del cuarto donde vive el `autor`; los de tipo `noticias` de un resumen salen de Internet.
- `tipo`: `archivo`, `nota`, `noticias`, `aviso` o `dato`. Cambia el dibujo del paquete.
- Cuando el envío es nuevo (menos de 15 minutos), el paquete se ve viajar por el periférico. Al abrir la oficina también se repite una vez el viaje de lo que llegó en el último día y sigue sin leerse.
- La estación de destino levanta su banderita y prende el foquito verde hasta que se toca y se lee el buzón. Cada tarjeta trae «▶ Ver el viaje» para repetirlo. Al tocar el tronco sale la lista de todos los envíos.
- Un monito cuya actividad menciona el túnel o el buzón se para en la estación de su cuarto.

La oficina no inventa envíos: solo muestra los que están en la base. Nitro manda cuatro al terminar su ronda (resumen al almacén, titulares a la Sala de Noticias, lo más importante a la Oficina Calleros y, si lo hay, un dato al Cerebro Delta). Cualquier sesión de Claude con la herramienta `ArtifactData` puede mandar uno suelto escribiendo en `envios`. La geometría y las reglas están en `src/tunel.js`, con pruebas.

Pendiente: los envíos sueltos (colección `envios`) se ven en el Artifact, pero en la página web solo cuando el mensajero copie esa colección. `publicar.py` ya la sabe leer; falta agregarle a la tarea del mensajero el inciso `d) action "query", collection "envios", query {"order_by": {"field": "creado", "direction": "desc"}, "limit": 40}` y el inciso `e) action "list", collection "visitas"` (las sesiones con pase). Eso solo se puede pedir desde la conversación del mensajero.

## Sesiones con pase

El Artifact muestra solas las sesiones de Claude Code en la nube y las de Remote Control. Para cualquier otra, el botón **＋ Sesión** de la oficina da un texto (el pase) que se pega como mensaje en esa sesión. La sesión se registra escribiendo un documento en la colección `visitas` de la base del Artifact (`nombre`, `area`, `actividad`, `estado`, `modelo`, `equipo`, `sesion`, `actualizado`) y lo actualiza cuando cambia de tarea. La oficina la muestra como visitante: trabajando hasta media hora después de su último aviso, y se va a las 24 horas. Si dice de qué sesión es (`sesion`) y esa ya salía sola, no se duplica. Sirve en sesiones que tengan la herramienta `ArtifactData`. Las reglas están en `src/sesiones.js` (`agenteDeVisita`, `conVisitas`), con pruebas.

## Relevo para la página web

`relevo/` trae armado, sin instalar, el servicio de Cloudflare que deja que la página web vea todas las sesiones. Los pasos están en `relevo/INSTALAR.md`.

## Cómo funciona

- `oficina.html` es la oficina. Lee el estado cada 2 s en la laptop y cada 15 s desde el teléfono.
- `src/reglas.js` decide quién se ve: supervisores fijos y visitantes sin vencer. Son funciones puras con pruebas en `test/`.
- `src/sesiones.js` traduce la lista de sesiones de Claude Code a monitos; el Artifact la pide cada 30 s con el conector «Claude Code Remote» de quien lo abre. Solo lee.
- `collector/recolector.mjs` lee las sesiones de Claude Code de la computadora (`~/.claude/projects`) y arma `estado.json`: un monito por sesión, con su cuarto, lo que hace, su modelo y su última actividad.
- El **túnel subterráneo** une la Oficina Terrazas con el Centro de Pensado: quien va de un cuarto al otro baja por la escotilla y sale por la otra. Por el **túnel central** viajan los envíos (ver arriba).
- `para-dragtrim/` es el aviso de la tableta (hook de Claude Code). Ahora conserva las sesiones 24 h en vez de 30 min, para que la oficina decida cuándo se van.
- Desde el teléfono (GitHub Pages) la página lee los mismos archivos públicos que antes; se pueden cambiar con `"nube": { "estado": "…", "terrazas": "…" }` en la configuración.
