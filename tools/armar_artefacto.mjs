#!/usr/bin/env node
// Arma la versión de la oficina que se publica como Artifact en claude.ai:
// un solo archivo, sin <html>/<head>/<body> (el visor los pone) y con los
// módulos de src/ metidos dentro, porque ahí no se cargan archivos aparte.
//
//   node tools/armar_artefacto.mjs [salida.html]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const salida = process.argv[2] || path.join(RAIZ, 'dist', 'artefacto.html');
const html = fs.readFileSync(path.join(RAIZ, 'oficina.html'), 'utf8');

const entre = (a, b, desde = 0) => { const i = html.indexOf(a, desde); const j = html.indexOf(b, i + a.length); if (i < 0 || j < 0) throw new Error('No encontré ' + a); return html.slice(i + a.length, j); };
const estilo = entre('<style>', '</style>');
const cuerpo = entre('<body>', '<script>');
let codigo = entre('<script type="module">', '</script>');

// Cada `import { a, b } from './src/x.js'` se cambia por el módulo metido en su propia función.
let modulos = '';
codigo = codigo.replace(/^import\s*\{([^}]+)\}\s*from\s*'\.\/(src\/[\w.-]+)';\s*$/gm, (_, nombres, archivo) => {
  const fuente = fs.readFileSync(path.join(RAIZ, archivo), 'utf8');
  if (/^import\s/m.test(fuente)) throw new Error(archivo + ' importa otros módulos: no se puede meter así');
  const lista = nombres.split(',').map((n) => n.trim()).filter(Boolean);
  modulos += `const { ${lista.join(', ')} } = (() => {\n${fuente.replace(/^export\s+/gm, '')}\nreturn { ${lista.join(', ')} };\n})();\n`;
  return '';
});
if (/^import\s/m.test(codigo)) throw new Error('Quedó un import sin resolver');

const pagina = `<title>Oficina · Monitoreo</title>
<style>${estilo}</style>
${cuerpo.trim()}
<script>
(() => {
${modulos}${codigo.trim()}
})();
</script>
`;
fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, pagina);
console.log(`${salida}  (${Math.round(pagina.length / 1024)} KB)`);
