#!/usr/bin/env node
// Recolector de la oficina.
// Lee las sesiones de Claude Code de esta computadora (~/.claude/projects/*/*.jsonl)
// y arma estado.json: una lista de sesiones con título, proyecto, estado y última
// actividad. Las reglas de supervisores y vencimiento viven en src/roster.js; aquí
// solo se reporta lo que hay.
//
// Uso:
//   node collector/recolector.mjs                 imprime el estado una vez
//   node collector/recolector.mjs --salida estado.json [--cada 10]
//   node collector/recolector.mjs --servir [--puerto 4321] [--demo]
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
  const a = { puerto: 4321, dias: 7, cada: 0 };
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

// Lee una transcripción y saca lo que la oficina necesita.
export function resumirTranscripcion(texto, idArchivo) {
  let id = idArchivo, cwd = '', titulo = {}, primerPrompt = '', inicio = null;
  let ultimo = null; // último mensaje de la conversación principal

  for (const linea of texto.split('\n')) {
    if (!linea.trim()) continue;
    let d;
    try { d = JSON.parse(linea); } catch { continue; } // línea a medio escribir
    if (d.sessionId) id = d.sessionId;
    if (d.type === 'custom-title' && d.customTitle) titulo.propio = d.customTitle;
    if (d.type === 'ai-title' && d.aiTitle) titulo.ia = d.aiTitle;
    if (d.type === 'summary' && d.summary) titulo.resumen = d.summary;
    if ((d.type === 'user' || d.type === 'assistant') && !d.isSidechain && d.timestamp) {
      if (d.cwd) cwd = d.cwd;
      inicio ??= d.timestamp;
      if (d.type === 'user' && !primerPrompt && !d.toolUseResult) {
        const t = textoDe(d.message?.content);
        if (t && !t.startsWith('<')) primerPrompt = t;
      }
      ultimo = d;
    }
  }
  if (!ultimo) return null;

  // Si lo último fue Claude terminando su turno, la sesión te espera a ti.
  // Si fue una herramienta o un mensaje tuyo, está trabajando.
  let estado = 'trabajando';
  if (ultimo.type === 'assistant') {
    const partes = Array.isArray(ultimo.message?.content) ? ultimo.message.content : [];
    const usaHerramienta = partes.some((p) => p.type === 'tool_use');
    if (!usaHerramienta && ultimo.message?.stop_reason !== 'tool_use') estado = 'esperando';
  }

  return {
    id,
    titulo: recortar(titulo.propio || titulo.ia || titulo.resumen || primerPrompt || 'Sesión sin título'),
    proyecto: cwd ? path.basename(cwd) : '',
    carpeta: cwd,
    estado,
    inicio,
    ultimaActividad: ultimo.timestamp,
  };
}

export async function recolectar({ carpeta, equipo, dias }) {
  const limite = Date.now() - dias * 24 * 3600 * 1000;
  const sesiones = [];
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
      const s = resumirTranscripcion(await fsp.readFile(archivo, 'utf8'), f.name.replace(/\.jsonl$/, ''));
      if (s) sesiones.push({ ...s, equipo });
    }
  }
  sesiones.sort((a, b) => Date.parse(b.ultimaActividad) - Date.parse(a.ultimaActividad));
  return { generado: new Date().toISOString(), equipo, sesiones };
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
    console.log(`Oficina abierta en http://localhost:${a.puerto}${a.demo ? '  (modo demo)' : ''}`);
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
      console.log(`${new Date().toLocaleTimeString()}  ${estado.sesiones.length} sesiones -> ${a.salida}`);
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
