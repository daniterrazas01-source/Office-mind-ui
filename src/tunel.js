// El periférico. Es una sola línea que recorre la oficina de arriba a abajo:
//   Internet -> pasillo 1 -> por debajo de la Sala de Juntas -> pasillo 2 -> pasillo entre Calleros y el
//   Cerebro -> túnel central (el tronco) -> pasillo 4 -> por debajo del cuarto libre de en medio -> Ampliación.
// De ella salen ramales cortos a los cuartos. En cada cuarto hay una estación: ahí se mete lo que se manda
// (archivos, notas, noticias) y ahí llega lo que mandan. Los supervisores y los monitos fijos también pueden
// viajar por él. Aquí va la geometría (en pixeles del mapa) y las reglas de los envíos: funciones puras, con
// pruebas. El dibujo está en oficina.html.

const T = 16;
export const TRONCO = { x: 256, y0: 720, y1: 1040 };   // el túnel central, la parte ancha del periférico

// tx, ty = casilla del mueble de la estación · lado = hacia dónde sale su tubo · pie = dónde se para quien la usa
// boca = las dos terminales del periférico: una boca de túnel de 2 x 2 casillas (se da su esquina de arriba a la izquierda)
export const ESTACIONES = {
  'internet':          { tx: 22, ty: 8,  lado: 'abajo', nombre: 'Internet',          pie: { tx: 25, ty: 8 }, boca: { tx: 23, ty: 7 } },
  'calleros':          { tx: 12, ty: 37, lado: 'der',   nombre: 'Oficina Calleros',  pie: { tx: 11, ty: 37 } },
  'cerebro delta':     { tx: 17, ty: 37, lado: 'izq',   nombre: 'Cerebro Delta',     pie: { tx: 18, ty: 37 } },
  'terrazas':          { tx: 9,  ty: 53, lado: 'der',   nombre: 'Oficina Terrazas',  pie: { tx: 8, ty: 53 } },
  'centro de pensado': { tx: 22, ty: 53, lado: 'izq',   nombre: 'Centro de Pensado', pie: { tx: 23, ty: 53 } },
  'noticias':          { tx: 22, ty: 60, lado: 'izq',   nombre: 'Sala de Noticias',  pie: { tx: 23, ty: 60 } },
  'ampliacion':        { tx: 17, ty: 82, lado: 'abajo', nombre: 'Ampliación',        pie: { tx: 15, ty: 83 }, boca: { tx: 15, ty: 81 } },
};

const centro = (e) => (e.boca ? { x: e.boca.tx * T + 16, y: e.boca.ty * T + 16 } : { x: e.tx * T + 8, y: e.ty * T + 8 });
const fila = (ty) => ty * T + 8;

// Nudos del periférico. Los que se llaman como una estación son su mueble.
export const NODOS = {
  p1a: { x: 384, y: 224 },                 // pasillo 1, bajo la terminal de Internet
  p1b: { x: 208, y: 224 },                 // pasillo 1, donde baja hacia la Sala de Juntas
  p2a: { x: 208, y: 448 },                 // pasillo 2, saliendo de debajo de la Sala de Juntas
  p2b: { x: 240, y: 448 },                 // pasillo 2, donde entra al pasillo entre Calleros y el Cerebro
  cruce: { x: 240, y: fila(37) },          // de aquí salen los ramales a Calleros y al Cerebro
  boca: { x: 240, y: 704 },                // pasillo 3, llegando al túnel central
  giro: { x: TRONCO.x, y: 704 },           // se alinea con el tronco
  tm: { x: TRONCO.x, y: fila(53) },        // ramales a Terrazas y al Centro de Pensado
  tn: { x: TRONCO.x, y: fila(60) },        // ramal a la Sala de Noticias
};
for (const [clave, e] of Object.entries(ESTACIONES)) NODOS[clave] = centro(e);

// Tramos: la línea principal y los ramales.
export const TRAMOS = [
  ['internet', 'p1a'], ['p1a', 'p1b'], ['p1b', 'p2a'], ['p2a', 'p2b'], ['p2b', 'cruce'], ['cruce', 'boca'], ['boca', 'giro'],
  ['giro', 'tm'], ['tm', 'tn'], ['tn', 'ampliacion'],
  ['cruce', 'calleros'], ['cruce', 'cerebro delta'], ['tm', 'terrazas'], ['tm', 'centro de pensado'], ['tn', 'noticias'],
];
// Los ramales delgados (un canal angosto en el piso) y los tramos anchos de la línea principal, del mismo grueso
// que el túnel central y con tapa de vidrio para caminar encima. Anchos: [x0, y0, x1, y1, 'v' | 'h', hacia dónde
// corre: 1 = abajo o derecha, -1 = arriba o izquierda], en casillas.
export const RAMALES = TRAMOS.slice(-5);
export const ANCHOS = [
  [23, 9, 24, 14, 'v', 1], [12, 13, 24, 14, 'h', -1], [12, 13, 13, 28, 'v', 1], [12, 27, 15, 28, 'h', 1],
  [14, 27, 15, 44, 'v', 1], [14, 43, 16, 44, 'h', 1], [15, 65, 16, 80, 'v', 1],
];
const VECINOS = {};
for (const [a, b] of TRAMOS){ (VECINOS[a] ||= []).push(b); (VECINOS[b] ||= []).push(a); }

// Por dónde viaja algo de una estación a otra: lista de puntos en pixeles, o null si no hay viaje.
export function rutaTunel(de, para){
  if (!ESTACIONES[de] || !ESTACIONES[para] || de === para) return null;
  const previo = { [de]: null }, cola = [de];
  while (cola.length){
    const n = cola.shift();
    if (n === para) break;
    for (const v of VECINOS[n] || []) if (!(v in previo)){ previo[v] = n; cola.push(v); }
  }
  if (!(para in previo)) return null;
  const ruta = [];
  for (let n = para; n; n = previo[n]) ruta.push({ x: NODOS[n].x, y: NODOS[n].y });
  return ruta.reverse();
}

export function largoRuta(ruta){
  let s = 0;
  for (let i = 1; i < ruta.length; i++) s += Math.hypot(ruta[i].x - ruta[i - 1].x, ruta[i].y - ruta[i - 1].y);
  return s;
}

// Dónde va el paquete cuando lleva `s` pixeles recorridos.
export function puntoEnRuta(ruta, s){
  if (s <= 0) return { x: ruta[0].x, y: ruta[0].y };
  for (let i = 1; i < ruta.length; i++){
    const a = ruta[i - 1], b = ruta[i], d = Math.hypot(b.x - a.x, b.y - a.y);
    if (s <= d){ const f = d ? s / d : 0; return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }; }
    s -= d;
  }
  const u = ruta[ruta.length - 1];
  return { x: u.x, y: u.y };
}

const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();

// A qué estación corresponde un cuarto dicho con palabras. El almacén y la memoria están en el Centro de Pensado.
export function estacionDe(texto){
  const s = plano(texto);
  if (!s) return null;
  if (s.includes('calleros')) return 'calleros';
  if (s.includes('cerebro')) return 'cerebro delta';
  if (s.includes('terraza') || s.includes('dragtree')) return 'terrazas';
  if (s.includes('noticia') || s.includes('pantalla') || s.includes('cartelera')) return 'noticias';
  if (s.includes('pensa') || s.includes('memoria') || s.includes('almacen') || s.includes('archiv')) return 'centro de pensado';
  if (s.includes('internet') || s === 'web') return 'internet';
  if (s.includes('ampliacion') || s.includes('obra')) return 'ampliacion';
  return null;
}

const TIPOS = ['archivo', 'nota', 'noticias', 'aviso', 'dato'];

// Deja un envío en limpio, o null si no se puede entregar (sin destino, o de un cuarto a sí mismo).
// `casaDe(autor)` dice en qué cuarto vive quien lo manda, para cuando no dijo desde dónde.
export function envioLimpio(e, casaDe = () => null){
  if (!e || typeof e !== 'object') return null;
  const para = estacionDe(e.para);
  const de = estacionDe(e.de) || estacionDe(casaDe(e.autor || e.de));
  if (!para || !de || de === para) return null;
  const creado = typeof e.creado === 'number' ? e.creado : Date.parse(e.creado);
  const tipo = plano(e.tipo);
  return {
    id: String(e.id ?? `${de}>${para}>${e.creado}`), de, para,
    tipo: TIPOS.includes(tipo) ? tipo : 'nota',
    titulo: String(e.titulo ?? '').trim() || 'Envío', texto: String(e.texto ?? '').trim(),
    autor: String(e.autor ?? '').trim(), creado: Number.isNaN(creado) ? 0 : creado, url: e.url || '',
  };
}

// Todos los envíos válidos, sin repetidos, del más nuevo al más viejo.
export function enviosLimpios(lista, casaDe){
  const vistos = new Set(), out = [];
  for (const crudo of Array.isArray(lista) ? lista : []){
    const e = envioLimpio(crudo, casaDe);
    if (!e || vistos.has(e.id)) continue;
    vistos.add(e.id); out.push(e);
  }
  return out.sort((p, q) => q.creado - p.creado);
}
