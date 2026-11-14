# Oficina · Monitoreo (pixel art)

La oficina de siempre (misma planta, mismos monitos, mismas viñetas), copiada de
`KALLEROS/oficina-cloud-monitoreo`, con dos reglas nuevas sobre quién aparece:

- **Supervisores (★)**: los eliges tú en `config/oficina.json`. Nunca se van. Si su sesión no reporta, se quedan dormidos esperando instrucciones (los de la tableta, en la Oficina Terrazas).
- **Visitantes**: cualquier otra sesión. Entran caminando cuando la usas, van al cuarto que toca según lo que hacen y pasan a Descanso cuando paran. A las **24 horas sin actividad** salen de la oficina. En sus últimas 3 horas el gafete dice “se va en X h”.

Solo muestra; no edita nada.

## Abrirla

- **Windows:** doble clic en `iniciar_oficina.bat`.
- **Cualquier sistema:** `node collector/recolector.mjs --servir` y abre `http://localhost:8765/oficina.html`.
- **Datos de ejemplo:** agrega `--demo` al comando, o `?demo` al final de la dirección.
- **Pruebas de las reglas:** `npm test`.

Solo necesita Node 18 o más nuevo; no hay que instalar nada.

## Elegir supervisores

Cada supervisor de `config/oficina.json` se amarra a sus sesiones con una de estas llaves:

| Llave | Ejemplo | Agarra |
|---|---|---|
| `id` | `"calleros"` | la sesión que reporta exactamente ese id |
| `proyecto` | `"dragtrim"` | cualquier sesión abierta en una carpeta con ese nombre |
| `titulo` | `"dragtree"` | sesiones cuyo nombre o título contiene ese texto |

Un supervisor es un solo monito: si tiene varias sesiones, muestra la más reciente y las demás no salen como visitantes. `modelo`, `dispositivo` y `persona` dicen cómo se ve mientras no tiene sesión (`"dispositivo": "tableta-android"` lo deja en la Oficina Terrazas).

`venceHoras` (24) y `avisoHoras` (3) cambian el plazo de los visitantes.

## Cómo funciona

- `oficina.html` es la oficina. Lee el estado cada 2 s en la laptop y cada 15 s desde el teléfono.
- `src/reglas.js` decide quién se ve: supervisores fijos y visitantes sin vencer. Son funciones puras con pruebas en `test/`.
- `collector/recolector.mjs` lee las sesiones de Claude Code de la computadora (`~/.claude/projects`) y arma `estado.json`: un monito por sesión, con su cuarto, lo que hace, su modelo y su última actividad.
- `para-dragtrim/` es el aviso de la tableta (hook de Claude Code). Ahora conserva las sesiones 24 h en vez de 30 min, para que la oficina decida cuándo se van.
- Desde el teléfono (GitHub Pages) la página lee los mismos archivos públicos que antes; se pueden cambiar con `"nube": { "estado": "…", "terrazas": "…" }` en la configuración.
