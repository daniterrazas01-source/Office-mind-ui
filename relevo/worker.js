// Relevo de la oficina (Cloudflare Worker).
// Guarda lo último que avisó cada sesión de Claude y se lo da a la página web.
//   GET  /estado  -> cualquiera lo lee (sin caché). Mismo formato que estado.json.
//   POST /aviso   -> una sesión avisa qué hace. Pide "Authorization: Bearer <llave>".
//   POST /llave   -> la primera vez, guarda la llave que trae (así nadie la tiene que escribir en el panel de
//                    Cloudflare). Después ya no se puede cambiar por aquí. La llave también puede ser el secreto ESCRITURA.
// Un solo Durable Object guarda todo: lo que se escribe se lee al instante.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
const HORAS_GUARDADO = 48;     // la página aplica el vencimiento de 24 h; aquí solo se limpia lo muy viejo
const MAX_ARCHIVOS = 40;
const CAMPOS = ['id', 'nombre', 'titulo', 'persona', 'proyecto', 'area', 'actividad', 'estado', 'modo', 'modelo', 'dispositivo', 'origen', 'equipo', 'ayudante_actividad', 'ayudante_area', 'esfuerzo'];

export class Estado {
  constructor(state, env) { this.state = state; this.env = env || {}; }

  async fetch(request) {
    const url = new URL(request.url), escritura = this.env.ESCRITURA || '';
    const trae = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const guardada = await this.state.storage.get('llave');
    if (request.method === 'POST' && url.pathname === '/llave') {
      if (guardada || escritura) return json({ error: 'ya tiene llave' }, 409);
      if (trae.length < 16) return json({ error: 'llave muy corta (mínimo 16)' }, 400);
      await this.state.storage.put('llave', trae);
      return json({ ok: true });
    }
    if (request.method === 'POST' && url.pathname === '/aviso' && !(trae && (trae === escritura || trae === guardada))) return json({ error: 'sin permiso' }, 401);
    if (request.method === 'GET' && url.pathname === '/estado') {
      const agentes = (await this.state.storage.get('agentes')) || {};
      const archivos = (await this.state.storage.get('archivos')) || [];
      const limite = Date.now() - HORAS_GUARDADO * 3600e3;
      const vivos = Object.values(agentes).filter((a) => Date.parse(a.ultima_actividad || a.actualizado) > limite);
      return json({ actualizado: new Date().toISOString(), agentes: vivos, archivos_recientes: archivos });
    }
    if (request.method === 'POST' && url.pathname === '/aviso') {
      let d;
      try { d = await request.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
      if (!d || typeof d.id !== 'string' || !d.id || d.id.length > 80) return json({ error: 'falta id' }, 400);
      if (d.quitar === true){                                         // la sesión se cerró o era de prueba: se quita
        const agentes = (await this.state.storage.get('agentes')) || {};
        delete agentes[d.id]; await this.state.storage.put('agentes', agentes);
        return json({ ok: true, quitado: d.id });
      }
      const ahora = new Date().toISOString();
      const agente = { actualizado: ahora, ultima_actividad: ahora };
      for (const k of CAMPOS) if (typeof d[k] === 'string') agente[k] = d[k].slice(0, 200);
      if (agente.ayudante_actividad) agente.ayudante_visto = ahora;   // lo que hace su ayudante (subagente), para que la oficina se lo encargue a su agente
      const agentes = (await this.state.storage.get('agentes')) || {};
      const limite = Date.now() - HORAS_GUARDADO * 3600e3;
      for (const [k, a] of Object.entries(agentes)) if (!(Date.parse(a.ultima_actividad || a.actualizado) > limite)) delete agentes[k];
      // "esperando" no cuenta como actividad nueva: conserva la última vez que de verdad trabajó
      if (agente.estado !== 'trabajando' && agentes[d.id]) agente.ultima_actividad = agentes[d.id].ultima_actividad || ahora;
      agentes[d.id] = agente;
      await this.state.storage.put('agentes', agentes);
      if (d.archivo && typeof d.archivo.nombre === 'string') {
        let archivos = (await this.state.storage.get('archivos')) || [];
        const f = { nombre: d.archivo.nombre.slice(0, 200), tipo: String(d.archivo.tipo || '').slice(0, 20), origen: agente.dispositivo || '', sesion: d.id, fecha: ahora };
        archivos = [f, ...archivos.filter((x) => x.nombre !== f.nombre)].slice(0, MAX_ARCHIVOS);
        await this.state.storage.put('archivos', archivos);
      }
      return json({ ok: true });
    }
    return json({ error: 'no encontrado' }, 404);
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    const id = env.ESTADO.idFromName('oficina');
    return env.ESTADO.get(id).fetch(request);
  },
};
