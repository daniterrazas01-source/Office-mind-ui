// Dibuja la oficina en pixel art. La escena se pinta a baja resolución (W x H)
// y se agranda sin suavizar; los nombres se escriben encima a resolución
// completa para que se lean bien en el teléfono.

import { asignarLugares } from './roster.js';

export const W = 400;
export const H = 240;

const C = {
  pared: '#2b2e4a', paredLuz: '#353a5c', zoclo: '#1c1e33',
  pisoA: '#5a4b6e', pisoB: '#544567',
  pisoSupA: '#6b5340', pisoSupB: '#634c3a',
  vidrio: 'rgba(170,220,255,0.18)', marcoVidrio: '#8fb3cc',
  escritorio: '#9b6a43', escritorioSombra: '#6e4a2e', escritorioBorde: '#c08a5a',
  escSup: '#5c3a24', escSupBorde: '#8a5a38',
  monitor: '#1d1f2b', pantalla: '#7fe0ff', pantallaApagada: '#2e3242',
  silla: '#3b3f58', sillon: '#b8566b', sillonOscuro: '#8e3f52',
  alfombra: '#3f6b5e', alfombraBorde: '#2f5348',
  planta: '#4fa060', maceta: '#a0603a', cafe: '#d8d8e0',
  texto: '#f4efe6', sombra: 'rgba(0,0,0,0.25)',
};

const PIELES = ['#f2c9a0', '#e0ac7e', '#c68a5c', '#9c6440', '#6e4428'];
const PELOS = ['#2a1d14', '#5a3a22', '#a8692e', '#e0c070', '#d8d8d8', '#3a2a4a', '#b0402e'];
const CAMISAS = ['#e86a5a', '#5a8ee8', '#58c08a', '#e8c25a', '#b07ae0', '#e88ac0', '#5ac8c8', '#f09a4a'];

function hash(t) {
  let h = 2166136261;
  for (const c of t) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

function apariencia(p) {
  const h = hash(p.clave);
  return {
    piel: PIELES[h % PIELES.length],
    pelo: PELOS[(h >>> 4) % PELOS.length],
    camisa: p.color || CAMISAS[(h >>> 8) % CAMISAS.length],
    peinado: (h >>> 12) % 3,
  };
}

// ---------- lugares ----------

const ZONA_SUP = { x: 0, ancho: 132 };
const PUESTOS_VIS = [];
for (let fila = 0; fila < 3; fila++) {
  for (let col = 0; col < 4; col++) PUESTOS_VIS.push({ x: 150 + col * 52, y: 58 + fila * 48 });
}
const SILLONES = [];
for (let i = 0; i < 8; i++) SILLONES.push({ x: 158 + i * 20 + (i >= 4 ? 18 : 0), y: 212 });

function puestosSupervisor(n) {
  const cols = n <= 2 ? 1 : 2;
  const filas = Math.max(1, Math.ceil(n / cols));
  const alto = (H - 40) / filas;
  const out = [];
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const fila = Math.floor(i / cols);
    const x = cols === 1 ? 50 : 16 + col * 60;
    out.push({ x, y: 40 + fila * alto + Math.min(26, alto / 2 - 18) });
  }
  return out;
}

// Decide dónde está cada quien. Los que trabajan o te esperan ocupan escritorio;
// los que descansan se van a los sillones; si no cabe nadie más, se quedan solo
// en la lista.
export function acomodar(oficina) {
  const sup = puestosSupervisor(oficina.supervisores.length);
  const activos = oficina.visitantes.filter((v) => v.estado !== 'descanso');
  const quietos = oficina.visitantes.filter((v) => v.estado === 'descanso');
  const lugaresEsc = asignarLugares(activos.map((v) => v.clave), PUESTOS_VIS.length);
  const lugaresSil = asignarLugares(quietos.map((v) => v.clave), SILLONES.length);
  const escena = [];
  oficina.supervisores.forEach((p, i) => escena.push({ p, donde: 'supSilla', ...sup[i] }));
  for (const v of activos) {
    const l = lugaresEsc.get(v.clave);
    if (l >= 0) escena.push({ p: v, donde: 'silla', ...PUESTOS_VIS[l] });
  }
  for (const v of quietos) {
    const l = lugaresSil.get(v.clave);
    if (l >= 0) escena.push({ p: v, donde: 'sillon', ...SILLONES[l] });
  }
  const fuera = oficina.visitantes.filter((v) => !escena.some((e) => e.p === v));
  return { escena, fuera, puestosSup: sup };
}

// ---------- dibujo ----------

function r(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }

function cuarto(g, t, nombre) {
  // piso
  for (let y = 28; y < H; y += 8) {
    for (let x = 0; x < W; x += 8) {
      const sup = x < ZONA_SUP.ancho;
      const par = ((x + y) / 8) % 2 === 0;
      r(g, x, y, 8, 8, sup ? (par ? C.pisoSupA : C.pisoSupB) : (par ? C.pisoA : C.pisoB));
    }
  }
  // pared con ventanas
  r(g, 0, 0, W, 28, C.pared);
  r(g, 0, 24, W, 4, C.zoclo);
  for (let x = 146; x < W - 20; x += 64) {
    r(g, x, 5, 34, 15, '#1a2238');
    const cielo = (Math.floor(t / 60000) % 2) ? '#2c3e70' : '#2a3a68';
    r(g, x + 1, 6, 32, 13, cielo);
    r(g, x + 16, 6, 2, 13, '#1a2238');
    r(g, x + 5 + ((t / 900) % 24 | 0), 9, 1, 1, '#fff6c0');
  }
  // letrero de supervisores y reloj
  r(g, 14, 6, 104, 14, C.paredLuz);
  r(g, 14, 19, 104, 1, '#ffd36a');
  const d = new Date(t);
  r(g, W - 22, 6, 14, 14, '#e8e2d0');
  r(g, W - 15, 8, 1, 6, '#222');
  const min = d.getMinutes() / 60 * 6.28;
  r(g, W - 15 + Math.round(Math.sin(min) * 4), 13 - Math.round(Math.cos(min) * 4), 1, 1, '#c03030');
  // muro de vidrio
  r(g, ZONA_SUP.ancho, 28, 3, H - 28, C.marcoVidrio);
  g.fillStyle = C.vidrio;
  g.fillRect(ZONA_SUP.ancho - 2, 28, 2, H - 28);
  r(g, ZONA_SUP.ancho, 170, 3, 24, C.pisoA); // puerta
  // lounge
  r(g, 146, 196, 196, 40, C.alfombraBorde);
  r(g, 148, 198, 192, 36, C.alfombra);
  // cafetera y plantas
  r(g, 360, 190, 22, 30, '#585e78');
  r(g, 362, 192, 18, 8, '#2a2d3d');
  r(g, 366, 194, 2, 2, (t / 500 | 0) % 2 ? '#ff5050' : '#702020');
  r(g, 368, 206, 6, 6, C.cafe);
  maceta(g, 386, 210);
  maceta(g, 4, 216);
  maceta(g, 116, 216);
  maceta(g, 386, 34);
  return nombre;
}

function maceta(g, x, y) {
  r(g, x + 2, y + 10, 8, 8, C.maceta);
  r(g, x, y, 12, 10, C.planta);
  r(g, x + 3, y - 4, 6, 5, C.planta);
  r(g, x + 2, y + 2, 2, 2, '#6fc080');
}

function escritorio(g, x, y, encendido, t, grande) {
  const ancho = grande ? 40 : 32;
  const dx = grande ? -4 : 0;
  // monitor detrás, a la izquierda
  r(g, x + dx + 2, y + 2, 14, 10, C.monitor);
  r(g, x + dx + 3, y + 3, 12, 8, encendido ? C.pantalla : C.pantallaApagada);
  if (encendido && (t / 300 | 0) % 3) r(g, x + dx + 4, y + 5, 6, 1, '#e6fbff');
  r(g, x + dx + 8, y + 12, 2, 2, C.monitor);
  // cubierta
  r(g, x + dx - 2, y + 14, ancho, 4, grande ? C.escSupBorde : C.escritorioBorde);
  r(g, x + dx - 2, y + 18, ancho, 8, grande ? C.escSup : C.escritorio);
  r(g, x + dx - 2, y + 26, ancho, 2, C.escritorioSombra);
  if (grande) {
    r(g, x + dx + 26, y + 15, 8, 2, '#ffd36a'); // placa
    r(g, x + dx + 28, y + 10, 4, 4, '#e8e2d0'); // taza
  }
}

// Personaje sentado; (x, y) es la esquina de arriba del escritorio.
function persona(g, x, y, ap, pose, t, esSup) {
  const px = x + 17;
  let py = y - 2;
  const tecleo = pose === 'trabajando' ? ((t / 140 | 0) % 2) : 0;
  const dormido = pose === 'ausente';
  if (dormido) py += 6;
  // silla
  if (pose !== 'sillon') {
    r(g, px - 2, y - 4, 14, 18, esSup ? '#2a2236' : C.silla);
    if (esSup) r(g, px - 2, y - 7, 14, 4, '#2a2236');
  }
  // cuerpo
  r(g, px, py + 8, 10, 8, ap.camisa);
  if (esSup) {
    r(g, px + 4, py + 9, 2, 5, '#c03a3a'); // corbata
    r(g, px + 4, py + 8, 2, 1, '#ffffff');
  }
  // cabeza
  r(g, px + 1, py, 8, 8, ap.piel);
  if (!dormido) {
    r(g, px + 2, py + 3, 1, 2, '#1a1a1a');
    r(g, px + 7, py + 3, 1, 2, '#1a1a1a');
  }
  // pelo
  r(g, px + 1, py - 1, 8, 2, ap.pelo);
  if (ap.peinado === 0) r(g, px, py, 1, 4, ap.pelo), r(g, px + 9, py, 1, 4, ap.pelo);
  if (ap.peinado === 1) r(g, px + 1, py + 1, 3, 1, ap.pelo);
  if (ap.peinado === 2) r(g, px, py, 1, 7, ap.pelo), r(g, px + 9, py, 1, 7, ap.pelo);
  if (dormido) r(g, px + 1, py + 2, 8, 2, ap.pelo);
  // brazos
  if (pose === 'sillon') {
    r(g, px - 2, py + 9, 2, 5, ap.camisa);
    r(g, px + 10, py + 9, 2, 4, ap.camisa);
    r(g, px + 10, py + 7, 3, 3, C.cafe); // taza
  } else if (!dormido) {
    r(g, px - 2, py + 10 - tecleo, 2, 6, ap.camisa);
    r(g, px + 10, py + 10 - (1 - tecleo) * (pose === 'trabajando' ? 1 : 0), 2, 6, ap.camisa);
  }
}

function burbuja(g, x, y, tipo, t) {
  if (tipo === 'esperando') {
    const sube = (t / 400 | 0) % 2;
    r(g, x, y - sube, 11, 8, '#fff7d6');
    r(g, x + 2, y + 8 - sube, 2, 2, '#fff7d6');
    for (let i = 0; i < 3; i++) r(g, x + 2 + i * 3, y + 3 - sube, 1, 2, '#2b2e4a');
  } else if (tipo === 'zz') {
    const k = (t / 700 | 0) % 3;
    for (let i = 0; i <= k; i++) {
      const zx = x + i * 4;
      const zy = y - i * 4;
      r(g, zx, zy, 3, 1, '#cfd8ff');
      r(g, zx + 1, zy + 1, 1, 1, '#cfd8ff');
      r(g, zx, zy + 2, 3, 1, '#cfd8ff');
    }
  }
}

function sillon(g, x, y) {
  r(g, x - 1, y - 4, 20, 6, C.sillonOscuro);
  r(g, x - 1, y + 2, 20, 10, C.sillon);
  r(g, x - 1, y + 12, 20, 2, C.sillonOscuro);
}

// Pinta todo y devuelve las zonas tocables (en coordenadas de la escena).
export function dibujar(g, oficina, t, opciones = {}) {
  const { escena } = acomodar(oficina);
  cuarto(g, t);

  const zonas = [];
  for (const s of SILLONES) sillon(g, s.x, s.y);

  // los supervisores sin sesión y los escritorios vacíos
  const ocupados = new Set(escena.filter((e) => e.donde === 'silla').map((e) => `${e.x},${e.y}`));
  for (const p of PUESTOS_VIS) {
    if (!ocupados.has(`${p.x},${p.y}`)) escritorio(g, p.x, p.y, false, t, false);
  }

  const orden = [...escena].sort((a, b) => a.y - b.y);
  for (const e of orden) {
    const ap = apariencia(e.p);
    const esSup = e.p.tipo === 'supervisor';
    const desvanece = e.p.seVaPronto ? 0.45 + 0.2 * Math.sin(t / 500) : 1;
    g.globalAlpha = desvanece;
    if (e.donde === 'sillon') {
      persona(g, e.x - 17, e.y - 2, ap, 'sillon', t, false);
      if (Date.now() - e.p.sesion.ultimaActividad > 3600e3) burbuja(g, e.x + 12, e.y - 12, 'zz', t);
      zonas.push({ p: e.p, x: e.x - 2, y: e.y - 6, w: 20, h: 20, etiqueta: { x: e.x + 8, y: e.y - 10, ancho: 0 } });
    } else {
      const pose = e.p.estado;
      persona(g, e.x, e.y, ap, pose, t, esSup);
      escritorio(g, e.x, e.y, pose === 'trabajando' || pose === 'esperando', t, esSup);
      if (pose === 'esperando') burbuja(g, e.x + 28, e.y - 16, 'esperando', t);
      if (pose === 'ausente' || (esSup && pose === 'descanso')) burbuja(g, e.x + 28, e.y - 8, 'zz', t);
      zonas.push({ p: e.p, x: e.x - 4, y: e.y - 8, w: 40, h: 36, etiqueta: { x: e.x + 14, y: e.y - 10, ancho: esSup ? 58 : 50 } });
    }
    g.globalAlpha = 1;
  }
  if (opciones.seleccionado) {
    const z = zonas.find((z) => z.p.clave === opciones.seleccionado);
    if (z) {
      g.strokeStyle = '#ffd36a';
      g.lineWidth = 1;
      g.strokeRect(z.x + 0.5, z.y + 0.5, z.w, z.h);
    }
  }
  return zonas;
}

// Nombres encima de cada quien, a resolución completa. Si no caben, se recortan;
// los del sillón solo aparecen al tocarlos (la lista los muestra todos).
// pxPorCss: cuántos píxeles del lienzo mide un píxel de pantalla.
export function etiquetas(g, zonas, escala, pxPorCss, seleccionado) {
  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const tam = Math.max(Math.round(escala * 4.2), Math.round(9 * pxPorCss));
  g.font = `700 ${Math.round(escala * 6)}px "Silkscreen", monospace`;
  g.fillStyle = '#ffd36a';
  g.fillText('SUPERVISORES', 66 * escala, 13 * escala);
  g.font = `400 ${tam}px "Silkscreen", monospace`;
  const pad = tam * 0.4;
  const orden = [...zonas].sort((a, b) => (a.p.clave === seleccionado) - (b.p.clave === seleccionado));
  for (const z of orden) {
    const elegido = z.p.clave === seleccionado;
    const max = elegido ? Infinity : z.etiqueta.ancho * escala - pad * 2;
    let texto = z.p.nombre;
    if (g.measureText(texto).width > max) {
      while (texto.length > 1 && g.measureText(`${texto}…`).width > max) texto = texto.slice(0, -1);
      if (texto.length < 4) continue;
      texto = `${texto.trimEnd()}…`;
    }
    const x = z.etiqueta.x * escala;
    const y = z.etiqueta.y * escala;
    const w = g.measureText(texto).width + pad * 2;
    g.globalAlpha = z.p.seVaPronto && !elegido ? 0.7 : 1;
    g.fillStyle = elegido ? '#ffd36a' : 'rgba(20,18,36,0.85)';
    g.fillRect(x - w / 2, y - tam * 0.7, w, tam * 1.4);
    g.fillStyle = elegido ? '#16142a' : z.p.tipo === 'supervisor' ? '#ffd36a' : C.texto;
    g.fillText(texto, x, y + 1);
  }
  g.globalAlpha = 1;
  g.restore();
}
