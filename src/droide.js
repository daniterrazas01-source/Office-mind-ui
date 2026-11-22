// El droide de la oficina: reglas de limpieza y de horario. Funciones puras, con pruebas.
//
// Qué es basura (lo que se acumula de más):
//   - Sala de Noticias: los avisos de la oficina con más de DIAS_AVISO días.
//   - Almacén: los resúmenes diarios de los monitos con más de DIAS_REPORTE días (ya no salen en pantalla)
//     y los envíos del túnel con más de DIAS_ENVIO días.
// Nunca es basura lo que habla de un proyecto protegido (Drag Tree, Calleros, Cerebro Delta… la lista se cambia
// en la oficina). Lo que tira no se borra luego luego: va a la papelera del Taller y ahí se puede rescatar
// durante DIAS_PAPELERA días; después la compactadora lo borra de verdad.

export const DIAS_AVISO = 4;
export const DIAS_REPORTE = 7;
export const DIAS_ENVIO = 3;
export const DIAS_PAPELERA = 7;
export const PROTEGIDOS = ['Drag Tree', 'Calleros', 'Cerebro Delta'];
const DIA = 24 * 3600000;

const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// ¿El texto habla de algún proyecto protegido? Sin espacios ni acentos: "DragTree", "drag-tree" y "Drag Tree" cuentan igual.
export function protegido(texto, lista = PROTEGIDOS){
  const t = plano(texto);
  return !!t && (Array.isArray(lista) ? lista : []).some((p) => { const q = plano(p); return q.length >= 3 && t.includes(q); });
}

// La lista que se escribe en la oficina ("Drag Tree, Calleros, …") en limpio, sin repetidos.
export function listaProtegidos(texto){
  const out = [], vistos = new Set();
  for (const p of String(texto ?? '').split(/[,\n;]+/)){
    const s = p.trim().replace(/\s+/g, ' ').slice(0, 40), k = plano(s);
    if (k.length >= 3 && !vistos.has(k)){ vistos.add(k); out.push(s); }
  }
  return out;
}

const cuando = (v) => { const n = typeof v === 'number' ? v : Date.parse(v); return Number.isNaN(n) ? null : n; };
const textoDe = (o) => {
  if (!o || typeof o !== 'object') return String(o ?? '');
  const partes = [];
  for (const v of Object.values(o)) partes.push(typeof v === 'object' ? textoDe(v) : String(v ?? ''));
  return partes.join(' ');
};

// Lo que el droide puede recoger ahorita, por cuarto. Cada cosa trae `ruta` (el documento en la base),
// `datos` (para poder regresarla desde la papelera), su título y de quién es.
export function basura({ avisos = [], monitos = [], envios = [] } = {}, ahora, lista = PROTEGIDOS){
  const noticias = [], almacen = [];
  for (const a of Array.isArray(avisos) ? avisos : []){
    const t = cuando(a && a.creado);
    if (!a || !a.id || t == null || ahora - t <= DIAS_AVISO * DIA || protegido(textoDe(a), lista)) continue;
    noticias.push({ tipo: 'aviso', ruta: 'avisos/' + a.id, titulo: a.titulo || 'Aviso', de: 'Oficina', creado: t, datos: sinId(a) });
  }
  for (const m of Array.isArray(monitos) ? monitos : []){
    for (const r of Array.isArray(m && m.reportes) ? m.reportes : []){
      const t = cuando(r && r.creado) ?? cuando(r && r.id);
      if (!r || !r.id || t == null || ahora - t <= DIAS_REPORTE * DIA || protegido(textoDe(r), lista)) continue;
      almacen.push({ tipo: 'resumen', ruta: `monitos/${m.id}/reportes/${r.id}`, titulo: r.titulo || 'Resumen del ' + r.id, de: m.nombre || m.id, creado: t, datos: sinId(r) });
    }
  }
  for (const e of Array.isArray(envios) ? envios : []){
    const t = cuando(e && e.creado);
    if (!e || !e.id || t == null || ahora - t <= DIAS_ENVIO * DIA || protegido(textoDe(e), lista)) continue;
    almacen.push({ tipo: 'envío', ruta: 'envios/' + e.id, titulo: e.titulo || 'Envío', de: e.autor || e.de || '', creado: t, datos: sinId(e) });
  }
  const viejo = (p, q) => p.creado - q.creado;
  return { noticias: noticias.sort(viejo), almacen: almacen.sort(viejo) };
}
function sinId(o){ const c = Object.assign({}, o); delete c.id; delete c.version; return c; }

// Nombre del documento en la papelera (una sola pieza: las diagonales pasan a "~").
export const idPapelera = (ruta) => String(ruta).replace(/\//g, '~');

// Lo que ya cumplió su tiempo en la papelera y la compactadora borra para siempre.
export function paraCompactar(papelera, ahora){
  return (Array.isArray(papelera) ? papelera : []).filter((p) => { const t = cuando(p && p.tirado); return t != null && ahora - t > DIAS_PAPELERA * DIA; });
}

// ---------- Horario del droide ----------
// Hace sus rondas de limpieza a las 10:00, a las 15:00 y media hora antes de cerrar. Si nadie tenía la oficina
// abierta a esa hora, la hace en cuanto alguien la abra (mientras siga abierta la oficina).
const aMin = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1] % 24) * 60 + (+m[2] % 60) : null; };
export function rondas(horario){
  const abre = aMin(horario && horario.abre) ?? 360, cierra = aMin(horario && horario.cierra) ?? 1170;
  const dentro = (m) => (abre < cierra ? m >= abre && m < cierra : m >= abre || m < cierra);
  const lista = [600, 900, (cierra + 1440 - 30) % 1440].filter(dentro);
  return [...new Set(lista)].sort((a, b) => a - b);
}

// La última ronda que ya tocó (como fecha), o null si hoy todavía no toca ninguna. `minutosDelDia(t)` = la hora local.
export function ultimaRonda(ahora, horario, minutosDelDia){
  const r = rondas(horario), m = minutosDelDia(ahora);
  const hoy = r.filter((x) => x <= m);
  if (hoy.length) return ahora - (m - hoy[hoy.length - 1]) * 60000;
  if (!r.length) return null;
  return ahora - (m + 1440 - r[r.length - 1]) * 60000;        // la última de ayer
}

// ¿Le toca salir a limpiar? Solo si ya pasó una ronda desde su última limpieza y hay algo que recoger.
export function tocaLimpiar(ahora, horario, ultimaLimpieza, hayBasura, minutosDelDia){
  if (!hayBasura) return false;
  const r = ultimaRonda(ahora, horario, minutosDelDia);
  return r != null && (cuando(ultimaLimpieza) ?? 0) < r;
}

// Mantenimiento: una vez al día, a la 1:00 p.m., pasa 10 minutos en la máquina de reparación.
export const MANTENIMIENTO = { desde: 13 * 60, min: 10 };
export function enMantenimiento(ahora, minutosDelDia){
  const m = minutosDelDia(ahora);
  return m >= MANTENIMIENTO.desde && m < MANTENIMIENTO.desde + MANTENIMIENTO.min;
}
