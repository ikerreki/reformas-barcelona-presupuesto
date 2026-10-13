// Efectos visuales de la web: revelado al hacer scroll, titular animado, luces que siguen al cursor,
// raíl de pasos, cinta de estancias y confeti. Solo decoración: no toca los datos ni el envío a n8n.
import { ETIQUETAS } from './engine/etiquetas.js';
import { ESTANCIAS } from './engine/catalogo.js';
import { ICONOS } from './iconos.js';

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
const idioma = () => document.documentElement.lang || 'es';

// ---------- Barra de lectura y cabecera ----------
const barra = $('#barra-scroll');
const cabecera = $('.cabecera');
let pedido = false;
function alHacerScroll() {
  if (pedido) return;
  pedido = true;
  requestAnimationFrame(() => {
    pedido = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    barra.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    cabecera.classList.toggle('cabecera--scroll', scrollY > 24);
    actualizarRail();
  });
}
addEventListener('scroll', alHacerScroll, { passive: true });
addEventListener('resize', alHacerScroll);

// ---------- Revelado al entrar en pantalla ----------
$$('.paso').forEach((el, i) => { el.classList.add('revelar'); el.style.setProperty('--retraso', `${i === 0 ? 0 : 60}ms`); });
['.enviar', '.pie__contenido'].forEach((s) => $(s)?.classList.add('revelar'));
$$('.hero .revelar').forEach((el, i) => el.style.setProperty('--retraso', `${i * 120}ms`));
if ('IntersectionObserver' in window && !sinMovimiento) {
  const io = new IntersectionObserver((entradas) => entradas.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.revelar').filter((el) => !el.closest('.hero')).forEach((el) => io.observe(el));
} else {
  $$('.revelar').forEach((el) => el.classList.add('visible'));
}

// ---------- Titular: palabra a palabra y la última parte destacada ----------
const titular = $('.hero__titulo');
const SIMBOLOS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ€%&#*+';
function barajar(el) {
  const final = el.textContent;
  let vuelta = 0;
  const total = 18;
  const reloj = setInterval(() => {
    vuelta++;
    el.textContent = [...final].map((c, i) => (c === ' ' || i < (vuelta / total) * final.length ? c : SIMBOLOS[(Math.random() * SIMBOLOS.length) | 0])).join('');
    if (vuelta >= total) { clearInterval(reloj); el.textContent = final; }
  }, 45);
}
function partirTitular() {
  if (!titular || titular.querySelector('.palabra')) return;
  const texto = titular.textContent.trim();
  if (!texto) return;
  titular.setAttribute('aria-label', texto);
  const coma = texto.lastIndexOf(',');
  const antes = coma > 0 ? texto.slice(0, coma + 1) : texto;
  const despues = coma > 0 ? texto.slice(coma + 1).trim() : '';
  let n = 0;
  const palabras = (t, extra = '') => t.split(/\s+/).filter(Boolean)
    .map((p) => `<span class="palabra${extra}" style="--i:${n++}" aria-hidden="true">${p.replace(/</g, '&lt;')}</span>`).join(' ');
  titular.innerHTML = palabras(antes) + (despues ? ' ' + palabras(despues, ' destacado') : '');
  if (!sinMovimiento) {
    const destacadas = $$('.destacado', titular);
    setTimeout(() => destacadas.forEach(barajar), 120 + n * 80);
  }
}
partirTitular();
if (titular) new MutationObserver(partirTitular).observe(titular, { childList: true });

// ---------- Portada: luz que sigue al ratón y maqueta en 3D ----------
const hero = $('.hero');
const luz = $('#hero-luz');
const maqueta = $('#maqueta');
if (hero && !sinMovimiento) {
  hero.addEventListener('pointermove', (ev) => {
    const r = hero.getBoundingClientRect();
    luz.style.setProperty('--lx', `${ev.clientX - r.left}px`);
    luz.style.setProperty('--ly', `${ev.clientY - r.top}px`);
    if (maqueta) {
      const x = (ev.clientX - r.left) / r.width - 0.5;
      const y = (ev.clientY - r.top) / r.height - 0.5;
      maqueta.style.setProperty('--ry', `${-14 + x * 16}deg`);
      maqueta.style.setProperty('--rx', `${8 - y * 12}deg`);
    }
  });
}

// ---------- Luz bajo el cursor en tarjetas ----------
document.addEventListener('pointermove', (ev) => {
  const el = ev.target.closest?.('.foco-luz, .calidad, .opcion');
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${ev.clientX - r.left}px`);
  el.style.setProperty('--my', `${ev.clientY - r.top}px`);
}, { passive: true });

// ---------- Botones magnéticos ----------
if (!sinMovimiento && matchMedia('(pointer: fine)').matches) {
  $$('.btn--grande, .hero__acciones .btn').forEach((b) => {
    b.addEventListener('pointermove', (ev) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(ev.clientX - r.left - r.width / 2) * 0.12}px, ${(ev.clientY - r.top - r.height / 2) * 0.2}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
}

// ---------- Cinta de estancias ----------
const cinta = $('#cinta');
function pintarCinta() {
  if (!cinta) return;
  const E = ETIQUETAS[idioma()] || ETIQUETAS.es;
  const items = ESTANCIAS.map((t) => `<span class="cinta__item">${ICONOS[t]}${E.estancia[t]}</span><span class="cinta__sep"></span>`).join('');
  cinta.innerHTML = items.repeat(4);
}

// ---------- Raíl de pasos (escritorio) ----------
const rail = $('#rail');
const pasos = $$('.paso');
function pintarRail() {
  if (!rail) return;
  rail.innerHTML = `<ol class="rail__lista">${pasos.map((p, i) => {
    const titulo = p.querySelector('.paso__titulo span:last-child')?.textContent || '';
    return `<li class="rail__item" data-paso="${i}"><span class="rail__num">0${i + 1}</span><span>${titulo}</span></li>`;
  }).join('')}</ol>`;
  actualizarRail();
}
function actualizarRail() {
  const lista = rail?.querySelector('.rail__lista');
  if (!lista || !pasos.length) return;
  const mitad = innerHeight * 0.45;
  let activo = 0;
  pasos.forEach((p, i) => { if (p.getBoundingClientRect().top < mitad) activo = i; });
  const primero = pasos[0].getBoundingClientRect();
  const ultimo = pasos[pasos.length - 1].getBoundingClientRect();
  const avance = Math.min(1, Math.max(0, (mitad - primero.top) / (ultimo.bottom - primero.top)));
  lista.style.setProperty('--avance', avance.toFixed(3));
  $$('.rail__item', lista).forEach((li, i) => {
    li.classList.toggle('rail__item--activo', i === activo);
    li.classList.toggle('rail__item--hecho', i < activo);
  });
}
rail?.addEventListener('click', (ev) => {
  const li = ev.target.closest('[data-paso]');
  if (li) pasos[Number(li.dataset.paso)]?.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'start' });
});

// Al cambiar de idioma, la cinta y el raíl se vuelven a pintar con los textos nuevos.
new MutationObserver(() => { pintarCinta(); pintarRail(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
pintarCinta();
pintarRail();

// ---------- Estancia nueva: entra con animación ----------
let numEstancias = $$('.estancia').length;
document.addEventListener('estancias-pintadas', () => {
  const todas = $$('.estancia');
  if (todas.length > numEstancias && !sinMovimiento) todas[todas.length - 1].classList.add('estancia--nueva');
  numEstancias = todas.length;
});

// ---------- Confeti al recibir el presupuesto ----------
function confeti() {
  if (sinMovimiento) return;
  const c = document.createElement('canvas');
  c.className = 'confeti';
  c.width = innerWidth * devicePixelRatio;
  c.height = innerHeight * devicePixelRatio;
  document.body.appendChild(c);
  const x = c.getContext('2d');
  x.scale(devicePixelRatio, devicePixelRatio);
  const colores = ['#C4552D', '#E2683A', '#F2A65A', '#2A2A2A', '#F7E3DA'];
  const piezas = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 5, r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, c: colores[(Math.random() * colores.length) | 0],
  }));
  const inicio = performance.now();
  (function paso(t) {
    const vida = (t - inicio) / 2600;
    x.clearRect(0, 0, innerWidth, innerHeight);
    piezas.forEach((p) => {
      p.vy += 0.42; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      x.save(); x.globalAlpha = Math.max(0, 1 - vida); x.translate(p.x, p.y); x.rotate(p.r);
      x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore();
    });
    if (vida < 1) requestAnimationFrame(paso); else c.remove();
  })(inicio);
}
const resultado = $('#resultado');
if (resultado) {
  new MutationObserver(() => { if (!resultado.hidden) confeti(); }).observe(resultado, { attributes: true, attributeFilter: ['hidden'] });
}

alHacerScroll();
