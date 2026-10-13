// Asistente del formulario: muestra un paso cada vez, con un panel lateral (pasos y resumen en vivo).
// No toca el envío: el botón «Recibir mi presupuesto» y la validación final siguen en app.js.
// Para avanzar se valida solo el paso actual, con el mismo motor que n8n (validar() de form.js).
import { estado, validar, mostrarErrores } from './form.js';
import { ETIQUETAS } from './engine/etiquetas.js';
import { ICONOS } from './iconos.js';

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;

const form = $('#formulario');
const pasos = $$('.paso', form);
const lado = $('#asistente-lado');
const barra = $('#asistente-barra');
const atras = $('#paso-anterior');
const sigue = $('#paso-siguiente');
let actual = 0;

const idioma = () => document.documentElement.lang || 'es';
const titulo = (i) => pasos[i]?.querySelector('.paso__titulo span:last-child')?.textContent || '';
const CHECK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

/** Índice del paso al que pertenece un campo con error (o -1). */
function pasoDe(campo) {
  const el = document.querySelector(`[data-campo="${CSS.escape(campo)}"]`) || (campo.startsWith('estancias') ? $('#estancias') : null);
  const p = el?.closest('.paso');
  return p ? pasos.indexOf(p) : -1;
}
const erroresDelPaso = (i) => validar().errores.filter((e) => pasoDe(e.campo) === i);

function marcar(errores) {
  errores.forEach((e) => estado.tocados.add(e.campo));
  const primero = mostrarErrores(errores);
  primero?.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'center' });
  primero?.querySelector('input, textarea')?.focus({ preventScroll: true });
}

function ir(i, { desplazar = true } = {}) {
  const destino = Math.max(0, Math.min(pasos.length - 1, i));
  const sentido = destino >= actual ? 'adelante' : 'atras';
  const cambia = destino !== actual;
  actual = destino;
  pasos.forEach((p, k) => {
    p.classList.toggle('paso--activo', k === actual);
    p.classList.remove('entra-adelante', 'entra-atras');
  });
  if (cambia && !sinMovimiento) {
    void pasos[actual].offsetWidth; // reinicia la animación
    pasos[actual].classList.add(`entra-${sentido}`);
  }
  pintar();
  if (desplazar) form.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'start' });
}

/** Avanza hasta «destino» validando cada paso por el camino. */
function avanzarHasta(destino) {
  for (let k = actual; k < destino; k++) {
    const errores = erroresDelPaso(k);
    if (errores.length) { if (k !== actual) ir(k, { desplazar: false }); marcar(errores); return; }
  }
  ir(destino);
}

function pintar() {
  const ultimo = actual === pasos.length - 1;
  form.classList.toggle('asistente--final', ultimo);
  atras.hidden = actual === 0;
  sigue.hidden = ultimo;
  $('.asistente__destino', atras).textContent = actual > 0 ? titulo(actual - 1) : '';
  $('.asistente__destino', sigue).textContent = ultimo ? '' : titulo(actual + 1);
  barra.style.transform = `scaleX(${(actual + 1) / pasos.length})`;
  pintarLado();
}

function pintarLado() {
  if (!lado) return;
  const E = ETIQUETAS[idioma()] || ETIQUETAS.es;
  const listaPasos = pasos.map((_, i) => {
    const clase = i === actual ? 'lado__paso--activo' : i < actual ? 'lado__paso--hecho' : '';
    return `<li><button type="button" tabindex="-1" class="lado__paso ${clase}" data-ir="${i}">
      <span class="lado__num">${i < actual ? CHECK : `0${i + 1}`}</span><span class="lado__titulo">${titulo(i)}</span></button></li>`;
  }).join('');
  const estancias = estado.estancias.map((e) => {
    const m2 = String(e.m2 ?? '').trim();
    const detalle = [m2 ? `${m2.replace('.', ',')} m²` : '', E.calidad[e.calidad] || ''].filter(Boolean).join(' · ');
    const icono = e.tipo ? ICONOS[e.tipo] : '<span class="lado__hueco"></span>';
    const extras = e.extras.length ? `<span class="lado__extras">+${e.extras.length}</span>` : '';
    return `<div class="lado__estancia${e.tipo ? '' : ' lado__estancia--vacia'}"><span class="lado__icono">${icono}</span>
      <span class="lado__texto"><strong>${e.tipo ? E.estancia[e.tipo] : '—'}</strong><small>${detalle || '—'}</small></span>${extras}</div>`;
  }).join('');
  const licencia = $('#licencia')?.checked ? `<div class="lado__estancia lado__estancia--extra"><span class="lado__icono">${CHECK}</span><span class="lado__texto"><strong>${E.extra.licencia}</strong></span></div>` : '';
  lado.innerHTML = `<div class="lado__interior"><ol class="lado__pasos">${listaPasos}</ol><div class="lado__resumen">${estancias}${licencia}</div></div>`;
}

// ---------- Eventos ----------
sigue.addEventListener('click', () => avanzarHasta(actual + 1));
atras.addEventListener('click', () => ir(actual - 1));
lado?.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-ir]');
  if (!b) return;
  const i = Number(b.dataset.ir);
  if (i < actual) ir(i); else if (i > actual) avanzarHasta(i);
});

// El resumen del panel lateral sigue lo que el cliente va eligiendo.
['change', 'input'].forEach((t) => form.addEventListener(t, () => setTimeout(pintarLado, 0)));
document.addEventListener('estancias-pintadas', () => setTimeout(pintarLado, 0));
new MutationObserver(pintar).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

// Si al enviar hay errores en otro paso (validación del navegador o 400 de n8n), se salta a ese paso.
const banner = $('#banner-error');
new MutationObserver(() => {
  if (banner.hidden) return;
  const conError = $('.campo--error', form);
  const i = conError ? pasos.indexOf(conError.closest('.paso')) : -1;
  if (i >= 0 && i !== actual) {
    ir(i, { desplazar: false });
    conError.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'center' });
  }
}).observe(banner, { attributes: true, attributeFilter: ['hidden'] });

// «Editar y recalcular» o «Nuevo presupuesto»: el formulario vuelve a aparecer y se empieza por el primer paso.
new MutationObserver(() => { if (!form.hidden) ir(0, { desplazar: false }); }).observe(form, { attributes: true, attributeFilter: ['hidden'] });

form.classList.add('asistente--listo');
ir(0, { desplazar: false });
