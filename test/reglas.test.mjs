import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarReglas, HORA } from '../src/reglas.js';
import { resumirTranscripcion } from '../collector/recolector.mjs';

const AHORA = Date.parse('2026-11-14T12:00:00Z');
const hace = (ms) => new Date(AHORA - ms).toISOString();

const config = {
  supervisores: [
    { nombre: 'Calleros', id: 'calleros', modelo: 'opus', dispositivo: 'laptop-windows' },
    { nombre: 'DragTree', titulo: 'dragtree', dispositivo: 'tableta-android' },
  ],
};

test('un supervisor sin sesión sigue en la oficina, ausente', () => {
  const { agentes } = aplicarReglas(config, { agentes: [] }, AHORA);
  assert.deepEqual(agentes.map((a) => a.id), ['sup-calleros', 'sup-dragtree']);
  assert.ok(agentes.every((a) => a.ausente && a.rol === 'supervisor'));
  assert.equal(agentes[0].modelo, 'opus');
  assert.equal(agentes[1].dispositivo, 'tableta-android');
});

test('un supervisor nunca vence aunque lleve días sin actividad', () => {
  const { agentes, expirados } = aplicarReglas(config, {
    agentes: [{ id: 'calleros', nombre: 'Calleros', area: 'descanso', actualizado: hace(10 * 24 * HORA) }],
  }, AHORA);
  assert.equal(agentes[0].id, 'sup-calleros');
  assert.equal(agentes[0].ausente, undefined);
  assert.equal(expirados.length, 0);
});

test('el supervisor es un solo monito: toma su sesión más reciente y las demás no salen', () => {
  const { agentes } = aplicarReglas(config, {
    agentes: [
      { id: 'terrazas-aaaa', nombre: 'DragTree aaaa', actividad: 'vieja', actualizado: hace(2 * HORA) },
      { id: 'terrazas-bbbb', nombre: 'DragTree bbbb', actividad: 'nueva', actualizado: hace(60000) },
    ],
  }, AHORA);
  const dt = agentes.find((a) => a.id === 'sup-dragtree');
  assert.equal(dt.actividad, 'nueva');
  assert.equal(dt.nombre, 'DragTree');
  assert.equal(dt.sesiones_extra, 1);
  assert.equal(agentes.filter((a) => a.rol === 'visitante').length, 0);
});

test('un visitante se queda hasta 24 h después de su última actividad', () => {
  const { agentes, expirados } = aplicarReglas(config, {
    agentes: [
      { id: 'v1', nombre: 'casi', actualizado: hace(23 * HORA + 59 * 60000) },
      { id: 'v2', nombre: 'vencido', actualizado: hace(24 * HORA) },
      { id: 'v3', nombre: 'recién', actualizado: hace(30000) },
    ],
  }, AHORA);
  const vis = agentes.filter((a) => a.rol === 'visitante');
  assert.deepEqual(vis.map((a) => a.id), ['v1', 'v3']);
  assert.deepEqual(expirados, ['v2']);
  assert.equal(vis[0].se_va_pronto, true);
  assert.equal(vis[1].se_va_pronto, false);
});

test('el plazo cuenta desde la última actividad real, no desde el último latido', () => {
  const { agentes } = aplicarReglas({}, {
    agentes: [{ id: 'v', actualizado: hace(1000), ultima_actividad: hace(25 * HORA) }],
  }, AHORA);
  assert.equal(agentes.length, 0);
});

test('el plazo se puede cambiar en la configuración', () => {
  const { agentes } = aplicarReglas({ venceHoras: 2 }, { agentes: [{ id: 'v', actualizado: hace(3 * HORA) }] }, AHORA);
  assert.equal(agentes.length, 0);
});

test('el recolector saca área, actividad, modelo y estado de una transcripción', () => {
  const lineas = [
    { type: 'ai-title', aiTitle: 'Arreglar el login', sessionId: 'abc12345-x' },
    { type: 'user', timestamp: '2026-11-14T11:00:00Z', cwd: '/home/yo/mi-proyecto', message: { role: 'user', content: 'hola' } },
    { type: 'assistant', timestamp: '2026-11-14T11:00:05Z', message: { model: 'claude-opus-5-5', content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/home/yo/mi-proyecto/src/app.js' } }] } },
  ];
  const texto = lineas.map((l) => JSON.stringify(l)).join('\n');
  const leyendo = resumirTranscripcion(texto, 'abc12345-x', Date.parse('2026-11-14T11:00:20Z'));
  assert.equal(leyendo.nombre, 'Arreglar el login');
  assert.equal(leyendo.area, 'biblioteca');
  assert.equal(leyendo.actividad, 'Leyendo app.js');
  assert.equal(leyendo.modelo, 'opus');
  assert.equal(leyendo.estado, 'trabajando');
  assert.equal(leyendo.proyecto, 'mi-proyecto');
  assert.equal(leyendo.ultima_actividad, '2026-11-14T11:00:05Z');

  const fin = texto + '\n' + JSON.stringify({ type: 'assistant', timestamp: '2026-11-14T11:01:00Z', message: { model: 'claude-opus-5-5', stop_reason: 'end_turn', content: [{ type: 'text', text: 'Listo' }] } });
  const espera = resumirTranscripcion(fin, 'abc12345-x', Date.parse('2026-11-14T11:01:10Z'));
  assert.equal(espera.estado, 'esperando');
  assert.equal(espera.area, 'descanso');
  assert.equal(espera.actividad, 'Esperando instrucciones');
});
