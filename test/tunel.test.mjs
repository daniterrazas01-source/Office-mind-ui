import test from 'node:test';
import assert from 'node:assert/strict';
import { ESTACIONES, NODOS, TRONCO, rutaTunel, largoRuta, puntoEnRuta, estacionDe, envioLimpio, enviosLimpios } from '../src/tunel.js';
import { turnos, turnoDe, esDeHoy, CADA_PANTALLA } from '../src/pantalla.js';

const claves = Object.keys(ESTACIONES);

test('todas las estaciones se conectan entre sí por el túnel', () => {
  for (const de of claves) for (const para of claves){
    const ruta = rutaTunel(de, para);
    if (de === para){ assert.equal(ruta, null); continue; }
    assert.deepEqual(ruta[0], NODOS[de], `${de} → ${para} sale de su estación`);
    assert.deepEqual(ruta[ruta.length - 1], NODOS[para], `${de} → ${para} llega a su estación`);
    for (let i = 1; i < ruta.length; i++) assert.notDeepEqual(ruta[i], ruta[i - 1], 'sin puntos repetidos');
    assert.ok(largoRuta(ruta) > 0);
  }
});

test('de arriba hacia abajo se pasa por el tronco central', () => {
  const ruta = rutaTunel('calleros', 'terrazas');
  assert.ok(ruta.some((p) => p.x === TRONCO.x && p.y > TRONCO.y0), 'entra al tronco');
  assert.ok(ruta.some((p) => p.x === TRONCO.x && p.y === 53 * 16 + 8), 'sale a la altura de Terrazas');
});

test('cuartos vecinos no dan la vuelta por el tronco', () => {
  assert.equal(largoRuta(rutaTunel('calleros', 'cerebro delta')), 80);        // solo cruzan el pasillo
  assert.equal(largoRuta(rutaTunel('terrazas', 'centro de pensado')), 208);   // cruzan el tronco en línea recta
  assert.equal(rutaTunel('calleros', 'cerebro delta').length, 3);
});

test('ida y vuelta miden lo mismo', () => {
  for (const de of claves) for (const para of claves) if (de !== para)
    assert.ok(Math.abs(largoRuta(rutaTunel(de, para)) - largoRuta(rutaTunel(para, de))) < 1e-6);
});

test('el paquete avanza de la salida a la llegada', () => {
  const ruta = rutaTunel('terrazas', 'noticias'), largo = largoRuta(ruta);
  assert.deepEqual(puntoEnRuta(ruta, 0), ruta[0]);
  assert.deepEqual(puntoEnRuta(ruta, largo + 50), ruta[ruta.length - 1]);
  const medio = puntoEnRuta(ruta, largo / 2);
  assert.ok(medio.x >= 152 && medio.x <= 360 && medio.y >= 856 && medio.y <= 968);
});

test('el periférico va de Internet a la Ampliación pasando por el túnel central', () => {
  const ruta = rutaTunel('internet', 'ampliacion');
  assert.ok(ruta.some((p) => p.x === 208 && p.y === 224), 'baja hacia la Sala de Juntas');
  assert.ok(ruta.some((p) => p.x === TRONCO.x && p.y > TRONCO.y0 && p.y < TRONCO.y1), 'recorre el tronco');
  for (let i = 1; i < ruta.length; i++){                           // todos los tramos son rectos
    const a = ruta[i - 1], b = ruta[i];
    assert.ok(a.x === b.x || a.y === b.y, `tramo ${i} recto`);
  }
  const doc = rutaTunel('internet', 'noticias');                    // un documento de Internet a la pantalla
  assert.deepEqual(doc[0], NODOS.internet);
  assert.deepEqual(doc[doc.length - 1], NODOS.noticias);
});

test('estacionDe entiende los nombres de los cuartos', () => {
  assert.equal(estacionDe('Oficina Calleros'), 'calleros');
  assert.equal(estacionDe('cerebro'), 'cerebro delta');
  assert.equal(estacionDe('Oficina Terrazas'), 'terrazas');
  assert.equal(estacionDe('centro_de_pensado'), 'centro de pensado');
  assert.equal(estacionDe('Almacén'), 'centro de pensado');
  assert.equal(estacionDe('Sala de Noticias'), 'noticias');
  assert.equal(estacionDe('Internet'), 'internet');
  assert.equal(estacionDe('ampliación'), 'ampliacion');
  assert.equal(estacionDe('biblioteca'), null);
  assert.equal(estacionDe(''), null);
});

test('un envío sin destino, o a su mismo cuarto, no se entrega', () => {
  assert.equal(envioLimpio({ de: 'terrazas', para: 'biblioteca', titulo: 'x' }), null);
  assert.equal(envioLimpio({ de: 'terrazas', para: 'Oficina Terrazas', titulo: 'x' }), null);
  assert.equal(envioLimpio(null), null);
});

test('si no dice desde dónde, sale de la casa de quien lo manda', () => {
  const e = envioLimpio({ id: 'a', autor: 'Nitro', para: 'almacen', tipo: 'ARCHIVO', titulo: 'Resumen', creado: '2026-11-15T13:30:00Z' }, (quien) => (quien === 'Nitro' ? 'terrazas' : null));
  assert.equal(e.de, 'terrazas');
  assert.equal(e.para, 'centro de pensado');
  assert.equal(e.tipo, 'archivo');
  assert.equal(e.creado, Date.parse('2026-11-15T13:30:00Z'));
});

test('los envíos salen sin repetidos y del más nuevo al más viejo', () => {
  const lista = enviosLimpios([
    { id: '1', de: 'terrazas', para: 'calleros', creado: '2026-11-15T10:00:00Z' },
    { id: '2', de: 'terrazas', para: 'cerebro', creado: '2026-11-15T12:00:00Z' },
    { id: '1', de: 'terrazas', para: 'calleros', creado: '2026-11-15T10:00:00Z' },
    { id: '3', de: 'terrazas', para: 'ninguna parte' },
  ]);
  assert.deepEqual(lista.map((e) => e.id), ['2', '1']);
});

test('la pantalla alterna noticia y otra cosa, y repite las noticias', () => {
  assert.deepEqual(turnos(['n1', 'n2'], ['a', 'b', 'c']), ['n1', 'a', 'n2', 'b', 'n1', 'c']);
  assert.deepEqual(turnos([], ['a', 'b']), ['a', 'b']);
  assert.deepEqual(turnos(['n1'], []), ['n1']);
});

test('la pantalla cambia cada 5 minutos', () => {
  assert.equal(CADA_PANTALLA, 5 * 60000);
  const base = Date.parse('2026-11-15T14:00:00Z');
  const a = turnoDe(base + 60000, 6), b = turnoDe(base + 4 * 60000, 6), c = turnoDe(base + 5 * 60000, 6);
  assert.equal(a.i, b.i);
  assert.equal(c.i, (a.i + 1) % 6);
  assert.equal(a.cambia, base + 5 * 60000);
  assert.equal(turnoDe(base, 0).i, 0);
});

test('una noticia es de hoy si su resumen tiene menos de 24 horas', () => {
  const ahora = Date.parse('2026-11-15T14:00:00Z');
  assert.equal(esDeHoy('2026-11-15T13:23:00Z', ahora), true);
  assert.equal(esDeHoy('2026-11-14T13:23:00Z', ahora), false);
  assert.equal(esDeHoy(undefined, ahora), false);
});

// ---------- Secciones del noticiero ----------
import { edadDias, secciones, turnoSeccion } from '../src/pantalla.js';

const HOY = Date.parse('2026-11-16T15:00:00Z'), HECHO = '2026-11-16T13:30:00Z';

test('la edad de una noticia sale de lo que escribió el monito', () => {
  assert.ok(edadDias('hoy', HECHO, HOY) < 1);
  assert.ok(edadDias('ayer', HECHO, HOY) >= 1 && edadDias('ayer', HECHO, HOY) < 2);
  assert.equal(Math.floor(edadDias('14 de noviembre', HECHO, HOY)), 2);
  assert.equal(Math.floor(edadDias('tras la carrera del 8 de noviembre (fecha sin confirmar)', HECHO, HOY)), 8);
  assert.ok(edadDias('octubre de 2026 (fecha exacta sin confirmar)', HECHO, HOY) > 20);
  assert.ok(edadDias('20 de diciembre', '2027-01-03T13:00:00Z', Date.parse('2027-01-03T14:00:00Z')) > 13, 'cruza el año');
  assert.ok(edadDias('', HECHO, HOY) < 1);
  assert.ok(edadDias('hoy', '2026-11-10T13:30:00Z', HOY) > 5, 'un "hoy" de un resumen viejo ya no es de hoy');
});

const DOS = [
  { id: 'nitro', nombre: 'Nitro', seccion: 'Arrancones', horario: 'Diario', reportes: [{ id: '2026-11-16', creado: HECHO,
    puntos: [{ titulo: 'vieja', cuando: '20 de octubre' }, { titulo: 'de ayer', cuando: 'ayer' }, { titulo: 'de hoy', cuando: 'hoy' }], capsulas: [{ titulo: 'c1' }, { titulo: 'c2' }] }] },
  { id: 'pole', nombre: 'Pole', seccion: 'Fórmula 1', reportes: [{ id: '2026-11-16', creado: HECHO, puntos: [{ titulo: 'f1', cuando: 'hoy' }], capsulas: [] }] },
];

test('cada monito tiene su sección, con lo nuevo primero y lo viejo aparte', () => {
  const secs = secciones(DOS, [{ titulo: 'aviso', texto: 'x' }], HOY);
  assert.deepEqual(secs.map((s) => s.titulo), ['ARRANCONES', 'FÓRMULA 1', 'OFICINA']);
  assert.deepEqual(secs[0].noticias.map((n) => n.titulo), ['de hoy', 'de ayer']);
  assert.deepEqual(secs[0].viejas.map((n) => n.titulo), ['vieja']);
  assert.deepEqual(secs[0].noticias.map((n) => n.tipo), ['NOTICIA DE HOY', 'NOTICIA DE AYER']);
  assert.ok(!secs[0].items.some((x) => x.titulo === 'vieja'), 'lo viejo no sale en pantalla');
  assert.deepEqual(secs[2].items.map((x) => x.tipo), ['AVISO', 'TAREA']);   // Pole, sin horario ni pendientes, no anuncia tarea
});

test('en pantalla las secciones salen por turnos y cada una lleva su cuenta', () => {
  const secs = secciones(DOS, [{ titulo: 'aviso', texto: 'x' }], HOY);
  const orden = Array.from({ length: 14 }, (_, v) => turnoSeccion(secs, v));
  assert.deepEqual(orden.slice(0, 7).map((t) => secs[t.s].id), ['nitro', 'pole', 'nitro', 'pole', 'nitro', 'pole', 'oficina']);
  assert.deepEqual(orden.filter((t) => secs[t.s].id === 'nitro').map((t) => t.i), [0, 1, 2, 3, 0, 1]);
  assert.deepEqual(orden.filter((t) => secs[t.s].id === 'oficina').map((t) => t.i), [0, 1]);
  assert.equal(turnoSeccion(secciones([], [], HOY), 3), null);
});

// ---------- Las alas ----------
test('el periférico llega a los cuartos de las dos alas y a los de abajo', () => {
  for (const c of ['oeste 1', 'oeste 4', 'taller 2', 'ala oeste', 'este 2', 'este 6', 'ala este', 'clipping arriba', 'clipping abajo', 'este 12', 'ala este 2', 'espacio d', 'espacio e', 'taller', 'espacio h']){
    const r = rutaTunel('internet', c);
    assert.ok(r && r.length > 2, c);
    for (let i = 1; i < r.length; i++) assert.ok(r[i].x === r[i - 1].x || r[i].y === r[i - 1].y, `${c}: tramo ${i} recto`);
  }
  const r = rutaTunel('oeste 1', 'este 1');
  assert.ok(r.some((p) => p.y === 66 * 16) || r.some((p) => p.y === 93 * 16), 'cruza por el pasillo 4 o el 5');
});

test('estacionDe entiende los cuartos nuevos', () => {
  assert.equal(estacionDe('Oeste 3'), 'oeste 3');
  assert.equal(estacionDe('ala este'), 'ala este');
  assert.equal(estacionDe('Este 6'), 'este 6');
  assert.equal(estacionDe('Taller 2'), 'taller 2');
  assert.equal(estacionDe('el taller'), 'taller');
  assert.equal(estacionDe('Espacio libre D'), 'espacio d');
  assert.equal(estacionDe('Oeste 9'), null);
  assert.equal(estacionDe('Este 11'), 'este 11');
  assert.equal(estacionDe('Ala Este 2'), 'ala este 2');
  assert.equal(estacionDe('Centro de diseño'), 'clipping abajo');
  assert.equal(estacionDe('clipping'), 'clipping abajo');
  assert.equal(estacionDe('Clipping (arriba)'), 'clipping arriba');
  assert.equal(estacionDe('Estudio de Clipping'), 'ala este 2');
  assert.equal(estacionDe('Diseño aux 2'), 'clipping abajo');
  assert.equal(estacionDe('Diseño aux 3'), 'este 12');
  assert.equal(estacionDe('lounge de diseño'), 'clipping arriba');
});
