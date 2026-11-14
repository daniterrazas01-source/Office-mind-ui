import { armarOficina, textoTiempo } from './roster.js';
import { dibujar, etiquetas, acomodar, W, H } from './oficina.js';
import { estadoDemo } from './demo.js';

const CADA_MS = 10000;
const params = new URLSearchParams(location.search);
const forzarDemo = params.has('demo');

const lienzo = document.getElementById('lienzo');
const g = lienzo.getContext('2d');
const escena = document.createElement('canvas');
escena.width = W;
escena.height = H;
const ge = escena.getContext('2d');

let config = { supervisores: [] };
let estado = { sesiones: [] };
let senal = 'demo';
let oficina = armarOficina(config, [], Date.now());
let zonas = [];
let seleccionado = params.get('ver') || null;

const ETIQUETA = { trabajando: 'trabajando', esperando: 'te espera', descanso: 'descanso', ausente: 'sin sesión' };

async function cargarJSON(url) {
  const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function actualizar() {
  try { config = await cargarJSON('config/oficina.json'); } catch { /* se queda la anterior */ }
  document.getElementById('titulo').textContent = config.nombre || 'Office Mind';
  if (forzarDemo) {
    estado = estadoDemo(config);
    senal = 'demo';
  } else {
    try {
      estado = await cargarJSON(params.get('estado') || 'estado.json');
      senal = estado.demo ? 'demo' : 'vivo';
    } catch {
      // Sin recolector (por ejemplo en GitHub Pages): se ve el demo.
      if (senal !== 'vivo') { estado = estadoDemo(config); senal = 'demo'; } else senal = 'caido';
    }
  }
}

function pintarSenal() {
  const el = document.getElementById('senal');
  el.className = senal;
  el.textContent = { vivo: 'EN VIVO', demo: 'DEMO', caido: 'SIN SEÑAL' }[senal];
}

function fila(p, ahora) {
  const li = document.createElement('li');
  li.dataset.clave = p.clave;
  if (p.clave === seleccionado) li.classList.add('sel');
  if (p.seVaPronto) li.classList.add('pronto');
  const punto = document.createElement('i');
  punto.className = `punto ${p.estado}`;
  const nom = document.createElement('span');
  nom.className = 'nom';
  nom.textContent = p.tipo === 'supervisor' && p.sesion ? `${p.nombre} · ${p.sesion.titulo}` : p.nombre;
  const info = document.createElement('span');
  info.className = 'info';
  if (p.tipo === 'visitante') info.textContent = `se va en ${textoTiempo(p.venceEn - ahora)}`;
  else info.textContent = p.sesion ? `hace ${textoTiempo(ahora - p.sesion.ultimaActividad)}` : 'fijo';
  li.append(punto, nom, info);
  li.title = ETIQUETA[p.estado];
  return li;
}

function pintarListas(ahora) {
  const sup = document.getElementById('listaSup');
  const vis = document.getElementById('listaVis');
  sup.replaceChildren(...oficina.supervisores.map((p) => fila(p, ahora)));
  if (!oficina.supervisores.length) sup.innerHTML = '<p class="vacio">Agrega supervisores en config/oficina.json</p>';
  vis.replaceChildren(...oficina.visitantes.map((p) => fila(p, ahora)));
  if (!oficina.visitantes.length) vis.innerHTML = '<p class="vacio">Nadie de visita.</p>';
  const { fuera } = acomodar(oficina);
  document.getElementById('tituloVis').textContent =
    `VISITANTES (${oficina.visitantes.length})${fuera.length ? ` · ${fuera.length} en el pasillo` : ''}`;
}

function pintarFicha(ahora) {
  const ficha = document.getElementById('ficha');
  const p = [...oficina.supervisores, ...oficina.visitantes].find((x) => x.clave === seleccionado);
  if (!p) { ficha.className = ''; ficha.replaceChildren(); return; }
  ficha.className = 'abierta';
  const s = p.sesion;
  const datos = [
    ['Rol', p.tipo === 'supervisor' ? 'Supervisor (no se va)' : 'Visitante'],
    ['Estado', ETIQUETA[p.estado]],
  ];
  if (s) {
    datos.push(['Sesión', s.titulo || '—'], ['Proyecto', s.proyecto || '—']);
    if (s.equipo) datos.push(['Equipo', s.equipo]);
    datos.push(['Última actividad', `hace ${textoTiempo(ahora - s.ultimaActividad)}`]);
  }
  if (p.tipo === 'visitante') datos.push(['Se va', `en ${textoTiempo(p.venceEn - ahora)} si no hace nada`]);
  if (p.sesionesExtra) datos.push(['Otras sesiones', `${p.sesionesExtra} más de este supervisor`]);
  const h3 = document.createElement('h3');
  h3.textContent = p.nombre;
  const dl = document.createElement('dl');
  for (const [k, v] of datos) {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    dl.append(dt, dd);
  }
  ficha.replaceChildren(h3, dl);
}

function recalcular() {
  const ahora = Date.now();
  oficina = armarOficina(config, estado.sesiones, ahora);
  pintarSenal();
  pintarListas(ahora);
  pintarFicha(ahora);
}

function cuadro(t) {
  const caja = lienzo.getBoundingClientRect();
  const escala = Math.max(2, Math.ceil((caja.width * devicePixelRatio) / W));
  if (lienzo.width !== W * escala) { lienzo.width = W * escala; lienzo.height = H * escala; }
  ge.clearRect(0, 0, W, H);
  zonas = dibujar(ge, oficina, Date.now(), { seleccionado });
  g.imageSmoothingEnabled = false;
  g.drawImage(escena, 0, 0, lienzo.width, lienzo.height);
  etiquetas(g, zonas, escala, lienzo.width / caja.width, seleccionado);
  requestAnimationFrame(cuadro);
  return t;
}

function elegir(clave) {
  seleccionado = seleccionado === clave ? null : clave;
  recalcular();
}

lienzo.addEventListener('click', (ev) => {
  const caja = lienzo.getBoundingClientRect();
  const x = ((ev.clientX - caja.left) / caja.width) * W;
  const y = ((ev.clientY - caja.top) / caja.height) * H;
  const z = [...zonas].reverse().find((z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);
  elegir(z ? z.p.clave : null);
});
document.querySelector('aside').addEventListener('click', (ev) => {
  const li = ev.target.closest('li');
  if (li) elegir(li.dataset.clave);
});

await actualizar();
recalcular();
requestAnimationFrame(cuadro);
setInterval(async () => { await actualizar(); recalcular(); }, CADA_MS);
setInterval(recalcular, 30000); // los plazos avanzan aunque no lleguen datos nuevos
