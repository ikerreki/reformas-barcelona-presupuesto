// Convierte docs/informe-aprendizaje.md en un PDF A4 con el estilo de la marca, usando Edge o Chrome sin ventana.
// Uso: node scripts/informe-pdf.mjs  →  docs/informe-aprendizaje.pdf (no se sube a git)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(join(raiz, 'docs', 'informe-aprendizaje.md'), 'utf8');
const salida = join(raiz, 'docs', 'informe-aprendizaje.pdf');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Formato dentro de una línea: `código`, **negrita**, *cursiva*, [enlace](url) y URLs sueltas.
function enLinea(texto) {
  const codigos = [];
  let s = texto.replace(/`([^`]+)`/g, (_, c) => { codigos.push(c); return `\u0000${codigos.length - 1}\u0000`; });
  s = esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2">$2</a>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codigos[i])}</code>`);
}

// Celdas de una fila de tabla, sin partir por las | que van dentro de `código`.
function celdas(fila) {
  const out = [];
  let actual = '', enCodigo = false;
  for (const ch of fila.trim().replace(/^\|/, '').replace(/\|$/, '')) {
    if (ch === '`') enCodigo = !enCodigo;
    if (ch === '|' && !enCodigo) { out.push(actual.trim()); actual = ''; } else actual += ch;
  }
  out.push(actual.trim());
  return out;
}

const lineas = md.split(/\r?\n/);
let html = '';
const esLista = (l) => /^\s*([-*]|\d+\.) /.test(l);
const especial = (l) => /^(```|#{1,4} |---\s*$|\||>)/.test(l) || esLista(l);
for (let i = 0; i < lineas.length;) {
  const l = lineas[i];
  if (!l.trim()) { i++; continue; }
  if (l.startsWith('```')) {
    const lenguaje = l.slice(3).trim();
    const bloque = [];
    for (i++; i < lineas.length && !lineas[i].startsWith('```'); i++) bloque.push(lineas[i]);
    i++;
    html += lenguaje === 'mermaid' ? `<pre class="mermaid">${esc(bloque.join('\n'))}</pre>` : `<pre><code>${esc(bloque.join('\n'))}</code></pre>`;
    continue;
  }
  const h = /^(#{1,4}) (.*)$/.exec(l);
  if (h) { html += `<h${h[1].length}>${enLinea(h[2])}</h${h[1].length}>`; i++; continue; }
  if (/^---\s*$/.test(l)) { html += '<hr>'; i++; continue; }
  if (l.startsWith('|')) {
    const filas = [];
    while (i < lineas.length && lineas[i].startsWith('|')) filas.push(lineas[i++]);
    const cab = celdas(filas[0]);
    const cuerpo = filas.slice(2).map(celdas);
    html += `<table><thead><tr>${cab.map((c) => `<th>${enLinea(c)}</th>`).join('')}</tr></thead><tbody>` +
      cuerpo.map((f) => `<tr>${f.map((c) => `<td>${enLinea(c)}</td>`).join('')}</tr>`).join('') + '</tbody></table>';
    continue;
  }
  if (l.startsWith('>')) {
    const cita = [];
    while (i < lineas.length && lineas[i].startsWith('>')) cita.push(lineas[i++].replace(/^>\s?/, ''));
    html += `<blockquote>${enLinea(cita.join(' '))}</blockquote>`;
    continue;
  }
  if (esLista(l)) {
    const ordenada = /^\s*\d+\. /.test(l);
    const items = [];
    while (i < lineas.length && (esLista(lineas[i]) || (items.length && /^\s{2,}\S/.test(lineas[i])))) {
      if (esLista(lineas[i])) items.push(lineas[i].replace(/^\s*([-*]|\d+\.) /, ''));
      else items[items.length - 1] += ' ' + lineas[i].trim();
      i++;
    }
    const tag = ordenada ? 'ol' : 'ul';
    html += `<${tag}>${items.map((x) => `<li>${enLinea(x)}</li>`).join('')}</${tag}>`;
    continue;
  }
  const parrafo = [];
  while (i < lineas.length && lineas[i].trim() && !especial(lineas[i])) parrafo.push(lineas[i++].trim());
  html += `<p>${enLinea(parrafo.join(' '))}</p>`;
}

const logo = pathToFileURL(join(raiz, 'web', 'assets', 'reformas-barcelona-logo.svg')).href;
const pagina = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe de aprendizaje</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 16mm 15mm 18mm; @bottom-center { content: counter(page) " / " counter(pages); font: 9pt Manrope, sans-serif; color: #6B6B6B; } }
body { font: 10pt/1.55 Manrope, 'Segoe UI', sans-serif; color: #2A2A2A; margin: 0; }
.portada { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #C4552D; padding-bottom: 10px; margin-bottom: 18px; }
.portada img { height: 34px; } .portada span { color: #6B6B6B; font-size: 9pt; }
h1 { font-size: 20pt; line-height: 1.2; margin: 0 0 10px; }
h2 { font-size: 14pt; color: #C4552D; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #E4DDD3; break-after: avoid; }
h3 { font-size: 11.5pt; margin: 16px 0 6px; break-after: avoid; }
p, li { margin: 0 0 7px; } ul, ol { padding-left: 20px; margin: 0 0 8px; }
a { color: #A8451F; text-decoration: none; word-break: break-all; }
code { font: 8.6pt Consolas, monospace; background: #F6F1EA; padding: 1px 4px; border-radius: 3px; word-break: break-word; }
pre { background: #F6F1EA; padding: 10px; border-radius: 6px; font-size: 8.5pt; white-space: pre-wrap; break-inside: avoid; }
pre.mermaid { background: #fff; text-align: center; }
table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; font-size: 8.8pt; }
th { background: #F6F1EA; text-align: left; border-bottom: 2px solid #C4552D; padding: 5px 6px; }
td { border-bottom: 1px solid #E4DDD3; padding: 5px 6px; vertical-align: top; }
tr { break-inside: avoid; }
blockquote { margin: 0 0 12px; padding: 8px 12px; background: #F6F1EA; border-left: 3px solid #C4552D; color: #444; }
hr { border: 0; border-top: 1px solid #E4DDD3; margin: 16px 0; }
</style></head><body>
<div class="portada"><img src="${logo}" alt="Reformas Barcelona"><span>Caso práctico NU Automatiza · Iker Rodríguez</span></div>
${html}
<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
<script>if (window.mermaid) mermaid.initialize({ startOnLoad: true, theme: 'neutral', fontFamily: 'Manrope, sans-serif' });</script>
</body></html>`;

const temporal = join(tmpdir(), 'informe-aprendizaje.html');
writeFileSync(temporal, pagina);

const navegadores = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const navegador = navegadores.find(existsSync);
if (!navegador) throw new Error('No encuentro Edge ni Chrome para imprimir el PDF.');
// Perfil temporal propio: si el navegador ya está abierto, así no le pasa el trabajo a la ventana existente.
execFileSync(navegador, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${join(tmpdir(), 'informe-pdf-perfil')}`,
  '--no-pdf-header-footer', '--print-to-pdf-no-header',
  '--virtual-time-budget=15000', `--print-to-pdf=${salida}`, pathToFileURL(temporal).href], { stdio: 'ignore' });
console.log(`PDF listo: ${salida}`);
