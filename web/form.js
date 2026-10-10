// Formulario: el estado (los datos) manda y la pantalla se pinta a partir de él.
// Así cambiar de idioma o "Editar y recalcular" nunca pierde lo que escribió el cliente.
import { ESTANCIAS, CALIDADES, EXTRAS_ESTANCIA, LIMITES } from './engine/catalogo.js';
import { TARIFAS_RESPALDO } from './engine/tarifas.js';
import { ETIQUETAS } from './engine/etiquetas.js';
import { escaparHTML as h } from './engine/render.js';
import { validarSolicitud } from './engine/pricing.js';
import { UI, mensajeError } from './i18n.js';
import { ICONOS } from './iconos.js';

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const estanciaVacia = () => ({ tipo: '', m2: '', calidad: 'media', extras: [], notaFoto: null });

export const estado = {
  idioma: 'es',
  solicitudId: nuevoId(),
  estancias: [estanciaVacia()],
  licencia: false,
  tocados: new Set(),
};

export function nuevaSolicitud() {
  estado.solicitudId = nuevoId();
}

// ---------- Pintar ----------

function htmlEstancia(e, i, t) {
  const E = ETIQUETAS[estado.idioma];
  const tipos = ESTANCIAS.map((tipo) => `
    <label class="tile">
      <input type="radio" name="tipo-${i}" value="${tipo}" ${e.tipo === tipo ? 'checked' : ''} data-accion="tipo" data-i="${i}">
      <span class="tile__icono">${ICONOS[tipo]}</span><span class="tile__texto">${h(E.estancia[tipo])}</span>
    </label>`).join('');
  const calidades = CALIDADES.map((c) => `
    <label class="calidad">
      <input type="radio" name="calidad-${i}" value="${c}" ${e.calidad === c ? 'checked' : ''} data-accion="calidad" data-i="${i}">
      <span><strong>${h(E.calidad[c].charAt(0).toUpperCase() + E.calidad[c].slice(1))}</strong>
      <small>${h(TARIFAS_RESPALDO.queIncluye[c][estado.idioma])}</small></span>
    </label>`).join('');
  const extras = EXTRAS_ESTANCIA.map((x) => `
    <label class="opcion">
      <input type="checkbox" value="${x}" ${e.extras.includes(x) ? 'checked' : ''} data-accion="extra" data-i="${i}">
      <span><strong>${h(E.extra[x])}</strong><small>${h(TARIFAS_RESPALDO.extras[x].descripcion[estado.idioma])}</small></span>
    </label>`).join('');
  const quitar = estado.estancias.length > 1
    ? `<button type="button" class="btn btn--texto estancia__quitar" data-accion="quitar" data-i="${i}" aria-label="${h(t.quitarAria)} ${i + 1}">✕ ${h(t.quitar)}</button>` : '';

  return `<article class="estancia" data-i="${i}" aria-labelledby="estancia-titulo-${i}">
    <header class="estancia__cabecera"><h3 id="estancia-titulo-${i}">${h(t.estancia)} ${i + 1}</h3>${quitar}</header>
    <fieldset class="bloque campo" data-campo="estancias[${i}].tipo">
      <legend>${h(t.queReformar)}</legend>
      <div class="tiles">${tipos}</div>
      <p class="error" role="alert"></p>
    </fieldset>
    <div class="campo" data-campo="estancias[${i}].m2">
      <label for="m2-${i}">${h(t.superficie)}</label>
      <div class="stepper">
        <button type="button" class="stepper__btn" data-accion="m2-menos" data-i="${i}" aria-label="${h(t.menos)}">−</button>
        <input id="m2-${i}" inputmode="decimal" autocomplete="off" value="${h(String(e.m2).replace('.', ','))}" data-accion="m2" data-i="${i}" aria-describedby="m2-unidad-${i}">
        <span class="stepper__unidad" id="m2-unidad-${i}">m²</span>
        <button type="button" class="stepper__btn" data-accion="m2-mas" data-i="${i}" aria-label="${h(t.mas)}">+</button>
      </div>
      <p class="error" role="alert"></p>
    </div>
    <fieldset class="bloque campo" data-campo="estancias[${i}].calidad">
      <legend>${h(t.calidad)}</legend>
      <div class="calidades">${calidades}</div>
      <p class="error" role="alert"></p>
    </fieldset>
    <fieldset class="bloque campo" data-campo="estancias[${i}].extras">
      <legend>${h(t.extras)}</legend>
      <div class="extras">${extras}</div>
      <p class="error" role="alert"></p>
    </fieldset>
    <div class="foto-zona" data-foto="${i}"></div>
  </article>`;
}

export function pintarEstancias() {
  const t = UI[estado.idioma];
  $('#estancias').innerHTML = estado.estancias.map((e, i) => htmlEstancia(e, i, t)).join('');
  const lleno = estado.estancias.length >= LIMITES.maxEstancias;
  $('#anadir').disabled = lleno;
  $('#ayuda-max').hidden = !lleno;
  const E = ETIQUETAS[estado.idioma];
  $('#licencia-titulo').textContent = E.extra.licencia;
  $('#licencia-desc').textContent = TARIFAS_RESPALDO.extras.licencia.descripcion[estado.idioma];
  document.dispatchEvent(new CustomEvent('estancias-pintadas'));
}

// ---------- Leer y rellenar ----------

/** Lo que se envía a n8n (forma de la spec §4.2). */
export function leerFormulario() {
  return {
    solicitudId: estado.solicitudId,
    idioma: estado.idioma,
    cliente: {
      nombre: $('#nombre').value,
      email: $('#email').value,
      telefono: $('#telefono').value,
      direccion: $('#direccion').value,
    },
    // Solo lo que necesita n8n (la foto no se envía con la solicitud: solo su nota técnica).
    estancias: estado.estancias.map((e) => ({ tipo: e.tipo, m2: e.m2, calidad: e.calidad, extras: [...e.extras], notaFoto: e.notaFoto ?? null })),
    extrasGenerales: $('#licencia').checked ? ['licencia'] : [],
    descripcion: $('#descripcion').value,
    privacidad: $('#privacidad').checked,
    website: $('#website').value,
  };
}

export function rellenarFormulario(raw) {
  estado.estancias = raw.estancias.map((e) => ({ tipo: e.tipo, m2: e.m2, calidad: e.calidad, extras: [...e.extras], notaFoto: e.notaFoto ?? null }));
  $('#nombre').value = raw.cliente.nombre;
  $('#email').value = raw.cliente.email;
  $('#telefono').value = raw.cliente.telefono;
  $('#direccion').value = raw.cliente.direccion;
  $('#descripcion').value = raw.descripcion;
  $('#licencia').checked = raw.extrasGenerales.includes('licencia');
  $('#privacidad').checked = raw.privacidad;
  actualizarContador();
  pintarEstancias();
}

export function vaciarFormulario() {
  estado.estancias = [estanciaVacia()];
  estado.tocados.clear();
  for (const id of ['nombre', 'email', 'telefono', 'direccion', 'descripcion']) $('#' + id).value = '';
  $('#licencia').checked = false;
  $('#privacidad').checked = false;
  actualizarContador();
  pintarEstancias();
}

function actualizarContador() {
  $('#contador').textContent = `${$('#descripcion').value.length}/${LIMITES.descripcionMax}`;
}

// ---------- Errores ----------

/** Marca cada error en su campo (data-campo) y devuelve el primer elemento con error. */
export function mostrarErrores(errores, { soloTocados = false } = {}) {
  document.querySelectorAll('.campo').forEach((c) => {
    c.classList.remove('campo--error');
    const p = $('.error', c);
    if (p) p.textContent = '';
    c.querySelectorAll('input, textarea').forEach((el) => el.removeAttribute('aria-invalid'));
  });
  let primero = null;
  for (const e of errores) {
    if (soloTocados && !estado.tocados.has(e.campo)) continue;
    const c = document.querySelector(`[data-campo="${CSS.escape(e.campo)}"]`) || (e.campo === 'estancias' ? $('#estancias') : null);
    if (!c) continue;
    c.classList.add('campo--error');
    const p = $('.error', c);
    if (p) p.textContent = mensajeError(e.campo, e.codigo, estado.idioma);
    c.querySelectorAll('input, textarea').forEach((el) => el.setAttribute('aria-invalid', 'true'));
    // El "primero" es el que está más arriba en la página, no el primero que detectó el motor.
    if (!primero || (c.compareDocumentPosition(primero) & Node.DOCUMENT_POSITION_FOLLOWING)) primero = c;
  }
  return primero;
}

/** Valida con el MISMO motor que n8n. */
export function validar() {
  return validarSolicitud(leerFormulario());
}

// ---------- Eventos ----------

function campoDe(el) {
  const c = el.closest('[data-campo]');
  return c ? c.dataset.campo : null;
}

export function iniciarFormulario() {
  const cont = $('#estancias');

  cont.addEventListener('change', (ev) => {
    const el = ev.target;
    const i = Number(el.dataset.i);
    const e = estado.estancias[i];
    if (!e) return;
    if (el.dataset.accion === 'tipo') e.tipo = el.value;
    if (el.dataset.accion === 'calidad') e.calidad = el.value;
    if (el.dataset.accion === 'extra') {
      e.extras = el.checked ? [...new Set([...e.extras, el.value])] : e.extras.filter((x) => x !== el.value);
    }
    estado.tocados.add(campoDe(el));
    mostrarErrores(validar().errores, { soloTocados: true });
  });

  cont.addEventListener('input', (ev) => {
    if (ev.target.dataset.accion === 'm2') estado.estancias[Number(ev.target.dataset.i)].m2 = ev.target.value;
  });

  cont.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-accion]');
    if (!b) return;
    const i = Number(b.dataset.i);
    if (b.dataset.accion === 'quitar') {
      estado.estancias.splice(i, 1);
      pintarEstancias();
      $('#estancia-titulo-' + Math.max(0, i - 1))?.focus?.();
      return;
    }
    const e = estado.estancias[i];
    const actual = Number(String(e.m2).replace(',', '.')) || 0;
    const nuevo = b.dataset.accion === 'm2-mas' ? Math.min(LIMITES.m2Max, Math.floor(actual) + 1) : Math.max(1, Math.ceil(actual) - 1);
    e.m2 = nuevo;
    const input = $('#m2-' + i);
    input.value = String(nuevo);
    estado.tocados.add(`estancias[${i}].m2`);
    mostrarErrores(validar().errores, { soloTocados: true });
  });

  // Al salir de un campo se valida solo lo que el cliente ya ha tocado (sin regañar antes de tiempo).
  document.querySelector('#formulario').addEventListener('focusout', (ev) => {
    const campo = campoDe(ev.target);
    if (!campo) return;
    estado.tocados.add(campo);
    mostrarErrores(validar().errores, { soloTocados: true });
  });

  $('#anadir').addEventListener('click', () => {
    if (estado.estancias.length >= LIMITES.maxEstancias) return;
    estado.estancias.push(estanciaVacia());
    pintarEstancias();
    $('#estancia-titulo-' + (estado.estancias.length - 1)).scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('#descripcion').addEventListener('input', actualizarContador);
  pintarEstancias();
}
