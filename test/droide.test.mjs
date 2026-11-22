import test from 'node:test';
import assert from 'node:assert/strict';
import { protegido, listaProtegidos, basura, idPapelera, paraCompactar, rondas, ultimaRonda, tocaLimpiar, enMantenimiento, PROTEGIDOS } from '../src/droide.js';

const AHORA = Date.parse('2026-11-22T18:00:00Z');
const minutosUTC = (t) => { const d = new Date(t); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const HORARIO = { abre: '06:00', cierra: '19:30' };

test('reconoce los proyectos protegidos aunque se escriban distinto', () => {
  assert.equal(protegido('DragTree manda a Nitro'), true);
  assert.equal(protegido('la app drag-tree'), true);
  assert.equal(protegido('Oficina CALLEROS'), true);
  assert.equal(protegido('Cerebro delta'), true);
  assert.equal(protegido('Llegó Pole, el de Fórmula 1'), false);
  assert.equal(protegido(''), false);
  assert.equal(protegido('Mi Proyecto X', ['proyecto x']), true);
});

test('la lista de protegidos se escribe separada por comas', () => {
  assert.deepEqual(listaProtegidos('Drag Tree, Calleros,, drag tree ;Cerebro Delta\nab'), ['Drag Tree', 'Calleros', 'Cerebro Delta']);
  assert.deepEqual(listaProtegidos(''), []);
});

test('la basura: avisos viejos, resúmenes de hace más de una semana y envíos viejos, salvo lo protegido', () => {
  const b = basura({
    avisos: [
      { id: 'viejo', titulo: 'Túneles nuevos', texto: 'Hay un túnel', creado: '2026-11-15T03:48:00Z' },
      { id: 'equipos', titulo: 'Dos equipos', texto: 'DragTree manda a Nitro', creado: '2026-11-16T15:00:00Z' },
      { id: 'nuevo', titulo: 'Algo de ayer', creado: '2026-11-21T10:00:00Z' },
      { id: 'sinfecha', titulo: 'Sin fecha' },
    ],
    monitos: [{ id: 'nitro', nombre: 'Nitro', reportes: [
      { id: '2026-11-14', creado: '2026-11-14T13:30:00Z', puntos: [{ titulo: 'Récord en Texas' }] },
      { id: '2026-11-13', puntos: [{ titulo: 'Drag Tree 0.8 salió' }] },
      { id: '2026-11-20', creado: '2026-11-20T13:30:00Z' },
    ] }],
    envios: [{ id: 'e1', titulo: 'Resumen', creado: '2026-11-10T00:00:00Z' }, { id: 'e2', titulo: 'Nuevo', creado: '2026-11-21T00:00:00Z' }],
  }, AHORA);
  assert.deepEqual(b.noticias.map((x) => x.ruta), ['avisos/viejo']);
  assert.deepEqual(b.almacen.map((x) => x.ruta), ['envios/e1', 'monitos/nitro/reportes/2026-11-14']);
  assert.equal(b.noticias[0].datos.titulo, 'Túneles nuevos');
  assert.equal(b.noticias[0].datos.id, undefined, 'los datos se guardan sin el id');
  assert.equal(b.almacen[1].de, 'Nitro');
});

test('con la lista vacía no protege nada; con más proyectos protege más', () => {
  const avisos = [{ id: 'a', titulo: 'DragTree', creado: '2026-11-01T00:00:00Z' }, { id: 'b', titulo: 'Pole llegó', creado: '2026-11-01T00:00:00Z' }];
  assert.equal(basura({ avisos }, AHORA, []).noticias.length, 2);
  assert.equal(basura({ avisos }, AHORA, PROTEGIDOS.concat('Pole')).noticias.length, 0);
});

test('la papelera guarda con un nombre de una pieza y compacta lo de más de 7 días', () => {
  assert.equal(idPapelera('monitos/nitro/reportes/2026-11-14'), 'monitos~nitro~reportes~2026-11-14');
  const p = [{ id: 'x', tirado: '2026-11-10T00:00:00Z' }, { id: 'y', tirado: '2026-11-20T00:00:00Z' }, { id: 'z' }];
  assert.deepEqual(paraCompactar(p, AHORA).map((x) => x.id), ['x']);
});

test('rondas a las 10, a las 3 y media hora antes de cerrar', () => {
  assert.deepEqual(rondas(HORARIO), [600, 900, 1140]);
  assert.deepEqual(rondas({ abre: '11:00', cierra: '14:00' }), [810]);   // solo cabe la de antes de cerrar
});

test('le toca limpiar cuando pasó una ronda desde su última limpieza y hay basura', () => {
  const a1030 = Date.parse('2026-11-22T10:30:00Z'), a0900 = Date.parse('2026-11-22T09:00:00Z');
  assert.equal(ultimaRonda(a1030, HORARIO, minutosUTC), Date.parse('2026-11-22T10:00:00Z'));
  assert.equal(ultimaRonda(a0900, HORARIO, minutosUTC), Date.parse('2026-11-21T19:00:00Z'), 'antes de las 10 cuenta la de anoche');
  assert.equal(tocaLimpiar(a1030, HORARIO, '2026-11-22T09:00:00Z', true, minutosUTC), true);
  assert.equal(tocaLimpiar(a1030, HORARIO, '2026-11-22T10:05:00Z', true, minutosUTC), false, 'ya limpió en esta ronda');
  assert.equal(tocaLimpiar(a1030, HORARIO, null, false, minutosUTC), false, 'sin basura no sale');
  assert.equal(tocaLimpiar(a1030, HORARIO, undefined, true, minutosUTC), true, 'nunca ha limpiado');
});

test('mantenimiento de 1:00 a 1:10 p.m.', () => {
  assert.equal(enMantenimiento(Date.parse('2026-11-22T13:05:00Z'), minutosUTC), true);
  assert.equal(enMantenimiento(Date.parse('2026-11-22T13:10:00Z'), minutosUTC), false);
});
