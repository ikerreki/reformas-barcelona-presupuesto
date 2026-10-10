// Vista del presupuesto: el mismo HTML que el PDF y que genera el motor (htmlDocumento).
import { htmlDocumento } from './engine/render.js';

const $ = (sel) => document.querySelector(sel);

export function mostrarResultado(presupuesto) {
  const p = { ...presupuesto, logoUrl: new URL('assets/reformas-barcelona-logo.svg', location.href).href };
  $('#documento').innerHTML = htmlDocumento(p);
  $('#resultado-email').textContent = presupuesto.cliente.email;
  $('#formulario').hidden = true;
  $('#progreso').hidden = true;
  $('#resultado').hidden = false;
  document.querySelector('.hero').hidden = true;
  $('#titulo-resultado').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function ocultarResultado() {
  $('#resultado').hidden = true;
  $('#documento').innerHTML = '';
  document.querySelector('.hero').hidden = false;
  $('#formulario').hidden = false;
}

/** PDF en el navegador. html2pdf (cdnjs) si está cargado; si no, el diálogo de imprimir del navegador. */
export async function descargarPDF(numero) {
  const doc = document.querySelector('#documento .presupuesto');
  if (!doc) return;
  if (window.html2pdf) {
    // Mientras se genera, el documento ignora sus reglas de móvil (ver PANTALLA en engine/render.js).
    doc.classList.add('presupuesto--pdf');
    try {
      await window.html2pdf().set({
        filename: `Presupuesto-${numero}.pdf`,
        margin: [8, 0, 8, 0],
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // Bloques que no se parten entre dos páginas. No se usa 'avoid-all': por un redondeo de html2pdf
        // mete <div> vacíos DENTRO de las tablas (entre <tr> y <td>) y descuadra las filas de los totales.
        pagebreak: { mode: ['css'], avoid: ['.cab', '.datos', '.bloque', 'h1', 'p', 'li', '.totales', '.plazo', '.firma', '.pie'] },
      }).from(doc).save();
    } finally {
      doc.classList.remove('presupuesto--pdf');
    }
  } else {
    window.print();
  }
}
