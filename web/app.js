// Punto de entrada: idioma, envío, progreso, errores y resultado.
import { UI, idiomaInicial, guardarIdioma, aplicarIdioma } from './i18n.js';
import { estado, iniciarFormulario, pintarEstancias, leerFormulario, rellenarFormulario, vaciarFormulario, mostrarErrores, validar, nuevaSolicitud, nuevoId } from './form.js';
import { idParaEnvio } from './idempotencia.js';
import { enviarPresupuesto } from './api.js';
import { mostrarResultado, ocultarResultado, descargarPDF } from './resultado.js';
import { iniciarFotos } from './foto.js';

const $ = (sel) => document.querySelector(sel);
let ultimo = null;          // último presupuesto recibido
let enviando = false;
let relojProgreso = null;

function cambiarIdioma(idioma) {
  estado.idioma = idioma;
  guardarIdioma(idioma);
  aplicarIdioma(idioma);
  pintarEstancias();
  mostrarErrores(validar().errores, { soloTocados: true });
  if (ultimo && !$('#resultado').hidden) $('#banner-error').hidden = true;
}

function empezarProgreso() {
  const mensajes = UI[estado.idioma].progreso;
  let n = 0;
  $('#progreso-texto').textContent = mensajes[0];
  $('#progreso').hidden = false;
  $('#formulario').classList.add('formulario--enviando');
  relojProgreso = setInterval(() => {
    n = Math.min(n + 1, mensajes.length - 1);
    $('#progreso-texto').textContent = mensajes[n];
  }, 2500);
}

function pararProgreso() {
  clearInterval(relojProgreso);
  $('#progreso').hidden = true;
  $('#formulario').classList.remove('formulario--enviando');
}

function mostrarBanner(clave) {
  $('#banner-texto').textContent = UI[estado.idioma][clave];
  $('#banner-error').hidden = false;
  $('#reintentar').hidden = clave === 'error.revisa' || clave === 'error.limite';
  $('#banner-error').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function enviar(ev) {
  ev?.preventDefault();
  if (enviando) return;            // un doble clic no envía dos veces
  $('#banner-error').hidden = true;

  // 1) Validación en el navegador con el mismo motor que usa n8n.
  const v = validar();
  if (!v.ok && !v.esBot) {
    v.errores.forEach((e) => estado.tocados.add(e.campo));
    const primero = mostrarErrores(v.errores);
    mostrarBanner('error.revisa');
    primero?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    primero?.querySelector('input, textarea')?.focus({ preventScroll: true });
    return;
  }

  // 2) Envío a n8n. Mismos datos → mismo solicitudId (un reintento no duplica); datos cambiados → id nuevo.
  const { solicitudId, ...datos } = leerFormulario();
  ({ id: estado.solicitudId, huella: estado.huella } = idParaEnvio({ id: solicitudId, huella: estado.huella }, datos, nuevoId));
  const enviado = { ...datos, solicitudId: estado.solicitudId };
  enviando = true;
  $('#enviar').disabled = true;
  empezarProgreso();
  const r = await enviarPresupuesto(enviado);
  pararProgreso();
  enviando = false;
  $('#enviar').disabled = false;

  if (r.tipo === 'ok' && r.presupuesto) {
    ultimo = { raw: enviado, presupuesto: r.presupuesto };   // lo enviado, aunque se tocara el formulario mientras
    mostrarResultado(r.presupuesto);
  } else if (r.tipo === 'validacion') {
    r.errores.forEach((e) => estado.tocados.add(e.campo));
    mostrarErrores(r.errores);
    mostrarBanner('error.revisa');
  } else {
    mostrarBanner(`error.${r.motivo || 'interno'}`);
  }
}

function iniciar() {
  estado.idioma = idiomaInicial();
  aplicarIdioma(estado.idioma);
  iniciarFotos();
  iniciarFormulario();

  document.querySelectorAll('[data-idioma]').forEach((b) => b.addEventListener('click', () => cambiarIdioma(b.dataset.idioma)));
  $('#formulario').addEventListener('submit', enviar);
  $('#reintentar').addEventListener('click', enviar);

  $('#btn-pdf').addEventListener('click', () => ultimo && descargarPDF(ultimo.presupuesto.numero));
  $('#btn-editar').addEventListener('click', () => {
    // Editar = otro presupuesto distinto: nuevo solicitudId para que no se confunda con el anterior.
    nuevaSolicitud();
    ocultarResultado();
    rellenarFormulario(ultimo.raw);
    $('#formulario').scrollIntoView({ behavior: 'smooth' });
  });
  $('#btn-nuevo').addEventListener('click', () => {
    nuevaSolicitud();
    ultimo = null;
    ocultarResultado();
    vaciarFormulario();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

iniciar();
