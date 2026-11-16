// La pantalla de la Sala de Noticias cambia cada 5 minutos. Funciones puras, con pruebas.

export const CADA_PANTALLA = 5 * 60000;

// El orden en que sale todo: una noticia del día, luego otra cosa (cápsula, tarea, aviso),
// otra noticia… Las noticias se repiten más seguido porque son lo que más importa ver.
export function turnos(noticias, otros){
  if (!noticias.length) return otros.slice();
  if (!otros.length) return noticias.slice();
  const out = [], n = Math.max(noticias.length, otros.length);
  for (let i = 0; i < n; i++) out.push(noticias[i % noticias.length], otros[i % otros.length]);
  return out;
}

// Qué toca ahorita y a qué hora cambia.
export function turnoDe(ahora, total){
  const vuelta = Math.floor(ahora / CADA_PANTALLA);
  return { i: total ? vuelta % total : 0, vuelta, cambia: (vuelta + 1) * CADA_PANTALLA };
}

// ¿La noticia es de hoy? (de un resumen hecho en las últimas 24 horas)
export function esDeHoy(creado, ahora){
  const v = typeof creado === 'number' ? creado : Date.parse(creado);
  return !Number.isNaN(v) && ahora - v < 24 * 3600000 && ahora - v > -3600000;
}

// ---------- Secciones ----------
// Cada monito tiene su sección en el noticiero (Arrancones, Fórmula 1…) y la oficina tiene la suya (avisos y
// tareas). En pantalla salen por turnos, sin mezclarse, y las noticias viejas ya no salen: se quedan en la
// lista de "anteriores" de su sección.

const DIA = 24 * 3600000;
export const DIAS_FRESCA = 7;   // una noticia con más días que esto ya es vieja
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Cuántos días tiene una noticia. `cuando` es lo que escribió el monito ("hoy", "ayer", "13 de noviembre",
// "octubre de 2026") y `creado` es cuándo hizo el resumen. Si no se entiende, cuenta desde el resumen.
export function edadDias(cuando, creado, ahora){
  const c = typeof creado === 'number' ? creado : Date.parse(creado);
  const desde = Number.isNaN(c) ? ahora : c;
  const t = plano(cuando), fecha = /(\d{1,2})\s+de\s+([a-z]+)/.exec(t), mes = MESES.findIndex((m) => t.includes(m));
  const hace = (m, d) => {                         // días desde ese día y mes hasta el resumen
    const a = new Date(desde).getUTCFullYear();
    let f = Date.UTC(a, m, d);
    if (f > desde + DIA) f = Date.UTC(a - 1, m, d);
    return Math.max(0, Math.floor((desde - f) / DIA));
  };
  let dias = 0;
  if (fecha && MESES.includes(fecha[2])) dias = hace(MESES.indexOf(fecha[2]), +fecha[1]);
  else if (/\bayer\b/.test(t)) dias = 1;
  else if (/anteayer|antier/.test(t)) dias = 2;
  else if (mes >= 0) dias = hace(mes, 15);         // solo dijo el mes
  return dias + Math.max(0, (ahora - desde) / DIA);
}

export function secciones(monitos, avisos, ahora){
  const out = [], tareas = [];
  for (const m of Array.isArray(monitos) ? monitos : []){
    const de = m.nombre || m.id, r = (m.reportes || [])[0];
    const s = { id: m.id, titulo: String(m.seccion || de).toUpperCase(), de, aspecto: m.aspecto, fecha: r ? r.fecha || r.id || '' : '', noticias: [], capsulas: [], viejas: [] };
    if (r){
      for (const p of Array.isArray(r.puntos) ? r.puntos : []){
        const edad = edadDias(p.cuando, r.creado, ahora);
        const it = { tipo: edad < 1 ? 'NOTICIA DE HOY' : edad < 2 ? 'NOTICIA DE AYER' : 'NOTICIA', noticia: true, edad, cuando: edad < 2 ? '' : p.cuando || r.fecha || '',
          titulo: p.titulo, texto: p.resumen, fuente: p.fuente, url: p.url, de };
        (edad <= DIAS_FRESCA ? s.noticias : s.viejas).push(it);
      }
      s.noticias.sort((a, b) => a.edad - b.edad);  // primero lo más nuevo
      for (const c of Array.isArray(r.capsulas) ? r.capsulas : []) s.capsulas.push({ tipo: String(c.tipo || 'cápsula').toUpperCase(), titulo: c.titulo, texto: c.texto, fuente: c.fuente, url: c.url, de });
    }
    s.items = turnos(s.noticias, s.capsulas);
    out.push(s);
    const pend = (m.memoria || []).find((x) => x.id === 'pendientes');
    tareas.push({ tipo: 'TAREA', titulo: `${de}: ${m.horario || 'tarea programada'}`, texto: pend && pend.texto ? `Pendientes: ${pend.texto}` : m.descripcion || '', de });
  }
  const oficina = (Array.isArray(avisos) ? avisos : []).slice(0, 6).map((a) => ({ tipo: 'AVISO', titulo: a.titulo, texto: a.texto, de: 'Oficina' }));
  out.push({ id: 'oficina', titulo: 'OFICINA', de: 'Oficina', fecha: '', noticias: [], capsulas: [], viejas: [], items: oficina.concat(tareas) });
  return out;
}

// Qué sección y qué cosa de ella toca en la vuelta número `vuelta`: tres rondas de las secciones de los
// monitos y luego una de la oficina. Cada sección lleva su propia cuenta, así nada se salta ni se repite de más.
export function turnoSeccion(secs, vuelta){
  const con = secs.map((s, i) => i).filter((i) => secs[i].items.length);
  const mon = con.filter((i) => secs[i].id !== 'oficina'), ofi = con.filter((i) => secs[i].id === 'oficina');
  const ciclo = mon.length ? [...mon, ...mon, ...mon, ...ofi] : ofi;
  if (!ciclo.length) return null;
  const pos = vuelta % ciclo.length, s = ciclo[pos];
  const veces = Math.floor(vuelta / ciclo.length) * ciclo.filter((x) => x === s).length + ciclo.slice(0, pos).filter((x) => x === s).length;
  return { s, i: veces % secs[s].items.length };
}
