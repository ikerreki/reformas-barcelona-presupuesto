// Empaquetador: convierte el motor (engine/*.js, ES modules) en código que se puede pegar
// en un nodo Code de n8n, que no admite import/export.
//
// Cada módulo se envuelve en su propio ámbito  const __pricing = (() => { …; return { … }; })();
// para que sus nombres internos no choquen con los de otros módulos, y al final se exponen
// las funciones públicas. Después va el cuerpo específico del nodo (n8n/nodes/<nombre>.js).
//
// Uso:  node n8n/build.mjs   → genera n8n/generated/*.workflow.js a partir de n8n/src/*.workflow.js,
//                               sustituyendo cada '@@CODE:nombre@@' por el código del nodo.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');
// Orden de dependencias: cada módulo solo importa de los anteriores.
const MODULOS = ['catalogo', 'tarifas', 'formato', 'etiquetas', 'pricing', 'hoja', 'numeracion', 'guardrail', 'plantilla', 'prompt', 'render', 'foto'];

function envolverModulo(nombre) {
  const fuente = readFileSync(join(RAIZ, 'engine', `${nombre}.js`), 'utf8');
  const exportados = [];
  const dependencias = [...fuente.matchAll(/^import\s*\{[^}]*\}\s*from\s*'\.\/([\w-]+)\.js'/gm)].map((m) => m[1]);
  const cuerpo = fuente
    // En n8n se copia sin comentarios (el original comentado vive en engine/).
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\n{2,}/g, '\n')
    .replace(/^import\s*\{([^}]*)\}\s*from\s*'\.\/([\w-]+)\.js';?\s*$/gm, (_, nombres, mod) => `const {${nombres}} = __${mod};`)
    .replace(/^export\s+(async\s+function|function|const|let)\s+([A-Za-z_$][\w$]*)/gm, (_, tipo, id) => {
      exportados.push(id);
      return `${tipo} ${id}`;
    });
  if (/^\s*(import|export)\s/m.test(cuerpo)) throw new Error(`engine/${nombre}.js tiene un import/export que el empaquetador no entiende`);
  return { codigo: `const __${nombre} = (() => {\n${cuerpo}\nreturn { ${exportados.join(', ')} };\n})();`, exportados, dependencias, nombre };
}

// Solo los módulos cuyas funciones usa el nodo, más sus dependencias (para no pasar del
// límite de tamaño de un workflow: cada nodo Code lleva su propia copia del motor).
function modulosNecesarios(codigoNodo, todos) {
  const porNombre = Object.fromEntries(todos.map((m) => [m.nombre, m]));
  const usa = (m) => m.exportados.some((id) => new RegExp(`\\b${id}\\b`).test(codigoNodo));
  const incluidos = new Set();
  const añadir = (n) => {
    if (incluidos.has(n) || !porNombre[n]) return;
    incluidos.add(n);
    porNombre[n].dependencias.forEach(añadir);
  };
  todos.filter(usa).forEach((m) => añadir(m.nombre));
  return todos.filter((m) => incluidos.has(m.nombre)); // conserva el orden de dependencias
}

function configPublica() {
  const cfg = JSON.parse(readFileSync(join(AQUI, 'config.json'), 'utf8'));
  return { logoUrl: cfg.logoUrl || '', emailJordi: cfg.emailJordi, spreadsheetUrl: cfg.spreadsheetUrl };
}

/** Código completo (motor + cuerpo del nodo) para el nodo Code `nombre`. */
export function buildCodigoNodo(nombre) {
  const nodo = readFileSync(join(AQUI, 'nodes', `${nombre}.js`), 'utf8');
  const todos = MODULOS.filter((m) => existsSync(join(RAIZ, 'engine', `${m}.js`))).map(envolverModulo);
  const modulos = modulosNecesarios(nodo, todos);
  const publicos = modulos.map((m) => `const { ${m.exportados.join(', ')} } = __${m.nombre};`).join('\n');
  // Primero la lógica del nodo (lo que interesa leer en n8n), dentro de una función que se
  // llama al final, cuando el motor ya está cargado.
  return [
    `// ===== Paso «${nombre}»: lo que hace este nodo =====`,
    `async function paso() {`,
    nodo,
    `}`,
    ``,
    `// ===== Motor de Reformas Barcelona (generado por n8n/build.mjs desde engine/; no editar aquí) =====`,
    ...modulos.map((m) => m.codigo),
    publicos,
    `const CONFIG = ${JSON.stringify(configPublica())};`,
    `return paso();`,
  ].join('\n');
}

function construirWorkflows() {
  const src = join(AQUI, 'src');
  const out = join(AQUI, 'generated');
  if (!existsSync(src)) return console.log('No hay workflows en n8n/src todavía.');
  mkdirSync(out, { recursive: true });
  for (const archivo of readdirSync(src).filter((f) => f.endsWith('.workflow.js'))) {
    const fuente = readFileSync(join(src, archivo), 'utf8');
    const generado = fuente.replace(/'@@CODE:([\w-]+)@@'/g, (_, n) => JSON.stringify(buildCodigoNodo(n)));
    writeFileSync(join(out, archivo), generado);
    console.log(`n8n/generated/${archivo}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) construirWorkflows();
