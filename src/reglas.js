// Reglas de quién está en la oficina. Funciones puras: no tocan la pantalla ni la
// red, así que la página las usa y se prueban con `npm test`.
//
// Trabajan sobre el mismo estado que ya publican la laptop y la tableta:
//   { actualizado, agentes: [{ id, nombre, area, actividad, estado, modelo,
//                              dispositivo, actualizado, ... }], archivos_recientes }
//
// Supervisores: los decides tú en config/oficina.json. Nunca se van. Si su sesión
// no reporta, se quedan dormidos esperando instrucciones.
// Visitantes: cualquier otra sesión. Se quedan mientras se usan y, desde su última
// actividad, tienen un plazo (24 h por defecto) antes de salir de la oficina.

export const HORA = 60 * 60 * 1000;

export function opciones(config = {}) {
  return {
    venceMs: (config.venceHoras ?? 24) * HORA,
    avisoMs: (config.avisoHoras ?? 3) * HORA,
  };
}

const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// ¿Esta sesión es de este supervisor? Se amarra por id, por proyecto (nombre de
// la carpeta) o por un pedazo del nombre o título de la sesión.
export function esDelSupervisor(sup, r) {
  if (sup.id && plano(r.id) === plano(sup.id)) return true;
  if (sup.proyecto && plano(r.proyecto) === plano(sup.proyecto)) return true;
  if (sup.titulo) {
    const t = plano(sup.titulo);
    if (plano(r.nombre).includes(t) || plano(r.titulo).includes(t)) return true;
  }
  return false;
}

function fecha(s) {
  if (typeof s === 'number') return s;
  if (!s) return null;
  const v = Date.parse(s);
  return Number.isNaN(v) ? null : v;
}

// Cuándo fue la última vez que la sesión hizo algo de verdad. El recolector manda
// `ultima_actividad`; los avisos viejos solo traen `actualizado`.
export function ultimaActividad(r, raiz) {
  return fecha(r.ultima_actividad) ?? fecha(r.actualizado) ?? fecha(raiz);
}

export function idSupervisor(sup) {
  return 'sup-' + (plano(sup.nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x');
}

// Recibe el estado tal como llega y devuelve la lista de monitos que la oficina
// debe mostrar: todos los supervisores (con o sin sesión) y los visitantes que
// todavía no vencen.
export function aplicarReglas(config = {}, datos = {}, ahora = Date.now()) {
  const op = opciones(config);
  const lista = (Array.isArray(datos.agentes) ? datos.agentes : []).filter((r) => r && typeof r === 'object');
  const usados = new Set();
  const agentes = [];

  for (const sup of config.supervisores ?? []) {
    const suyas = lista
      .filter((r) => !usados.has(r) && esDelSupervisor(sup, r))
      .sort((a, b) => (ultimaActividad(b, datos.actualizado) ?? 0) - (ultimaActividad(a, datos.actualizado) ?? 0));
    suyas.forEach((r) => usados.add(r));
    const sesion = suyas[0];
    const fijo = { id: idSupervisor(sup), nombre: sup.nombre, rol: 'supervisor' };
    if (sup.aspecto) fijo.aspecto = sup.aspecto;
    if (sesion) {
      agentes.push({ ...sesion, ...fijo, sesion_id: sesion.id, sesion_nombre: sesion.titulo || sesion.nombre, sesiones_extra: suyas.length - 1 });
    } else {
      agentes.push({
        ...fijo, ausente: true, area: 'descanso', actividad: '', estado: 'inactivo',
        modelo: sup.modelo, dispositivo: sup.dispositivo, persona: sup.persona, equipo: sup.equipo,
      });
    }
  }

  const expirados = [];
  for (const r of lista) {
    if (usados.has(r)) continue;
    const ultima = ultimaActividad(r, datos.actualizado);
    if (ultima == null) {            // sin ninguna fecha no se puede vencer: se muestra
      agentes.push({ ...r, rol: 'visitante' });
      continue;
    }
    const vence = ultima + op.venceMs;
    if (vence <= ahora) { expirados.push(String(r.id ?? r.nombre ?? '')); continue; }
    agentes.push({ ...r, rol: 'visitante', vence, se_va_pronto: vence - ahora < op.avisoMs });
  }

  return { agentes, expirados };
}

export function textoPlazo(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 1) return 'ya';
  if (m < 60) return `en ${m} min`;
  return `en ${Math.floor(m / 60)} h`;
}
