// Prepara la web para publicar: copia web/ a dist/ y engine/ a dist/engine/.
// Así el navegador importa el MISMO motor de cálculo que usan n8n y los tests.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(raiz, 'dist');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(raiz, 'web'), dist, { recursive: true });
cpSync(join(raiz, 'engine'), join(dist, 'engine'), { recursive: true });

console.log('Web lista en dist/');
