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
