// Datos inventados para ver la oficina sin sesiones reales. Las fechas son
// relativas a ahora, así se ven todos los casos: trabajando, esperando, en
// descanso, a punto de irse.
export function estadoDemo(config = {}) {
  const ahora = Date.now();
  const hace = (min) => new Date(ahora - min * 60000).toISOString();
  const sup = config.supervisores ?? [];
  const deSup = sup.slice(0, Math.max(0, sup.length - 1)).map((s, i) => ({
    id: s.id || `demo-sup-${i}`,
    titulo: s.titulo || `Trabajo de ${s.nombre}`,
    proyecto: s.proyecto || '',
    estado: i % 2 ? 'esperando' : 'trabajando',
    ultimaActividad: hace(i % 2 ? 2 : 0.3),
  }));
  const visitantes = [
    ['Arreglar login del dashboard', 'trabajando', 0.5],
    ['Investigar precios de envío', 'esperando', 1],
    ['Resumen de correos', 'trabajando', 2],
    ['Script de respaldo', 'descanso', 45],
    ['Landing de producto nuevo', 'descanso', 180],
    ['Pregunta rápida de Excel', 'descanso', 600],
    ['Revisión de PR', 'descanso', 22 * 60],
    ['Sesión de ayer (ya venció)', 'descanso', 25 * 60],
  ].map(([titulo, estado, min], i) => ({
    id: `demo-vis-${i}`,
    titulo,
    proyecto: 'demo',
    estado: estado === 'descanso' ? 'esperando' : estado,
    ultimaActividad: hace(min),
  }));
  return { generado: new Date(ahora).toISOString(), equipo: 'demo', demo: true, sesiones: [...deSup, ...visitantes] };
}
