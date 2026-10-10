// Servidor estático mínimo (sin dependencias) para probar dist/ en local.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PUERTO = Number(process.env.PORT) || 5173;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  const ruta = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  let archivo = join(dist, ruta);
  if (!archivo.startsWith(dist)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(archivo)).isDirectory()) archivo = join(archivo, 'index.html');
    const cuerpo = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': MIME[extname(archivo)] || 'application/octet-stream' });
    res.end(cuerpo);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
  }
}).listen(PUERTO, () => console.log(`Sirviendo dist/ en http://localhost:${PUERTO}`));
