// Convierte tus sesiones de Claude Code (compu, tableta, teléfono, nube) en los
// monitos de la oficina. Dentro de claude.ai la página pide la lista de sesiones
// con tu propia cuenta (conector "Claude Code Remote") y esto la traduce al mismo
// formato de estado que ya usa la oficina. Funciones puras, con pruebas.

const limpio = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();
const recortar = (t, n) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const plano = (t) => limpio(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// La respuesta puede llegar como objeto o como texto con el JSON adentro.
export function sesionesDeRespuesta(payload) {
  let p = payload;
  if (typeof p === 'string') {
    let i = p.indexOf('{"ccr"');
    if (i < 0) i = p.indexOf('{');
    const j = p.lastIndexOf('}');
    if (i < 0 || j <= i) return [];
    try { p = JSON.parse(p.slice(i, j + 1)); } catch { return []; }
  }
  if (!p || typeof p !== 'object') return [];
  const lista = Array.isArray(p) ? p : (p.ccr && p.ccr.data) || p.data || p.sessions || [];
  return Array.isArray(lista) ? lista.filter((s) => s && typeof s === 'object' && s.id) : [];
}

// A qué cuarto va según lo que dice que está haciendo.
export function areaDeTexto(texto) {
  const t = plano(texto);
  if (!t) return 'escritorio';
  if (/\b(sub)?agent|ayudante|delegat|deleg|coordin|workflow/.test(t)) return 'sala de juntas';
  if (/\bweb\b|internet|online|\burl|pagina|sitio|naveg|brows|fetch|descarg|download|search(ing)? (the )?(web|online)/.test(t)) return 'internet';
  if (/\bread|leyendo|\bleer|revis|review|inspect|explor|analiz|analy[sz]|investig|research|buscando|\bbusca|search|look(ing)? (at|for|into)|estudi|\bgrep|understand|entend/.test(t)) return 'biblioteca';
  return 'escritorio';
}

function equipoDe(s) {
  const origen = plano(s.origin), amb = plano(s.environment_kind);
  if (origen.includes('android')) return { dispositivo: 'android', equipo: 'Android' };
  if (origen.includes('ios') || origen.includes('iphone') || origen.includes('ipad')) return { dispositivo: 'ios', equipo: 'iPhone' };
  if (amb.includes('bridge') || origen.includes('cli') || origen.includes('desktop')) return { dispositivo: 'laptop', equipo: 'Laptop' };
  if (origen.includes('web')) return { dispositivo: 'web', equipo: 'Web' };
  return { dispositivo: 'nube', equipo: 'Nube' };
}

// Una sesión -> un monito. Las archivadas no entran (ya las cerraste).
export function agenteDeSesion(s, ahora = Date.now(), modelo = null) {
  const cubeta = plano(s.status_bucket), status = plano(s.session_status || s.status);
  if (status.includes('archived')) return null;
  const trabajando = cubeta ? cubeta.includes('working') : status.includes('running');
  const ultima = Date.parse(s.updated_at || s.created_at) || ahora;
  const titulo = limpio(s.title) || 'Sesión sin título';
  const resumen = s.post_turn_summary || {};

  let estado = 'terminado', area = 'descanso', actividad = 'Esperando instrucciones';
  if (trabajando) {
    estado = 'trabajando';
    actividad = limpio(s.task_summary) || 'Trabajando';
    area = areaDeTexto(s.task_summary);
  } else if (cubeta.includes('failed')) {
    estado = 'error';
  } else if (cubeta.includes('blocked')) {
    estado = 'esperando';
    actividad = 'Esperando tu respuesta';
  }

  // Mientras trabaja, su última actividad es ahora; si no, lo último que hizo.
  const cuando = new Date(trabajando ? ahora : ultima).toISOString();
  return {
    id: String(s.id),
    nombre: recortar(titulo, 18),
    titulo,
    area, actividad, estado,
    modo: 'normal',
    modelo,
    ...equipoDe(s),
    origen: limpio(s.origin),
    actualizado: cuando,
    ultima_actividad: cuando,
    te_pide: limpio(resumen.needs_action),
    lo_ultimo: limpio(resumen.recent_action),
  };
}

// La lista completa, en el formato de estado de la oficina.
export function estadoDeSesiones(payload, ahora = Date.now(), modeloDe = () => null) {
  const agentes = [];
  for (const s of sesionesDeRespuesta(payload)) {
    const a = agenteDeSesion(s, ahora, modeloDe(String(s.id)));
    if (a) agentes.push(a);
  }
  return { actualizado: new Date(ahora).toISOString(), agentes, archivos_recientes: [] };
}

// De los detalles de una sesión saca qué modelo la atiende (haiku, sonnet, opus o fable).
export function modeloDeRespuesta(payload) {
  let texto;
  try { texto = typeof payload === 'string' ? payload : JSON.stringify(payload); } catch { return null; }
  if (!texto) return null;
  const hallado = /last_served_model\\?"\s*:\s*\\?"([^"\\]+)/.exec(texto) || /"model\\?"\s*:\s*\\?"([^"\\]+)/.exec(texto) || /configured_model\\?"\s*:\s*\\?"([^"\\]+)/.exec(texto);
  if (!hallado) return null;
  const n = hallado[1].toLowerCase();
  return ['haiku', 'sonnet', 'opus', 'fable'].find((m) => n.includes(m)) || null;
}
