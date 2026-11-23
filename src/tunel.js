// El periférico. Una línea recorre la oficina de arriba a abajo:
//   Internet -> pasillo 1 -> por debajo de la Sala de Juntas -> pasillo 2 -> pasillo entre Calleros y el
//   Cerebro -> túnel central (el tronco) -> pasillo 4 -> por debajo del cuarto libre de en medio -> Ampliación.
// En el pasillo 4 se abre en dos ramales hacia las alas (la oficina es una T invertida): cada ala tiene su pasillo
// de en medio con el periférico bajando hasta su terminal, y por el pasillo 5 un tramo une las dos alas por abajo.
// Las medidas son las del cuerpo de en medio (columna 0 = su muro izquierdo); el ala oeste queda en columnas
// negativas. La oficina las recorre al cargar con desplazar().
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
  // Cuartos de abajo del cuerpo de en medio
  'espacio d':         { tx: 5,  ty: 69, lado: 'arriba', nombre: 'Espacio libre D',  pie: { tx: 5, ty: 70 } },
  'espacio e':         { tx: 14, ty: 72, lado: 'der',   nombre: 'Espacio libre E',   pie: { tx: 13, ty: 72 } },
  'espacio f':         { tx: 24, ty: 69, lado: 'arriba', nombre: 'Espacio libre F',  pie: { tx: 24, ty: 70 } },
  'taller':            { tx: 17, ty: 96, lado: 'arriba', nombre: 'Taller',           pie: { tx: 17, ty: 97 } },
  'espacio h':         { tx: 24, ty: 96, lado: 'arriba', nombre: 'Espacio libre H',  pie: { tx: 24, ty: 97 } },
  // Ala oeste: en cada piso un cuarto de afuera (der: su tubo sale hacia el pasillo) y uno de adentro
  'oeste 1':           { tx: -15, ty: 72, lado: 'der',  nombre: 'Oeste 1',           pie: { tx: -16, ty: 72 } },
  'oeste 2':           { tx: -8,  ty: 72, lado: 'izq',  nombre: 'Oeste 2',           pie: { tx: -7, ty: 72 } },
  'oeste 3':           { tx: -15, ty: 84, lado: 'der',  nombre: 'Oeste 3',           pie: { tx: -16, ty: 84 } },
  'oeste 4':           { tx: -8,  ty: 84, lado: 'izq',  nombre: 'Oeste 4',           pie: { tx: -7, ty: 84 } },
  'oeste 5':           { tx: -15, ty: 99, lado: 'der',  nombre: 'Oeste 5',           pie: { tx: -16, ty: 99 } },
  'taller 2':          { tx: -8,  ty: 99, lado: 'izq',  nombre: 'Taller 2',          pie: { tx: -7, ty: 99 } },
  'ala oeste':         { tx: -10, ty: 102, lado: 'abajo', nombre: 'Ala Oeste',       pie: { tx: -13, ty: 103 }, boca: { tx: -12, ty: 102 } },
  // Ala este (de izquierda a derecha: primero el de adentro)
  'este 1':            { tx: 39, ty: 72, lado: 'der',   nombre: 'Este 1',            pie: { tx: 38, ty: 72 } },
  'este 2':            { tx: 46, ty: 72, lado: 'izq',   nombre: 'Este 2',            pie: { tx: 47, ty: 72 } },
  'este 3':            { tx: 39, ty: 84, lado: 'der',   nombre: 'Este 3',            pie: { tx: 38, ty: 84 } },
  'este 4':            { tx: 46, ty: 84, lado: 'izq',   nombre: 'Este 4',            pie: { tx: 47, ty: 84 } },
  'este 5':            { tx: 39, ty: 99, lado: 'der',   nombre: 'Este 5',            pie: { tx: 38, ty: 99 } },
  'este 6':            { tx: 46, ty: 99, lado: 'izq',   nombre: 'Este 6',            pie: { tx: 47, ty: 99 } },
  'ala este':          { tx: 41, ty: 102, lado: 'abajo', nombre: 'Ala Este',         pie: { tx: 44, ty: 103 }, boca: { tx: 42, ty: 102 } },
  // El Ala Este es el doble de larga: su segundo tramo es el Estudio de Clipping (edición de video)
  'este 7':            { tx: 62, ty: 72, lado: 'der',   nombre: 'Lounge de diseño',  pie: { tx: 61, ty: 72 } },
  'este 8':            { tx: 69, ty: 72, lado: 'izq',   nombre: 'Diseño aux 1',      pie: { tx: 70, ty: 72 } },
  'este 9':            { tx: 62, ty: 84, lado: 'der',   nombre: 'Diseño aux 2',      pie: { tx: 61, ty: 84 } },
  'este 10':           { tx: 69, ty: 84, lado: 'izq',   nombre: 'Centro de diseño',  pie: { tx: 70, ty: 84 } },
  'este 11':           { tx: 62, ty: 99, lado: 'der',   nombre: 'Este 11',           pie: { tx: 61, ty: 99 } },
  'este 12':           { tx: 69, ty: 99, lado: 'izq',   nombre: 'Diseño aux 3',      pie: { tx: 70, ty: 99 } },
  'ala este 2':        { tx: 64, ty: 102, lado: 'abajo', nombre: 'Estudio de Clipping', pie: { tx: 67, ty: 103 }, boca: { tx: 65, ty: 102 } },
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
  p4: { x: TRONCO.x, y: 66 * T },          // pasillo 4: de aquí salen los ramales a las alas
  ce: { x: TRONCO.x, y: fila(72) },        // ramal al cuarto libre de en medio
  pd: { x: 5 * T + 8, y: 66 * T },         // ramal al cuarto libre de la izquierda
  pf: { x: 24 * T + 8, y: 66 * T },        // ramal al cuarto libre de la derecha
  pt: { x: 17 * T + 8, y: 93 * T },        // pasillo 5: ramal al Taller
  ph: { x: 24 * T + 8, y: 93 * T },        // pasillo 5: ramal al cuarto libre de abajo a la derecha
};
for (const [lado, x] of [['o', -11 * T], ['e', 43 * T], ['f', 66 * T]]){   // el pasillo de en medio de cada ala
  NODOS[lado + '4'] = { x, y: 66 * T };     // donde llega el ramal del pasillo 4
  NODOS[lado + '1'] = { x, y: fila(72) };   // ramales a los cuartos de arriba
  NODOS[lado + '2'] = { x, y: fila(84) };   // a los de en medio
  NODOS[lado + '5'] = { x, y: 93 * T };     // cruce con el pasillo 5
  NODOS[lado + '3'] = { x, y: fila(99) };   // a los de abajo
}
for (const [clave, e] of Object.entries(ESTACIONES)) NODOS[clave] = centro(e);

// Tramos: la línea principal (ancha) y los ramales (delgados, a cada estación).
const TRONCALES = [
  ['internet', 'p1a'], ['p1a', 'p1b'], ['p1b', 'p2a'], ['p2a', 'p2b'], ['p2b', 'cruce'], ['cruce', 'boca'], ['boca', 'giro'],
  ['giro', 'tm'], ['tm', 'tn'], ['tn', 'p4'], ['p4', 'ce'], ['ce', 'ampliacion'],
  ['p4', 'pd'], ['pd', 'o4'], ['p4', 'pf'], ['pf', 'e4'],                                  // los dos ramales a las alas
  ['o4', 'o1'], ['o1', 'o2'], ['o2', 'o5'], ['o5', 'o3'], ['o3', 'ala oeste'],
  ['e4', 'e1'], ['e1', 'e2'], ['e2', 'e5'], ['e5', 'e3'], ['e3', 'ala este'],
  ['o5', 'pt'], ['pt', 'ph'], ['ph', 'e5'],                                                // por el pasillo 5
  ['e4', 'f4'], ['e5', 'f5'], ['f4', 'f1'], ['f1', 'f2'], ['f2', 'f5'], ['f5', 'f3'], ['f3', 'ala este 2'],   // segundo tramo del Ala Este
];
export const RAMALES = [
  ['cruce', 'calleros'], ['cruce', 'cerebro delta'], ['tm', 'terrazas'], ['tm', 'centro de pensado'], ['tn', 'noticias'],
  ['pd', 'espacio d'], ['ce', 'espacio e'], ['pf', 'espacio f'], ['pt', 'taller'], ['ph', 'espacio h'],
  ['o1', 'oeste 1'], ['o1', 'oeste 2'], ['o2', 'oeste 3'], ['o2', 'oeste 4'], ['o3', 'oeste 5'], ['o3', 'taller 2'],
  ['e1', 'este 1'], ['e1', 'este 2'], ['e2', 'este 3'], ['e2', 'este 4'], ['e3', 'este 5'], ['e3', 'este 6'],
  ['f1', 'este 7'], ['f1', 'este 8'], ['f2', 'este 9'], ['f2', 'este 10'], ['f3', 'este 11'], ['f3', 'este 12'],
];
export const TRAMOS = TRONCALES.concat(RAMALES);
// Los ramales delgados (un canal angosto en el piso) y los tramos anchos de la línea principal, del mismo grueso
// que el túnel central y con tapa de vidrio para caminar encima. Anchos: [x0, y0, x1, y1, 'v' | 'h', hacia dónde
// corre: 1 = abajo o derecha, -1 = arriba o izquierda], en casillas.
export const ANCHOS = [
  [23, 9, 24, 14, 'v', 1], [12, 13, 24, 14, 'h', -1], [12, 13, 13, 28, 'v', 1], [12, 27, 15, 28, 'h', 1],
  [14, 27, 15, 44, 'v', 1], [14, 43, 16, 44, 'h', 1], [15, 65, 16, 80, 'v', 1],
  [-12, 65, 14, 66, 'h', -1], [17, 65, 66, 66, 'h', 1],                                    // pasillo 4, hacia las alas
  [-12, 65, -11, 101, 'v', 1], [42, 65, 43, 101, 'v', 1], [65, 65, 66, 101, 'v', 1],        // el pasillo de en medio de cada tramo de ala
  [-12, 92, 66, 93, 'h', 1],                                                                // pasillo 5, de punta a punta
];

// Recorre todo `columnas` casillas a la derecha (la oficina lo hace una vez: su mapa empieza en el ala oeste).
export function desplazar(columnas){
  const dx = columnas * T;
  for (const e of Object.values(ESTACIONES)){ e.tx += columnas; if (e.pie) e.pie.tx += columnas; if (e.boca) e.boca.tx += columnas; }
  for (const n of Object.values(NODOS)) n.x += dx;
  TRONCO.x += dx;
  for (const a of ANCHOS){ a[0] += columnas; a[2] += columnas; }
}
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
  const term = /\bala (oeste|este)( 2)?\b/.exec(s);
  if (term) return 'ala ' + term[1] + (term[2] && term[1] === 'este' ? ' 2' : '');
  const ala = /\b(oeste|este)\s*(\d{1,2})\b/.exec(s);
  if (ala && ESTACIONES[ala[1] + ' ' + ala[2]]) return ala[1] + ' ' + ala[2];
  if (/taller\s*2/.test(s)) return 'taller 2';
  if (/\btaller\b/.test(s)) return 'taller';
  const libre = /espacio(?: libre)? ([a-z])\b/.exec(s);
  if (libre && ESTACIONES['espacio ' + libre[1]]) return 'espacio ' + libre[1];
  if (s.includes('lounge')) return 'este 7';                                       // el Estudio de Clipping
  if (s.includes('centro de diseno') || s.includes('clipping') || s.includes('edicion de video')) return s.includes('estudio de clipping') ? 'ala este 2' : 'este 10';
  const aux = /(?:diseno )?aux(?:iliar)? ?([123])\b/.exec(s);
  if (aux) return { 1: 'este 8', 2: 'este 9', 3: 'este 12' }[aux[1]];
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
