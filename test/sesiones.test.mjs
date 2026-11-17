import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sesionesDeRespuesta, agenteDeSesion, estadoDeSesiones, areaDeTexto, modeloDeRespuesta } from '../src/sesiones.js';
import { aplicarReglas } from '../src/reglas.js';

const AHORA = Date.parse('2026-11-14T12:00:00Z');
const lista = [
  { id: 'session_a', title: 'Arreglar el login de la app', session_status: 'SESSION_STATUS_RUNNING', status_bucket: 'SESSION_STATUS_BUCKET_WORKING', origin: 'android', environment_kind: 'anthropic_cloud', task_summary: 'Inspecting repository state and files', updated_at: '2026-11-14T11:00:00Z' },
  { id: 'session_b', title: 'Motor 3D', session_status: 'SESSION_STATUS_IDLE', status_bucket: 'SESSION_STATUS_BUCKET_COMPLETED', origin: 'claude_code_cli', environment_kind: 'bridge', updated_at: '2026-11-14T09:00:00Z', post_turn_summary: { recent_action: 'Quedó listo el motor' } },
  { id: 'session_c', title: 'Control Wii', session_status: 'SESSION_STATUS_IDLE', status_bucket: 'SESSION_STATUS_BUCKET_BLOCKED', origin: 'web_claude_ai', updated_at: '2026-11-10T09:00:00Z', post_turn_summary: { needs_action: 'Mándame el archivo' } },
  { id: 'session_d', title: 'Vieja', session_status: 'SESSION_STATUS_ARCHIVED', status_bucket: 'SESSION_STATUS_BUCKET_COMPLETED', updated_at: '2026-11-14T11:30:00Z' },
];

test('lee la lista venga como objeto, como arreglo o como texto con envoltura', () => {
  assert.equal(sesionesDeRespuesta({ ccr: { data: lista } }).length, 4);
  assert.equal(sesionesDeRespuesta({ data: lista }).length, 4);
  assert.equal(sesionesDeRespuesta(lista).length, 4);
  assert.equal(sesionesDeRespuesta(`<otra nonce="1">\nTexto de aviso.\n    ${JSON.stringify({ ccr: { data: lista } })}\n</otra>`).length, 4);
  assert.deepEqual(sesionesDeRespuesta('sin datos'), []);
  assert.deepEqual(sesionesDeRespuesta(null), []);
});

test('una sesión trabajando va al cuarto que toca y su actividad es ahora', () => {
  const a = agenteDeSesion(lista[0], AHORA);
  assert.equal(a.estado, 'trabajando');
  assert.equal(a.area, 'biblioteca');
  assert.equal(a.actividad, 'Inspecting repository state and files');
  assert.equal(a.nombre, 'Arreglar el login…');
  assert.equal(a.dispositivo, 'android');
  assert.equal(Date.parse(a.ultima_actividad), AHORA);
});

test('una sesión terminada descansa y conserva su última actividad real', () => {
  const a = agenteDeSesion(lista[1], AHORA);
  assert.equal(a.estado, 'terminado');
  assert.equal(a.area, 'descanso');
  assert.equal(a.equipo, 'Laptop');
  assert.equal(a.ultima_actividad, '2026-11-14T09:00:00.000Z');
  assert.equal(a.lo_ultimo, 'Quedó listo el motor');
});

test('las archivadas no entran y las que te esperan lo dicen', () => {
  assert.equal(agenteDeSesion(lista[3], AHORA), null);
  const c = agenteDeSesion(lista[2], AHORA);
  assert.equal(c.estado, 'esperando');
  assert.equal(c.te_pide, 'Mándame el archivo');
});

test('con las reglas: la de hace 4 días ya venció y un supervisor elegido se queda', () => {
  const estado = estadoDeSesiones({ ccr: { data: lista } }, AHORA, (id) => (id === 'session_a' ? 'fable' : null));
  assert.deepEqual(estado.agentes.map((a) => a.id), ['session_a', 'session_b', 'session_c']);
  assert.equal(estado.agentes[0].modelo, 'fable');
  const sin = aplicarReglas({ supervisores: [] }, estado, AHORA);
  assert.deepEqual(sin.agentes.map((a) => a.id), ['session_a', 'session_b']);
  const con = aplicarReglas({ supervisores: [{ clave: 'session_c', id: 'session_c', nombre: 'Control Wii' }] }, estado, AHORA);
  const sup = con.agentes.find((a) => a.rol === 'supervisor');
  assert.equal(sup.id, 'session_c');
  assert.equal(sup.ausente, undefined);
  const falta = aplicarReglas({ supervisores: [{ clave: 'session_x', id: 'session_x', nombre: 'Ya no está', dispositivo: 'android' }] }, estado, AHORA);
  assert.equal(falta.agentes[0].ausente, true);
  assert.equal(falta.agentes[0].id, 'session_x');
});

test('adivina el cuarto por lo que dice que hace', () => {
  assert.equal(areaDeTexto('Searching the web for prices'), 'internet');
  assert.equal(areaDeTexto('Leyendo el código de la pista'), 'biblioteca');
  assert.equal(areaDeTexto('Editing oficina.html'), 'escritorio');
  assert.equal(areaDeTexto('Launching subagents to review'), 'sala de juntas');
  assert.equal(areaDeTexto(''), 'escritorio');
});

test('saca el modelo de los detalles de una sesión', () => {
  assert.equal(modeloDeRespuesta({ session_context: { model: 'claude-opus-5-5' }, external_metadata: { last_served_model: 'claude-haiku-5-5' } }), 'haiku');
  assert.equal(modeloDeRespuesta('{"session_context":{"model":"claude-fable-5-2"}}'), 'fable');
  assert.equal(modeloDeRespuesta({ nada: 1 }), null);
});

// ---------- Sesiones con pase ----------
import { agenteDeVisita, conVisitas } from '../src/sesiones.js';

test('una sesión con pase aparece trabajando en el cuarto que dijo', () => {
  const a = agenteDeVisita('arreglo-login', { nombre: 'Arreglo del login', area: 'biblioteca', actividad: 'Leyendo el código', estado: 'trabajando', modelo: 'claude-sonnet-5-5', equipo: 'Compu', actualizado: '2026-11-14T11:50:00Z' }, AHORA);
  assert.equal(a.id, 'visita-arreglo-login');
  assert.equal(a.area, 'biblioteca');
  assert.equal(a.estado, 'trabajando');
  assert.equal(a.modelo, 'sonnet');
  assert.equal(a.actualizado, new Date(AHORA).toISOString());
  assert.equal(a.ultima_actividad, '2026-11-14T11:50:00.000Z');
});

test('si lleva más de media hora sin avisar, o dijo que terminó, se va a Descanso', () => {
  const vieja = agenteDeVisita('x', { nombre: 'Vieja', area: 'internet', estado: 'trabajando', actualizado: '2026-11-14T10:00:00Z' }, AHORA);
  assert.equal(vieja.area, 'descanso');
  assert.equal(vieja.estado, 'terminado');
  const lista = agenteDeVisita('y', { nombre: 'Lista', estado: 'terminado', actualizado: '2026-11-14T11:59:00Z' }, AHORA);
  assert.equal(lista.area, 'descanso');
  assert.equal(agenteDeVisita('z', { nombre: 'Sin fecha' }, AHORA), null);
});

test('una visita vence a las 24 horas de su último aviso, como cualquier visitante', () => {
  const visitas = [{ id: 'a', nombre: 'De ayer', estado: 'terminado', actualizado: '2026-11-13T11:00:00Z' }, { id: 'b', nombre: 'De hoy', estado: 'terminado', actualizado: '2026-11-14T08:00:00Z' }];
  const { agentes } = aplicarReglas({ venceHoras: 24 }, { agentes: conVisitas([], visitas, AHORA) }, AHORA);
  assert.deepEqual(agentes.map((a) => a.nombre), ['De hoy']);
});

test('una visita que dice de qué sesión es no se duplica', () => {
  const base = estadoDeSesiones({ ccr: { data: lista } }, AHORA).agentes;
  const junto = conVisitas(base, [{ id: 'motor', sesion: 'session_b', nombre: 'Motor 3D', area: 'internet', actividad: 'Buscando texturas', estado: 'trabajando', actualizado: '2026-11-14T11:58:00Z' }], AHORA);
  assert.equal(junto.length, base.length);
  const b = junto.find((a) => a.id === 'session_b');
  assert.equal(b.area, 'internet');
  assert.equal(b.actividad, 'Buscando texturas');
});

test('una sesión con pase puede pasearse por la oficina hasta 3 horas', () => {
  const a = agenteDeVisita('reg', { nombre: 'Registro', area: 'noticias', actividad: 'Viendo el noticiero', estado: 'paseando', actualizado: '2026-11-14T10:00:00Z' }, AHORA);
  assert.equal(a.area, 'noticias');
  assert.equal(a.actividad, 'Viendo el noticiero');
  assert.equal(a.estado, 'por su cuenta');
  assert.equal(a.actualizado, new Date(AHORA).toISOString());
  const vieja = agenteDeVisita('reg', { nombre: 'Registro', area: 'noticias', estado: 'paseando', actualizado: '2026-11-14T08:00:00Z' }, AHORA);
  assert.equal(vieja.area, 'descanso');
  const base = estadoDeSesiones({ ccr: { data: lista } }, AHORA).agentes;
  const junto = conVisitas(base, [{ id: 'm', sesion: 'session_b', area: 'biblioteca', actividad: 'Hojeando libros', estado: 'paseando', actualizado: '2026-11-14T11:00:00Z' }], AHORA);
  const b = junto.find((x) => x.id === 'session_b');
  assert.equal(b.area, 'biblioteca');
  assert.equal(b.estado, 'por su cuenta');
});
