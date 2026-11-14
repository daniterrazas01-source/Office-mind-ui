# Office Mind

Oficina en pixel art donde se ven tus sesiones de Claude Code.

- **Supervisores**: los eliges tú en `config/oficina.json`. Nunca se van. Si su sesión no está activa, se quedan dormidos en su escritorio.
- **Visitantes**: cualquier otra sesión. Llegan cuando la usas, se sientan en un escritorio mientras trabajan o te esperan, y se pasan al sillón cuando descansan. Si pasan **24 horas sin actividad**, se van de la oficina. En sus últimas 3 horas se ven transparentes.

## Usarla

```
node collector/recolector.mjs --servir     # tus sesiones reales, en http://localhost:4321
node collector/recolector.mjs --servir --demo   # datos de ejemplo
npm test                                   # prueba las reglas de supervisores y vencimiento
```

Solo necesita Node 18 o más nuevo; no hay que instalar nada.

## Elegir supervisores

En `config/oficina.json`, cada supervisor se amarra a sus sesiones por una de estas llaves:

| Llave | Ejemplo | Agarra |
|---|---|---|
| `proyecto` | `"dragtrim"` | cualquier sesión abierta en una carpeta con ese nombre |
| `id` | `"1cf51097-…"` | exactamente esa sesión |
| `titulo` | `"oficina"` | sesiones cuyo título contiene ese texto |

Si un supervisor tiene varias sesiones, se muestra la más reciente y las demás no salen como visitantes.

Otros ajustes del mismo archivo: `venceHoras` (24), `activoMinutos` (5, cuánto dura “trabajando” después de la última actividad) y `avisoHoras` (3, cuándo empieza a desvanecerse).

## Cómo funciona

- `collector/recolector.mjs` lee `~/.claude/projects/*/*.jsonl` y arma `estado.json` (título, proyecto, estado y última actividad de cada sesión). No decide quién es supervisor; solo reporta.
- `src/roster.js` tiene las reglas: quién es supervisor, quién es visitante, quién ya venció. Son funciones puras con pruebas en `test/`.
- `src/oficina.js` dibuja la escena; `src/main.js` lee `estado.json` cada 10 s.
- Sin recolector (por ejemplo, abierta desde GitHub Pages) la página muestra el demo. `?demo` lo fuerza y `?estado=<url>` lee el estado de otro lado.

Para guardar el estado en un archivo cada 10 s, en vez de servir la página:

```
node collector/recolector.mjs --salida estado.json --cada 10
```
