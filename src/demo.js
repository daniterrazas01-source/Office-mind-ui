// Datos inventados para ver la oficina sin sesiones reales, en el mismo formato
// que el estado de verdad. Las fechas son relativas a ahora, así se ven todos los
// casos: supervisores, visitantes trabajando, en descanso, a punto de irse y uno
// ya vencido (que no debe aparecer).
export function estadoDemo() {
  const ahora = Date.now();
  const hace = (min) => new Date(ahora - min * 60000).toISOString();
  const v = (id, nombre, area, actividad, min, extra = {}) => ({
    id, nombre, area, actividad, estado: min > 1 ? 'esperando' : 'trabajando', modo: 'normal', modelo: 'sonnet',
    dispositivo: 'laptop', origen: 'laptop', actualizado: hace(Math.min(min, 0.2)), ultima_actividad: hace(min), ...extra,
  });
  return {
    actualizado: hace(0),
    demo: true,
    agentes: [
      v('calleros', 'Calleros', 'calleros', 'Revisando pendientes', 0.1, { modelo: 'opus', dispositivo: 'laptop-windows' }),
      v('terrazas-demo', 'DragTree demo', 'terrazas', 'Editando arbol.js', 0.1, { dispositivo: 'tableta-android', origen: 'tableta-android', persona: 'Alberto Terrazas' }),
      v('demo-1', 'Arreglar login', 'escritorio', 'Editando login.js', 0.1, { modelo: 'fable', modo: 'ultra' }),
      v('demo-2', 'Precios de envío', 'internet', 'Buscando en internet', 0.2, { modelo: 'haiku' }),
      v('demo-3', 'Resumen correos', 'biblioteca', 'Leyendo notas.md', 0.3),
      v('demo-4', 'Plan de la app', 'sala de juntas', 'Pidiendo ayuda a un ayudante', 0.4, { modelo: 'opus' }),
      v('demo-5', 'Script respaldo', 'descanso', 'Esperando instrucciones', 45, { actualizado: hace(45) }),
      v('demo-6', 'Duda de Excel', 'descanso', 'Esperando instrucciones', 600, { actualizado: hace(600), modelo: 'haiku' }),
      v('demo-7', 'Revisión de PR', 'descanso', 'Esperando instrucciones', 22 * 60, { actualizado: hace(22 * 60) }),
      v('demo-8', 'Sesión de ayer', 'descanso', 'Esperando instrucciones', 25 * 60, { actualizado: hace(25 * 60) }),
    ],
    archivos_recientes: ['src/arbol.js', 'src/pista.js', 'src/boleta.js', 'index.html', 'css/tema.css', 'notas/ideas.md', 'src/carrera.js', 'README.md', 'src/sonido.js']
      .map((nombre, i) => ({ nombre, origen: 'tableta-android', area: 'terrazas', fecha: hace(5 + i * 40), tipo: i % 3 ? 'editado' : 'creado' })),
  };
}
