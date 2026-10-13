// Iconos de dos tonos (24×24) para cada tipo de estancia: una forma rellena suave y el trazo encima.
const svg = (relleno, trazo) => `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g fill="currentColor" stroke="none" opacity=".2">${relleno}</g>${trazo}</svg>`;

export const ICONOS = {
  bano: svg(
    '<path d="M3.5 12h17v2.5A4.5 4.5 0 0 1 16 19H8a4.5 4.5 0 0 1-4.5-4.5z"/>',
    '<path d="M3.5 12h17v2.5A4.5 4.5 0 0 1 16 19H8a4.5 4.5 0 0 1-4.5-4.5z"/><path d="M6 12V6.5a2.5 2.5 0 0 1 5 0"/><path d="M9.5 9.5h3"/><path d="M7.5 19l-1 2M16.5 19l1 2"/>'),
  cocina: svg(
    '<rect x="4" y="9" width="16" height="12" rx="2.5"/>',
    '<rect x="4" y="9" width="16" height="12" rx="2.5"/><path d="M4 13h16"/><rect x="7.5" y="15.5" width="9" height="3" rx="1"/><path d="M9 3.5c-.9 1 .9 2 0 3M12 3.5c-.9 1 .9 2 0 3M15 3.5c-.9 1 .9 2 0 3"/>'),
  salon: svg(
    '<path d="M5.5 13h13v4h-13z"/>',
    '<path d="M6 11V8.5A2.5 2.5 0 0 1 8.5 6h7A2.5 2.5 0 0 1 18 8.5V11"/><path d="M3.5 18v-5a1.5 1.5 0 0 1 3 0v3h11v-3a1.5 1.5 0 0 1 3 0v5z"/><path d="M6 18v2M18 18v2"/>'),
  dormitorio: svg(
    '<rect x="3" y="12" width="18" height="5" rx="1.5"/>',
    '<path d="M3 19V7M21 19v-4.5"/><path d="M3 17h18"/><rect x="5" y="9" width="5" height="3" rx="1.2"/><path d="M10.5 12H19a2 2 0 0 1 2 2"/>'),
  vivienda: svg(
    '<path d="M5 10.5 12 4.8l7 5.7V20H5z"/>',
    '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10.5 20v-5h3v5"/><rect x="14.8" y="12" width="2.4" height="2.4" rx=".5"/>'),
};
