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
