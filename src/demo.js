// Datos inventados para ver la oficina sin sesiones reales, en el mismo formato
// que el estado de verdad. Las fechas son relativas a ahora, así se ven todos los
// casos: supervisores, visitantes trabajando, en descanso, a punto de irse y uno
// ya vencido (que no debe aparecer).
const ABIERTO = Date.now();   // los envíos de ejemplo tienen hora fija desde que se abrió la página
export function estadoDemo() {
  const ahora = Date.now();
  const desde = (min) => new Date(ABIERTO - min * 60000).toISOString();
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
    monitos: [{
      id: 'nitro', nombre: 'Nitro', casa: 'terrazas', aspecto: 'gorra_roja', modelo: 'sonnet', horario: 'Diario, 7:23 a.m.',
      descripcion: 'Reportero de arrancones. Cada mañana busca las noticias y te deja el resumen aquí. (Ejemplo.)',
      frases: ['¿Ya viste los tiempos de ayer?', 'Huele a llanta quemada…', '¡Luz verde!'],
      rutina: [{ area: 'terrazas', actividad: 'Revisando el carro' }, { area: 'biblioteca', actividad: 'Leyendo el reglamento' }, { area: 'centro de pensado', actividad: 'Pensando la nota de mañana' }, { area: 'terrazas', actividad: 'Revisando el buzón del túnel' }],
      estado: 'listo', area: 'centro de pensado', actividad: 'Armando el resumen', actualizado: hace(0),
      reportes: [{ id: 'ejemplo', fecha: 'Ejemplo', creado: desde(90), titulo: 'Así se verá un resumen', intro: 'Esto es un resumen de muestra, no son noticias reales.',
        puntos: [{ titulo: 'Primer tema de ejemplo', resumen: 'Aquí va lo más importante en dos o tres líneas.', fuente: 'Nombre de la fuente' }],
        capsulas: [{ tipo: 'cómo funciona', titulo: 'Cápsula de ejemplo', texto: 'Un dato corto para la pantalla.' }], cierre: '¡Luz verde!',
        enviado: desde(0.3), envios: [{ para: 'almacen', tipo: 'archivo', titulo: 'Resumen del día (ejemplo)', texto: 'Así se ve un archivo que Nitro manda a guardar al almacén.' }] }],
      memoria: [{ id: 'pendientes', titulo: 'Pendientes', texto: '- Ejemplo: dar seguimiento a la final.', actualizado: hace(60) }],
    }],
    envios: [
      { id: 'ej-2', de: 'terrazas', para: 'calleros', tipo: 'nota', autor: 'Nitro', titulo: 'Lo más importante de hoy (ejemplo)', texto: 'Una nota corta para la Oficina Calleros.', creado: desde(0.1) },
      { id: 'ej-3', de: 'centro de pensado', para: 'cerebro delta', tipo: 'dato', autor: 'Nitro', titulo: 'Dato para recordar (ejemplo)', texto: 'Algo que vale la pena guardar en el Cerebro.', creado: desde(300) },
      { id: 'ej-4', de: 'internet', para: 'noticias', tipo: 'noticias', autor: 'Nitro', titulo: 'Noticias para la pantalla (ejemplo)', texto: 'Lo que va a salir hoy en la Sala de Noticias.', creado: desde(0) },
    ],
    visitas: [{ id: 'ejemplo', nombre: 'Sesión con pase', area: 'biblioteca', actividad: 'Leyendo el manual', estado: 'trabajando', modelo: 'sonnet', equipo: 'Teléfono', actualizado: hace(2) }],
    avisos: [{ id: 'ejemplo', titulo: 'Aviso de ejemplo', texto: 'Aquí saldrán los cambios de la oficina.', creado: hace(120) }],
    archivos_recientes: ['src/arbol.js', 'src/pista.js', 'src/boleta.js', 'index.html', 'css/tema.css', 'notas/ideas.md', 'src/carrera.js', 'README.md', 'src/sonido.js']
      .map((nombre, i) => ({ nombre, origen: 'tableta-android', area: 'terrazas', fecha: hace(5 + i * 40), tipo: i % 3 ? 'editado' : 'creado' })),
  };
}
