#!/usr/bin/env node
// Recolector de la oficina.
// Lee las sesiones de Claude Code de esta computadora (~/.claude/projects/*/*.jsonl)
// y arma estado.json en el formato de la oficina: un monito por sesión, con su
// cuarto, lo que hace, su modelo y su última actividad. Las reglas de supervisores
// y vencimiento viven en src/reglas.js; aquí solo se reporta lo que hay.
//
// Uso:
//   node collector/recolector.mjs                 imprime el estado una vez
//   node collector/recolector.mjs --salida estado.json [--cada 10]
//   node collector/recolector.mjs --servir [--puerto 8765] [--demo]
//
// Opciones: --carpeta <ruta de projects>  --equipo <nombre>  --dias <n>

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { estadoDemo } from '../src/demo.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function leerArgs(argv) {
  const a = { puerto: 8765, dias: 2, cada: 0 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => argv[++i];
    if (k === '--servir') a.servir = true;
    else if (k === '--demo') a.demo = true;
    else if (k === '--salida') a.salida = v();
    else if (k === '--cada') a.cada = Number(v());
    else if (k === '--puerto') a.puerto = Number(v());
    else if (k === '--carpeta') a.carpeta = v();
    else if (k === '--equipo') a.equipo = v();
    else if (k === '--dias') a.dias = Number(v());
    else if (k === '--ayuda' || k === '-h') a.ayuda = true;
  }
  a.carpeta ??= path.join(os.homedir(), '.claude', 'projects');
  a.equipo ??= os.hostname();
  return a;
}

function textoDe(contenido) {
  if (typeof contenido === 'string') return contenido;
  if (Array.isArray(contenido)) {
    const t = contenido.find((c) => c && c.type === 'text');
    return t ? t.text : '';
  }
  return '';
}

function recortar(t, n = 60) {
  const limpio = String(t).replace(/\s+/g, ' ').trim();
  return limpio.length > n ? `${limpio.slice(0, n - 1)}…` : limpio;
}

// A qué cuarto va el monito según la herramienta que usa (igual que el aviso de la tableta).
const QUE = {
  Read: ['biblioteca', 'Leyendo {f}'], Grep: ['biblioteca', 'Buscando en el código'],
  Glob: ['biblioteca', 'Buscando archivos'], Write: ['escritorio', 'Creando {f}'],
  Edit: ['escritorio', 'Editando {f}'], NotebookEdit: ['escritorio', 'Editando {f}'],
  WebSearch: ['internet', 'Buscando en internet'], WebFetch: ['internet', 'Leyendo una página'],
  Agent: ['sala de juntas', 'Pidiendo ayuda a un ayudante'], Task: ['sala de juntas', 'Pidiendo ayuda a un ayudante'],
};
const MIN = 60 * 1000;
const TOPE_HERRAMIENTA = 30 * MIN;   // una herramienta puede tardar; pasado esto se da por detenida
const TOPE_RESPUESTA = 10 * MIN;     // lo mismo mientras Claude piensa su respuesta

function queHace(tool) {
  const inp = tool.input || {};
  const ruta = inp.file_path || inp.notebook_path || '';
  const f = ruta ? path.basename(String(ruta).replace(/\\/g, '/')) : 'un archivo';
  if (QUE[tool.name]) return { area: QUE[tool.name][0], actividad: QUE[tool.name][1].replace('{f}', f) };
  if (tool.name === 'Bash') return { area: 'escritorio', actividad: inp.description || 'Usando la terminal' };
  if (tool.name === 'Workflow') return { area: 'escritorio', actividad: 'Trabajando en modo Ultra' };
  return { area: 'escritorio', actividad: 'Trabajando' };
}

function modeloDe(nombre) {
  const n = String(nombre || '').toLowerCase();
  return ['haiku', 'sonnet', 'opus', 'fable'].find((m) => n.includes(m)) || null;
}

// Lee una transcripción de Claude Code y saca el monito que le toca, en el mismo
// formato que ya usa la oficina (id, nombre, area, actividad, estado, modelo...).
export function resumirTranscripcion(texto, idArchivo, ahora = Date.now()) {
  let id = idArchivo, cwd = '', primerPrompt = '', modelo = null, ultra = false;
  const titulo = {};
  let ultimo = null;        // último mensaje de la conversación principal
  let herramienta = null;   // última herramienta que usó

  for (const linea of texto.split('\n')) {
    if (!linea.trim()) continue;
    let d;
    try { d = JSON.parse(linea); } catch { continue; } // línea a medio escribir
    if (d.sessionId) id = d.sessionId;
    if (d.type === 'custom-title' && d.customTitle) titulo.propio = d.customTitle;
    if (d.type === 'ai-title' && d.aiTitle) titulo.ia = d.aiTitle;
    if (d.type === 'summary' && d.summary) titulo.resumen = d.summary;
    if ((d.type !== 'user' && d.type !== 'assistant') || d.isSidechain || !d.timestamp) continue;
    if (d.cwd) cwd = d.cwd;
    const partes = Array.isArray(d.message?.content) ? d.message.content : [];
    if (d.type === 'user') {
      const esResultado = partes.some((p) => p.type === 'tool_result');
      if (!esResultado) {
        ultra = false;
        const t = textoDe(d.message?.content);
        if (t && !t.startsWith('<') && !primerPrompt) primerPrompt = t;
      }
      d.esResultado = esResultado;
    } else {
      if (d.message?.model) modelo = modeloDe(d.message.model) || modelo;
      for (const p of partes) if (p.type === 'tool_use') { herramienta = p; if (p.name === 'Workflow') ultra = true; }
      d.usaHerramienta = partes.some((p) => p.type === 'tool_use');
    }
    ultimo = d;
  }
  if (!ultimo) return null;

  const ts = Date.parse(ultimo.timestamp);
  const quieto = ahora - ts;
  let estado = 'trabajando', area = 'escritorio', actividad = 'Trabajando';
  if (ultimo.type === 'assistant' && !ultimo.usaHerramienta) estado = 'esperando';
  else if (ultimo.type === 'user' && !ultimo.esResultado) actividad = 'Leyendo el mensaje';
  else if (herramienta) ({ area, actividad } = queHace(herramienta));
  // Sin nada nuevo por demasiado tiempo: se quedó detenida a medias.
  if (estado === 'trabajando' && quieto > (ultimo.type === 'assistant' ? TOPE_HERRAMIENTA : TOPE_RESPUESTA)) estado = 'esperando';
  if (estado === 'esperando') { area = 'descanso'; actividad = 'Esperando instrucciones'; }

  const nombreLargo = recortar(titulo.propio || titulo.ia || titulo.resumen || primerPrompt || 'Sesión sin título');
  return {
    id: `ses-${String(id).replace(/[^A-Za-z0-9]/g, '').slice(0, 8)}`,
    nombre: recortar(nombreLargo, 18),
    titulo: nombreLargo,
    proyecto: cwd ? path.basename(cwd.replace(/\\/g, '/')) : '',
    area, actividad, estado,
    modo: ultra && estado === 'trabajando' ? 'ultra' : 'normal',
    modelo,
    // `actualizado` es el latido (mientras trabaja, es ahora); `ultima_actividad`
    // es lo último que de verdad pasó y es lo que cuenta para el vencimiento.
    actualizado: new Date(estado === 'trabajando' ? ahora : ts).toISOString(),
    ultima_actividad: ultimo.timestamp,
  };
}

export async function recolectar({ carpeta, equipo, dias }) {
  const ahora = Date.now();
  const limite = ahora - dias * 24 * 3600 * 1000;
  const agentes = [];
  let proyectos = [];
  try { proyectos = await fsp.readdir(carpeta, { withFileTypes: true }); } catch { /* sin Claude Code aquí */ }

  for (const p of proyectos) {
    if (!p.isDirectory()) continue;
    const dir = path.join(carpeta, p.name);
    for (const f of await fsp.readdir(dir, { withFileTypes: true })) {
      if (!f.isFile() || !f.name.endsWith('.jsonl')) continue;
      const archivo = path.join(dir, f.name);
      const info = await fsp.stat(archivo);
      if (info.mtimeMs < limite) continue;
      const s = resumirTranscripcion(await fsp.readFile(archivo, 'utf8'), f.name.replace(/\.jsonl$/, ''), ahora);
      if (s) agentes.push({ ...s, dispositivo: 'laptop', origen: 'laptop', equipo });
    }
  }
  agentes.sort((a, b) => Date.parse(b.ultima_actividad) - Date.parse(a.ultima_actividad));
  return { actualizado: new Date(ahora).toISOString(), agentes, archivos_recientes: [] };
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
};

function servir(a) {
  const servidor = http.createServer(async (req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    try {
      if (ruta === '/estado.json') {
        let estado;
        if (a.demo) {
          const config = JSON.parse(await fsp.readFile(path.join(RAIZ, 'config', 'oficina.json'), 'utf8'));
          estado = estadoDemo(config);
        } else {
          estado = await recolectar(a);
        }
        res.writeHead(200, { 'content-type': TIPOS['.json'], 'cache-control': 'no-store' });
        return res.end(JSON.stringify(estado));
      }
      if (ruta.startsWith('/api/')) {   // adornos que solo tenía el servidor de la laptop
        res.writeHead(200, { 'content-type': TIPOS['.json'] });
        return res.end(JSON.stringify({ error: 'sin datos' }));
      }
      const archivo = path.join(RAIZ, path.normalize(ruta === '/' ? '/index.html' : ruta));
      if (!archivo.startsWith(RAIZ + path.sep) || archivo.includes(`${path.sep}.git`)) throw new Error('fuera');
      const datos = await fsp.readFile(archivo);
      res.writeHead(200, { 'content-type': TIPOS[path.extname(archivo)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(datos);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('No encontrado');
    }
  });
  servidor.listen(a.puerto, '127.0.0.1', () => {
    console.log(`Oficina abierta en http://localhost:${a.puerto}/oficina.html${a.demo ? '  (modo demo)' : ''}`);
    if (!a.demo) console.log(`Leyendo sesiones de ${a.carpeta}`);
  });
}

async function principal() {
  const a = leerArgs(process.argv.slice(2));
  if (a.ayuda) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 14).join('\n'));
    return;
  }
  if (a.servir) return servir(a);

  const una = async () => {
    const estado = await recolectar(a);
    if (a.salida) {
      const tmp = `${a.salida}.tmp`;
      await fsp.writeFile(tmp, JSON.stringify(estado, null, 2));
      await fsp.rename(tmp, a.salida); // la página nunca lee un archivo a medias
      console.log(`${new Date().toLocaleTimeString()}  ${estado.agentes.length} sesiones -> ${a.salida}`);
    } else {
      console.log(JSON.stringify(estado, null, 2));
    }
  };
  await una();
  if (a.cada > 0) setInterval(() => una().catch((e) => console.error(e.message)), a.cada * 1000);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal().catch((e) => { console.error(e); process.exit(1); });
}
