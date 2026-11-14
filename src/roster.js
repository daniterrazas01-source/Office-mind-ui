// Reglas de quién está en la oficina. Funciones puras: no tocan la pantalla ni la red,
// así que las usa la página y se pueden probar con `node --test`.
//
// Supervisores: los decides tú en config/oficina.json. Nunca se van; si su sesión
// no está activa, se quedan dormidos en su escritorio.
// Visitantes: cualquier otra sesión que aparezca en el estado. Se quedan mientras
// trabajan y, desde su última actividad, tienen un plazo (24 h por defecto) antes
// de irse de la oficina.

export const MINUTO = 60 * 1000;
export const HORA = 60 * MINUTO;

export const PREDETERMINADO = {
  venceHoras: 24,        // sin actividad por este tiempo -> el visitante se va
  activoMinutos: 5,      // actividad más reciente que esto -> está trabajando ahora
  avisoHoras: 3,         // le quedan menos de estas horas -> se ve desvaneciéndose
};

const norm = (t) => String(t ?? '').trim().toLowerCase();

export function opciones(config = {}) {
  return {
    venceMs: (config.venceHoras ?? PREDETERMINADO.venceHoras) * HORA,
    activoMs: (config.activoMinutos ?? PREDETERMINADO.activoMinutos) * MINUTO,
    avisoMs: (config.avisoHoras ?? PREDETERMINADO.avisoHoras) * HORA,
  };
}

// ¿Esta sesión pertenece a este supervisor? Se puede amarrar por id de sesión,
// por proyecto (nombre de la carpeta) o por un pedazo del título.
export function esDelSupervisor(sup, sesion) {
  if (sup.id && sesion.id === sup.id) return true;
  if (sup.proyecto && norm(sesion.proyecto) === norm(sup.proyecto)) return true;
  if (sup.titulo && norm(sesion.titulo).includes(norm(sup.titulo))) return true;
  return false;
}

// Estado visible: 'trabajando' (está haciendo algo), 'esperando' (terminó un turno
// y te espera a ti), 'descanso' (lleva rato sin actividad) o 'ausente' (un
// supervisor sin sesión).
export function estadoDe(sesion, ahora, op) {
  if (!sesion) return 'ausente';
  const quieto = ahora - sesion.ultimaActividad;
  if (quieto < op.activoMs) {
    return sesion.estado === 'esperando' ? 'esperando' : 'trabajando';
  }
  if (sesion.estado === 'trabajando' && quieto < op.activoMs * 3) return 'trabajando';
  return 'descanso';
}

function limpiar(s) {
  if (!s) return null;
  const ultima = typeof s.ultimaActividad === 'number' ? s.ultimaActividad : Date.parse(s.ultimaActividad);
  if (!s.id || !Number.isFinite(ultima)) return null;
  return { ...s, ultimaActividad: ultima };
}

// Junta la configuración con las sesiones del estado y decide quién se ve.
export function armarOficina(config = {}, sesionesCrudas = [], ahora = Date.now()) {
  const op = opciones(config);
  const sesiones = sesionesCrudas.map(limpiar).filter(Boolean);
  const usadas = new Set();

  const supervisores = (config.supervisores ?? []).map((sup, i) => {
    const suyas = sesiones
      .filter((s) => esDelSupervisor(sup, s))
      .sort((a, b) => b.ultimaActividad - a.ultimaActividad);
    suyas.forEach((s) => usadas.add(s.id));
    const sesion = suyas[0] ?? null;
    return {
      tipo: 'supervisor',
      clave: `sup:${i}:${sup.nombre}`,
      nombre: sup.nombre,
      color: sup.color,
      escritorio: i,
      sesion,
      sesionesExtra: suyas.length - (sesion ? 1 : 0),
      estado: estadoDe(sesion, ahora, op),
    };
  });

  const visitantes = [];
  const expirados = [];
  for (const s of sesiones) {
    if (usadas.has(s.id)) continue;
    const vence = s.ultimaActividad + op.venceMs;
    if (vence <= ahora) {
      expirados.push(s.id);
      continue;
    }
    const quedaMs = vence - ahora;
    visitantes.push({
      tipo: 'visitante',
      clave: `vis:${s.id}`,
      nombre: s.titulo || s.proyecto || s.id.slice(0, 8),
      sesion: s,
      estado: estadoDe(s, ahora, op),
      venceEn: vence,
      quedaMs,
      seVaPronto: quedaMs < op.avisoMs,
    });
  }
  visitantes.sort((a, b) => b.sesion.ultimaActividad - a.sesion.ultimaActividad);

  return { supervisores, visitantes, expirados };
}

// Escritorio fijo para cada visitante: sale de su id, así no brinca de lugar
// cuando otro llega o se va.
export function asignarLugares(claves, cupo) {
  const lugares = new Map();
  const ocupado = new Array(cupo).fill(false);
  for (const clave of claves) {
    let h = 2166136261;
    for (const c of clave) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    let lugar = -1;
    for (let k = 0; k < cupo; k++) {
      const j = (h + k) % cupo;
      if (!ocupado[j]) { lugar = j; break; }
    }
    if (lugar >= 0) ocupado[lugar] = true;
    lugares.set(clave, lugar); // -1 = no cupo, se queda en la lista
  }
  return lugares;
}

export function textoTiempo(ms) {
  const m = Math.max(0, Math.round(ms / MINUTO));
  if (m < 1) return 'ahora';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r && h < 10 ? `${h} h ${r} min` : `${h} h`;
}
