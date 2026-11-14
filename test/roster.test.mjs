import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armarOficina, asignarLugares, HORA, MINUTO } from '../src/roster.js';

const AHORA = Date.parse('2026-11-14T12:00:00Z');
const hace = (ms) => AHORA - ms;

const config = {
  supervisores: [
    { nombre: 'Jefa', proyecto: 'office-mind-ui' },
    { nombre: 'Guardia', id: 'ses-guardia' },
  ],
};

test('un supervisor sin sesión sigue en la oficina, ausente', () => {
  const o = armarOficina(config, [], AHORA);
  assert.equal(o.supervisores.length, 2);
  assert.deepEqual(o.supervisores.map((s) => s.estado), ['ausente', 'ausente']);
  assert.equal(o.visitantes.length, 0);
});

test('un supervisor nunca vence aunque lleve días sin actividad', () => {
  const o = armarOficina(config, [
    { id: 'ses-guardia', titulo: 'vieja', ultimaActividad: hace(10 * 24 * HORA) },
  ], AHORA);
  assert.equal(o.supervisores[1].sesion.id, 'ses-guardia');
  assert.equal(o.supervisores[1].estado, 'descanso');
  assert.equal(o.expirados.length, 0);
});

test('el supervisor toma la sesión más reciente de su proyecto y no sale como visitante', () => {
  const o = armarOficina(config, [
    { id: 'a', proyecto: 'Office-Mind-UI', ultimaActividad: hace(2 * HORA) },
    { id: 'b', proyecto: 'office-mind-ui', ultimaActividad: hace(1 * MINUTO), estado: 'trabajando' },
  ], AHORA);
  assert.equal(o.supervisores[0].sesion.id, 'b');
  assert.equal(o.supervisores[0].estado, 'trabajando');
  assert.equal(o.supervisores[0].sesionesExtra, 1);
  assert.equal(o.visitantes.length, 0);
});

test('un visitante se queda hasta 24 h después de su última actividad', () => {
  const o = armarOficina(config, [
    { id: 'v1', titulo: 'casi', ultimaActividad: hace(23 * HORA + 59 * MINUTO) },
    { id: 'v2', titulo: 'vencido', ultimaActividad: hace(24 * HORA) },
    { id: 'v3', titulo: 'recién', ultimaActividad: hace(30 * 1000), estado: 'esperando' },
  ], AHORA);
  assert.deepEqual(o.visitantes.map((v) => v.sesion.id), ['v3', 'v1']);
  assert.deepEqual(o.expirados, ['v2']);
  assert.equal(o.visitantes[0].estado, 'esperando');
  assert.equal(o.visitantes[1].estado, 'descanso');
  assert.equal(o.visitantes[1].seVaPronto, true);
  assert.equal(o.visitantes[0].seVaPronto, false);
});

test('el plazo se puede cambiar en la configuración', () => {
  const o = armarOficina({ venceHoras: 2 }, [
    { id: 'v', ultimaActividad: hace(3 * HORA) },
  ], AHORA);
  assert.equal(o.visitantes.length, 0);
});

test('acepta fechas como texto ISO y descarta sesiones sin fecha', () => {
  const o = armarOficina({}, [
    { id: 'v', ultimaActividad: new Date(hace(HORA)).toISOString() },
    { id: 'roto' },
  ], AHORA);
  assert.deepEqual(o.visitantes.map((v) => v.sesion.id), ['v']);
});

test('cada visitante conserva su escritorio cuando otro se va', () => {
  const antes = asignarLugares(['vis:a', 'vis:b', 'vis:c'], 12);
  const despues = asignarLugares(['vis:a', 'vis:c'], 12);
  assert.equal(despues.get('vis:a'), antes.get('vis:a'));
  assert.equal(new Set(antes.values()).size, 3);
  const lleno = asignarLugares(['1', '2', '3'], 2);
  assert.deepEqual([...lleno.values()].filter((l) => l === -1).length, 1);
});
