// Foto de la estancia: se reduce en el navegador, se analiza en n8n (Gemini) y se muestran
// las sugerencias con su motivo. El cliente decide qué añadir; el precio lo calcula el motor.
import { CONFIG } from './config.js';
import { UI } from './i18n.js';
import { ETIQUETAS } from './engine/etiquetas.js';
import { formatEUR } from './engine/formato.js';
import { escaparHTML as h } from './engine/render.js';
import { tipoSugerido } from './engine/foto.js';
import { estado, pintarEstancias } from './form.js';

const LADO_MAX = 1024;

/** Reduce la imagen a ≤1024 px de lado y la pasa a JPEG (más rápida y más barata de analizar). */
export async function reducirImagen(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = url; });
    const escala = Math.min(1, LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return { mime: 'image/jpeg', base64: dataUrl.split(',')[1], preview: dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function analizarFoto(estancia, imagen, idioma) {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), CONFIG.timeoutFotoMs || CONFIG.timeoutMs);
  try {
    const r = await fetch(`${CONFIG.webhookBase}/analizar-foto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idioma, estancia: { tipo: estancia.tipo, m2: estancia.m2, calidad: estancia.calidad, extras: estancia.extras }, imagen: { mime: imagen.mime, base64: imagen.base64 } }),
      signal: control.signal,
    });
    const json = await r.json().catch(() => null);
    return json && json.ok ? json : { ok: false };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(reloj);
  }
}

// ---------- Pintar la zona de foto de cada estancia ----------

function htmlZona(e, i) {
  const t = UI[estado.idioma].foto;
  const E = ETIQUETAS[estado.idioma];
  const f = e.foto || {};
  const boton = `<label class="foto__boton btn btn--secundario">
      <input type="file" accept="image/*" data-foto-input="${i}" hidden>
      <span>${h(f.preview ? t.cambiar : t.boton)}</span></label>
    <p class="ayuda">${h(t.ayuda)}</p>`;
  if (!f.preview) return boton;

  let cuerpo = '';
  if (f.cargando) cuerpo = `<p class="foto__estado" role="status">${h(t.analizando)}</p>`;
  else if (f.error) cuerpo = `<p class="foto__aviso">${h(t.noDisponible)}</p>`;
  else if (f.analisis && !f.analisis.esEstancia) cuerpo = `<p class="foto__aviso">${h(t.noEstancia)}</p>`;
  else if (f.analisis) {
    const a = f.analisis;
    // Los textos de la IA vienen en los tres idiomas: al cambiar de idioma no hay que volver a analizar.
    const vemos = [a.estado ? t.estado[a.estado] : '', ...(a.elementos[estado.idioma] || [])].filter(Boolean).join(' · ');
    const otra = a.estanciaDetectada && e.tipo && a.estanciaDetectada !== e.tipo
      ? `<p class="foto__aviso">${h(t.otraEstancia(E.estanciaMin[a.estanciaDetectada], E.estanciaMin[e.tipo]))}</p>` : '';
    const detectada = f.tipoDetectado && e.tipo === a.estanciaDetectada
      ? `<p class="foto__detectada">${h(t.detectada(E.estanciaMin[e.tipo]))}</p>` : '';
    const dudosa = a.confianza < 0.6 ? `<p class="foto__aviso">${h(t.pocaConfianza)}</p>` : '';
    const pendientes = a.extrasSugeridos.filter((s) => !e.extras.includes(s.extra));
    const lista = a.extrasSugeridos.length
      ? `<ul class="foto__sugerencias">${a.extrasSugeridos.map((s) => {
          const ya = e.extras.includes(s.extra);
          const motivo = s.motivo && s.motivo[estado.idioma];
          return `<li><span><strong>${h(E.extra[s.extra])}</strong>${motivo ? `<small>${h(motivo)}</small>` : ''}</span>
            <button type="button" class="btn btn--texto" data-foto-anadir="${i}" data-extra="${s.extra}" ${ya ? 'disabled' : ''}>${h(ya ? t.anadido : t.anadir)}</button></li>`;
        }).join('')}</ul>
        ${pendientes.length > 1 ? `<button type="button" class="btn btn--secundario" data-foto-todas="${i}">${h(t.todas)}</button>` : ''}`
      : `<p class="ayuda">${h(t.sinSugerencias)}</p>`;
    const est = f.estimacion && f.estimacion.total != null
      ? `<p class="foto__estimacion">${h(t.estimacion(formatEUR(Math.round(f.estimacion.total * 100))))}<small>${h(t.orientativo)}</small></p>`
      : `<p class="ayuda">${h(t.sinM2)}</p>`;
    cuerpo = `${detectada}${otra}<p class="foto__vemos"><strong>${h(t.vemos)}:</strong> ${h(vemos)}</p>${dudosa}
      <p class="foto__titulo">${h(t.sugerimos)}</p>${lista}${est}`;
  }
  return `<div class="foto__fila"><img class="foto__miniatura" src="${f.preview}" alt=""><div class="foto__cuerpo" aria-live="polite">${cuerpo}</div></div>${boton}`;
}

export function pintarFotos() {
  estado.estancias.forEach((e, i) => {
    const zona = document.querySelector(`.foto-zona[data-foto="${i}"]`);
    if (zona) zona.innerHTML = htmlZona(e, i);
  });
}

async function alElegirFoto(i, file) {
  const e = estado.estancias[i];
  if (!file || !e) return;
  let imagen;
  try { imagen = await reducirImagen(file); } catch { e.foto = { preview: '', error: true }; pintarFotos(); return; }
  e.foto = { preview: imagen.preview, cargando: true };
  pintarFotos();
  const r = await analizarFoto(e, imagen, estado.idioma);
  if (!estado.estancias.includes(e)) return; // la estancia se quitó mientras tanto
  e.foto = r.ok ? { preview: imagen.preview, analisis: r.analisis, estimacion: r.estimacion } : { preview: imagen.preview, error: true };
  // Foto subida antes de elegir la estancia: marcamos la que ha reconocido la IA (el cliente puede cambiarla).
  const tipo = r.ok ? tipoSugerido(e.tipo, r.analisis) : null;
  if (tipo) { e.tipo = tipo; e.foto.tipoDetectado = true; }
  // La nota técnica viaja con la solicitud para Jordi (solo si de verdad es una estancia).
  e.notaFoto = r.ok && r.analisis.esEstancia ? r.analisis.notaTecnica : null;
  if (tipo) pintarEstancias(); else pintarFotos();
}

export function iniciarFotos() {
  const cont = document.querySelector('#estancias');
  cont.addEventListener('change', (ev) => {
    const input = ev.target.closest('[data-foto-input]');
    if (input) alElegirFoto(Number(input.dataset.fotoInput), input.files[0]);
  });
  cont.addEventListener('click', (ev) => {
    const uno = ev.target.closest('[data-foto-anadir]');
    const todas = ev.target.closest('[data-foto-todas]');
    if (!uno && !todas) return;
    const i = Number((uno || todas).dataset.fotoAnadir ?? (uno || todas).dataset.fotoTodas);
    const e = estado.estancias[i];
    const nuevos = uno ? [uno.dataset.extra] : e.foto.analisis.extrasSugeridos.map((s) => s.extra);
    e.extras = [...new Set([...e.extras, ...nuevos])];
    pintarEstancias();
  });
  document.addEventListener('estancias-pintadas', pintarFotos);
}
