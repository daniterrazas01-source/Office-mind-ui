import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import worker, { Estado } from '../relevo/worker.js';

// Un "Cloudflare" de mentiras: un solo objeto con almacenamiento en memoria.
function entornoFalso(escritura = 'secreto') {
  const datos = new Map(), env = { ESCRITURA: escritura };
  const objeto = new Estado({ storage: { get: async (k) => datos.get(k), put: async (k, v) => { datos.set(k, structuredClone(v)); } } }, env);
  return Object.assign(env, { ESTADO: { idFromName: () => 'x', get: () => objeto } });
}
const pedir = (env, ruta, opciones) => worker.fetch(new Request('https://relevo.test' + ruta, opciones), env);
const aviso = (env, cuerpo, llave = 'secreto') => pedir(env, '/aviso', { method: 'POST', headers: { Authorization: 'Bearer ' + llave, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });

test('el relevo guarda avisos con llave y los entrega a cualquiera', async () => {
  const env = entornoFalso();
  assert.equal((await aviso(env, { id: 'ses-1', nombre: 'Prueba' }, 'mala')).status, 401);
  assert.equal((await aviso(env, { nombre: 'sin id' })).status, 400);
  assert.equal((await aviso(env, { id: 'ses-1', nombre: 'Prueba', area: 'biblioteca', actividad: 'Leyendo a.js', estado: 'trabajando', dispositivo: 'nube', intruso: 'x', archivo: { nombre: 'a.js', tipo: 'editado' } })).status, 200);
  await aviso(env, { id: 'ses-2', nombre: 'Otra', estado: 'trabajando' });
  const r = await pedir(env, '/estado');
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), '*');
  const estado = await r.json();
  assert.deepEqual(estado.agentes.map((a) => a.id).sort(), ['ses-1', 'ses-2']);
  const uno = estado.agentes.find((a) => a.id === 'ses-1');
  assert.equal(uno.area, 'biblioteca');
  assert.equal(uno.intruso, undefined);
  assert.ok(Date.parse(uno.actualizado) > 0);
  assert.equal(estado.archivos_recientes[0].nombre, 'a.js');
});

test('avisar "esperando" no reinicia el plazo de 24 h', async () => {
  const env = entornoFalso();
  await aviso(env, { id: 'ses-1', estado: 'trabajando' });
  const antes = (await (await pedir(env, '/estado')).json()).agentes[0].ultima_actividad;
  await new Promise((r) => setTimeout(r, 15));
  await aviso(env, { id: 'ses-1', estado: 'esperando' });
  const despues = (await (await pedir(env, '/estado')).json()).agentes[0];
  assert.equal(despues.ultima_actividad, antes);
  assert.notEqual(despues.actualizado, antes);
});

test('el hook manda al relevo lo que hace la sesión', async () => {
  const recibidos = [];
  const servidor = http.createServer((req, res) => {
    let cuerpo = '';
    req.on('data', (c) => { cuerpo += c; });
    req.on('end', () => { recibidos.push({ ruta: req.url, llave: req.headers.authorization, cuerpo: JSON.parse(cuerpo) }); res.end('{"ok":true}'); });
  });
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oficina-'));
  const transcript = path.join(dir, 't.jsonl');
  fs.writeFileSync(transcript, JSON.stringify({ type: 'ai-title', aiTitle: 'Prueba del hook' }) + '\n' + JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-5-5' } }) + '\n');
  const correr = (evento) => new Promise((resolve) => {
    const env = { ...process.env, OFICINA_RELEVO_URL: `http://127.0.0.1:${servidor.address().port}`, OFICINA_RELEVO_LLAVE: 'secreto', OFICINA_EQUIPO: 'Aparato de prueba', TMPDIR: dir };
    import('node:child_process').then(({ execFile }) => {
      const h = execFile('python3', ['relevo/oficina_aviso.py'], { env }, () => resolve());
      h.stdin.end(JSON.stringify({ session_id: 'abcd1234-ef', transcript_path: transcript, cwd: '/home/yo/mi-proyecto', ...evento }));
    });
  });
  await correr({ hook_event_name: 'PreToolUse', tool_name: 'WebSearch', tool_input: {} });
  await correr({ hook_event_name: 'Stop' });
  servidor.close();
  assert.equal(recibidos.length, 2);
  assert.equal(recibidos[0].ruta, '/aviso');
  assert.equal(recibidos[0].llave, 'Bearer secreto');
  assert.deepEqual([recibidos[0].cuerpo.area, recibidos[0].cuerpo.actividad, recibidos[0].cuerpo.modelo, recibidos[0].cuerpo.nombre, recibidos[0].cuerpo.equipo],
    ['internet', 'Buscando en internet', 'opus', 'Prueba del hook', 'Aparato de prueba']);
  assert.deepEqual([recibidos[1].cuerpo.area, recibidos[1].cuerpo.estado], ['descanso', 'esperando']);
});

test('sin secreto en Cloudflare, la primera llave que llega a /llave se queda y ya no se cambia', async () => {
  const env = entornoFalso('');
  assert.equal((await aviso(env, { id: 'a' }, 'cualquier-cosa-larga')).status, 401, 'sin llave todavía nadie escribe');
  const llave = (l) => pedir(env, '/llave', { method: 'POST', headers: { Authorization: 'Bearer ' + l } });
  assert.equal((await llave('corta')).status, 400);
  assert.equal((await llave('una-llave-larga-de-prueba')).status, 200);
  assert.equal((await llave('otra-llave-larga-de-prueba')).status, 409, 'ya no se cambia');
  assert.equal((await aviso(env, { id: 'a' }, 'otra-llave-larga-de-prueba')).status, 401);
  assert.equal((await aviso(env, { id: 'a', nombre: 'Uno' }, 'una-llave-larga-de-prueba')).status, 200);
  const e = await (await pedir(env, '/estado')).json();
  assert.equal(e.agentes[0].nombre, 'Uno');
});

test('con el secreto ESCRITURA puesto, /llave no hace nada', async () => {
  const env = entornoFalso('secreto');
  assert.equal((await pedir(env, '/llave', { method: 'POST', headers: { Authorization: 'Bearer una-llave-larga-de-prueba' } })).status, 409);
});
