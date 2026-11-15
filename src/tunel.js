// La red del túnel. El túnel central (el tronco) corre por en medio del gran pasillo
// y de él salen ramales a los cuartos principales. En cada cuarto hay una estación:
// ahí los monitos meten lo que mandan (archivos, notas, noticias) y ahí llega lo que
// les mandan. Aquí solo va la geometría y las reglas de los envíos: funciones puras,
// con pruebas. El dibujo está en oficina.html.

const T = 16;
export const TRONCO = { x: 256, y0: 656, y1: 976 };

// tx, ty = casilla del mueble de la estación · lado = hacia dónde sale su tubo
export const ESTACIONES = {
  'calleros':          { tx: 12, ty: 33, lado: 'der', nombre: 'Oficina Calleros' },
  'cerebro delta':     { tx: 17, ty: 33, lado: 'izq', nombre: 'Cerebro Delta' },
  'terrazas':          { tx: 9,  ty: 49, lado: 'der', nombre: 'Oficina Terrazas' },
  'centro de pensado': { tx: 22, ty: 49, lado: 'izq', nombre: 'Centro de Pensado' },
  'noticias':          { tx: 22, ty: 56, lado: 'izq', nombre: 'Sala de Noticias' },
};

const centro = (e) => ({ x: e.tx * T + 8, y: e.ty * T + 8 });
// Los dos cuartos de arriba comparten la bajada por el pasillo de la ampliación hasta la boca del tronco.
const BAJADA = [{ x: 252, y: 33 * T + 8 }, { x: 252, y: TRONCO.y0 - 8 }, { x: TRONCO.x, y: TRONCO.y0 + 6 }];

// Ramal de cada estación: de su mueble hasta donde entra al tronco.
export const RAMALES = {};
for (const [clave, e] of Object.entries(ESTACIONES)){
  const p = centro(e);
  RAMALES[clave] = p.y < TRONCO.y0 ? [p, ...BAJADA] : [p, { x: TRONCO.x, y: p.y }];
}

const igual = (p, q) => p.x === q.x && p.y === q.y;

// Por dónde viaja un paquete de una estación a otra: lista de puntos en pixeles, o null si no hay viaje.
export function rutaTunel(de, para){
  const A = RAMALES[de], B = RAMALES[para];
  if (!A || !B || de === para) return null;
  let comun = 0;                                   // lo que comparten al final ya no se recorre dos veces
  while (comun < A.length - 1 && comun < B.length - 1 && igual(A[A.length - 1 - comun], B[B.length - 1 - comun])) comun++;
  const ida = comun ? A.slice(0, A.length - comun + 1) : A.slice();   // hasta donde se juntan (o hasta el tronco)
  const vuelta = B.slice(0, B.length - comun).reverse();              // y de ahí a la otra estación
  return ida.concat(vuelta);
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
