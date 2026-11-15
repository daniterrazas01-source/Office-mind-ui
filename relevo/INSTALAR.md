# Relevo: que la página web vea todas las sesiones

**Estado: armado y probado en local, sin instalar.** Falta desplegarlo en Cloudflare desde una computadora. Estas instrucciones están escritas para que las siga una persona o cualquier asistente de IA con acceso a una terminal.

## Para qué es

La página web (`https://daniterrazas01-source.github.io/Office-mind-ui/`) solo puede leer lugares públicos. Hoy lee dos: lo que publica la laptop y lo que publica el repositorio `dragtrim`. Una sesión abierta sin repositorio no aparece.

El relevo es un servicio chiquito en Cloudflare. Cada sesión de Claude Code le avisa qué hace (con un hook) y la página lo lee de ahí. El Artifact de claude.ai no lo necesita: ya ve todas las sesiones.

```
sesión de Claude  --hook-->  POST /aviso (con llave)  -->  worker  <--  GET /estado  <--  página web
```

## Archivos

| Archivo | Qué es |
|---|---|
| `worker.js`, `wrangler.toml` | El servicio. `GET /estado` público, `POST /aviso` con llave. |
| `oficina_aviso.py` | El hook que avisa. Sirve en laptop y en la nube. Solo usa la biblioteca estándar de Python. |
| `hooks.json` | El bloque de hooks que va en `~/.claude/settings.json`. |

Pruebas: `npm test` (corre el worker con un Cloudflare simulado y el hook contra un servidor local).

## Paso 1. Desplegar el worker (una vez, en la computadora)

Requiere Node y una cuenta de Cloudflare (la gratuita alcanza).

```
cd relevo
npx wrangler login
npx wrangler deploy
npx wrangler secret put ESCRITURA
```

- `deploy` imprime la dirección, parecida a `https://oficina-relevo.TU-CUENTA.workers.dev`. Anótala: es `URL` en los pasos siguientes.
- `secret put ESCRITURA` pide la llave. Usa una larga y al azar, por ejemplo la salida de `python -c "import secrets;print(secrets.token_urlsafe(32))"`. Anótala: es `LLAVE`. No la subas al repositorio ni la pegues en un chat.

Comprobar: abrir `URL/estado` en el navegador debe mostrar `{"actualizado":"…","agentes":[],"archivos_recientes":[]}`.

## Paso 2. Decirle a la página dónde está

En `config/oficina.json`, agregar (junto a `venceHoras`):

```json
"nube": { "relevo": "URL" }
```

Subir el cambio a las ramas `ccr-7561cbad-oyw73d` y `gh-pages`. La URL no es secreta.

## Paso 3. Poner el hook en la laptop

Aplica a todas las sesiones de Claude Code de esa computadora, en cualquier carpeta.

1. Copiar `oficina_aviso.py` a `~/.claude/oficina_aviso.py` (en Windows: `C:\Users\TU-USUARIO\.claude\`).
2. Crear `~/.claude/oficina_relevo.json`:
   ```json
   { "url": "URL", "llave": "LLAVE", "equipo": "Calleros — Laptop", "dispositivo": "laptop" }
   ```
3. Mezclar el contenido de `hooks.json` dentro de `~/.claude/settings.json`, sin borrar lo que ya tenga. En Windows, si `python3` no existe, cambiar el comando a `py "%USERPROFILE%\.claude\oficina_aviso.py"`.
4. Abrir una sesión nueva de Claude Code, pedirle cualquier cosa y revisar que aparezca en `URL/estado`.

El programa anterior de `C:\claude-office` puede seguir corriendo; si los dos avisan, Calleros saldría dos veces. Para evitarlo, apagar el anterior cuando el hook ya funcione.

## Paso 4. Poner el hook en las sesiones de la nube (tableta y teléfono)

Esto cambia el entorno **Default** de Claude Code en la nube, o sea, todas las sesiones futuras. Se hace desde una sesión de la nube con las herramientas de entorno (cada una pide aprobación):

1. **Permitir el host del worker** en la red del entorno (`update_environment`, `add_allowed_hosts`: el dominio de `URL`, sin `https://`).
2. **Guardar la llave como secreto de red** para ese host (`request_credential`, tipo bearer). Así la llave no queda escrita en ningún archivo: el proxy la pone sola en cada aviso.
3. **Variables de entorno** (`update_environment`, `set_environment_variables`): `OFICINA_RELEVO_URL` = `URL`, `OFICINA_DISPOSITIVO` = `android`, `OFICINA_EQUIPO` = `Android`. Ninguna es secreta.
4. **Script de arranque** (`update_environment`, `setup_script`) que deje el hook instalado en cada contenedor nuevo. Tiene que ser a prueba de fallos, porque un script que falla impide abrir sesiones. Probarlo a mano antes de guardarlo. Idea:
   ```bash
   mkdir -p ~/.claude && curl -fsSL https://raw.githubusercontent.com/daniterrazas01-source/Office-mind-ui/gh-pages/relevo/oficina_aviso.py -o ~/.claude/oficina_aviso.py || true
   ```
   y un paso que mezcle `hooks.json` en `~/.claude/settings.json` si todavía no está.

**Sin verificar:** no se ha comprobado que una sesión de la nube lea hooks desde `~/.claude/settings.json`. Antes de guardar el script, probarlo en una sesión: escribir el archivo, abrir otra sesión y ver si llega un aviso a `URL/estado`. Si no los lee, la alternativa es poner `.claude/settings.json` y el hook dentro de cada repositorio (como ya se hace en `dragtrim`); en ese caso las sesiones sin repositorio seguirán sin aparecer en la página web.

## Notas

- La página aplica las reglas (supervisores, 24 horas); el relevo solo guarda lo último de cada sesión y limpia lo que pase de 48 horas.
- Lo que viaja: título de la sesión, carpeta, lo que está haciendo y nombres de archivos editados. Queda legible para cualquiera que conozca la URL. Si eso no conviene, no instalar.
- Un aviso de "esperando" no reinicia el plazo de 24 horas.
