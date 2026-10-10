# Presupuestos con IA para Reformas Barcelona · Spec de diseño

- **Fecha:** 2026-10-10
- **Autor:** Iker Rodríguez Silva (con Claude Code)
- **Contexto:** Fase final del proceso de prácticas de NU Automatiza. Demo en la reunión del **martes 13 oct 2026, 19:30–20:30**.
- **Estado:** diseño aprobado por secciones; pendiente de la revisión de este documento.

---

## 1. Objetivo y criterios de éxito

**Problema (Jordi Ferrer, gerente):** los presupuestos se hacen a mano (Excel + Word) y tardan 2–3 días. A veces llevan errores de cálculo y se pierden clientes.
> «Quiero que el cliente pida el presupuesto en nuestra web y lo reciba en el momento, bien explicado, con nuestra imagen y sin errores en los números.»

**Solución:** una web con la marca de Reformas Barcelona. El cliente pide el presupuesto, un flujo de n8n lo calcula con las tarifas de la empresa, la IA redacta los textos y el presupuesto aparece en la web al momento. Además llega por email con el PDF adjunto.

**Criterios de éxito (los de NU Automatiza):**
1. **Funciona de principio a fin**, del formulario al presupuesto, sin pasos manuales.
2. **Se ve bien y es fácil** para un cliente no técnico.
3. **El flujo tiene sentido:** claro, ordenado y con la IA donde aporta.
4. **Implicación:** todos los extras oficiales y features propias.
5. **Explicable:** Iker entiende y puede defender cada decisión (informe de aprendizaje + `docs/puntos-clave-presentacion.md`).

**Criterio objetivo de corrección:** baño de 6 m², calidad media, con demolición y fontanería nueva ⇒ **subtotal 6.690 €, IVA 1.404,90 €, total 8.094,90 €**.

**Restricción:** 100 % gratis (n8n Cloud trial, créditos gratis de IA de n8n, clave gratuita de Gemini, Vercel gratis, Gmail/Sheets).

---

## 2. Decisiones tomadas

| # | Decisión | Motivo |
|---|---|---|
| D1 | **Arquitectura B:** tarifas en Google Sheets y un motor de cálculo único (`pricing.js`), con tarifas de respaldo dentro del flujo | Jordi controla sus precios sin técnicos; los números no se desincronizan |
| D2 | **C (estimación en vivo) solo si sobra tiempo** (fase 7) | Primero, un núcleo sólido |
| D3 | n8n **Cloud** (cuenta `ikerrodriguezsilva@gmail.com`), construido y desplegado vía el **MCP de n8n** | La API pública no existe en el trial; el MCP sí funciona |
| D4 | **Claude** (créditos gratis de n8n) redacta; **Gemini Flash** (clave propia de AI Studio) es el respaldo de texto y hace la visión | Calidad en ES/CA/EN y punto fuerte de Iker; Gemini ahorra créditos limitados |
| D5 | Web en **HTML + CSS + JS sin framework**, desplegada en **Vercel** desde un repo público de GitHub (`ikerreki`) | Lo que pide el PDF, sin build y fácil de explicar |
| D6 | **Trilingüe ES / CA / EN** | Barcelona, y los 3 idiomas nativos de Iker |
| D7 | **Módulo de visión aparte** (`/analizar-foto`): la IA clasifica la foto y sugiere extras; el **precio estimado lo calcula el motor** | Cumple «la IA no inventa ni cambia precios» |
| D8 | **Email HTML al cliente + PDF adjunto** (PDF.co vía créditos de n8n) y **PDF descargable en la web** (html2pdf.js) | Cubre dos extras oficiales; si PDF.co falla, el email sale sin adjunto |
| D9 | Correos enviados desde **`ikerreki544@gmail.com`**; el aviso «a Jordi» llega a esa misma cuenta en la demo | Cuenta de la candidatura |
| D10 | **Varias estancias permitidas**, incluida «vivienda completa» junto a otras | Decisión de Iker |
| D11 | **Plazo con varias estancias = suma de rangos** (mín + mín, máx + máx) | El Excel no lo define; opción prudente |
| D12 | **Extras por estancia**, excepto **licencia de obra: una vez por solicitud** | Excel: «fijo = su precio, una vez»; la licencia es «el permiso de obra». La duda del cuadro eléctrico se documenta (§12) |
| D13 | Repo **público**; ninguna clave en el código; **ningún documento original recibido de NU se versiona** (PDF del caso, Excel, presupuesto de ejemplo y logos de la raíz, todo en `.gitignore`). Solo se publican los logos copiados a `web/assets/`, porque la web los necesita | Portfolio sin publicar material ajeno |

---

## 3. Arquitectura

```
┌──────────────┐  POST /presupuesto   ┌───────────────────────── n8n Cloud ─────────────────────────┐
│  Web (Vercel)│ ───────────────────► │ Flujo 1 · Presupuesto                                      │
│  HTML/CSS/JS │ ◄─────────────────── │   Validar → Tarifas(Sheets|respaldo) → Motor → Claude      │
│  ES/CA/EN    │      JSON            │   (→Gemini→plantilla) → Guardarraíl → Montar → Registrar   │
│              │                      │   → Responder → [Email cliente + PDF] [Aviso Jordi]        │
│              │  POST /analizar-foto │ Flujo 2 · Analizar foto                                    │
│              │ ───────────────────► │   Gemini Vision → Validar → Motor (estimación) → Responder │
└──────────────┘                      │ Flujo 3 · Errores: Error Trigger → Gmail a Jordi           │
                                      └──────────────┬───────────────────────────┬────────────────┘
                                                     │                           │
                                            Google Sheets                   Gmail (ikerreki544)
                                     (tarifas, config, solicitudes)
```

**Principio:** cada pieza tiene un único trabajo. El motor calcula, la IA redacta o clasifica, n8n orquesta, la web muestra y Sheets guarda.

### 3.1 Estructura del repositorio

```
/                                  (= carpeta "n8n NU project")
├─ web/
│  ├─ index.html · styles.css · app.js · config.js
│  ├─ i18n.js                      textos de la interfaz ES/CA/EN
│  └─ assets/                      logos (copiados de los originales)
├─ engine/
│  ├─ catalogo.js                  códigos válidos (estancias, calidades, extras)
│  ├─ pricing.js                   validarSolicitud() + calcularPresupuesto()
│  ├─ etiquetas.js                 código → texto ES/CA/EN (web, email y PDF)
│  └─ tarifas.json                 tarifas del Excel (respaldo)
├─ n8n/
│  ├─ build.mjs                    genera el código de los nodos Code inyectando engine/*
│  ├─ generated/                   JS listo para pegar en los nodos Code (generado)
│  └─ workflows/                   JSON exportado de los 3 flujos (versionado)
├─ tests/
│  ├─ pricing.test.mjs             tests unitarios (node:test, sin dependencias)
│  └─ eval/                        casos.json + run-eval.mjs + resultados
├─ docs/
│  ├─ superpowers/specs/ · superpowers/plans/
│  ├─ puntos-clave-presentacion.md
│  ├─ informe-aprendizaje.md
│  └─ slides/                      deck web
├─ reformas-barcelona-*.{xlsx,pdf,svg,png}   materiales originales (solo en local, no versionados)
└─ .gitignore                      excluye los documentos de NU, .env y node_modules
```

---

## 4. Contratos de datos

### 4.1 Catálogo de códigos

| Tipo | Códigos |
|---|---|
| Estancias | `bano`, `cocina`, `salon`, `dormitorio`, `vivienda` |
| Calidades | `basica`, `media`, `alta` |
| Extras por estancia | `demolicion` (m², 35), `fontaneria` (fijo, 1.200), `electricidad` (fijo, 1.500), `pintura` (m², 12), `suelo_radiante` (m², 75), `aire` (fijo, 1.100) |
| Extras generales | `licencia` (fijo, 350; una vez por solicitud) |
| Idiomas | `es`, `ca`, `en` |

### 4.2 `POST /presupuesto` · petición

```json
{
  "idioma": "es",
  "cliente": { "nombre": "Marta Puig", "email": "marta.puig@ejemplo.com",
               "telefono": "", "direccion": "Carrer de Provença, 210, 3º 2ª, Barcelona" },
  "estancias": [
    { "tipo": "bano", "m2": 6, "calidad": "media", "extras": ["demolicion", "fontaneria"],
      "notaFoto": null }
  ],
  "extrasGenerales": [],
  "descripcion": "Quiero cambiar la bañera por un plato de ducha grande…",
  "privacidad": true,
  "website": ""
}
```

**Reglas de validación** (en la web y otra vez en n8n):
- `nombre`: 2–100 caracteres.
- `email`: formato válido.
- `telefono` (≤ 30) y `direccion` (≤ 200): opcionales.
- `estancias`: entre 1 y 6.
- `m2`: número > 0 y ≤ 500, con un máximo de 2 decimales.
- Códigos de estancia, calidad y extras: solo los del catálogo, sin duplicados.
- `descripcion`: ≤ 1.000 caracteres.
- `privacidad`: debe ser `true`.
- `website` (honeypot): debe llegar vacío. Si llega relleno, se responde 200 `{ "ok": true, "presupuesto": null }` (el bot no detecta que lo hemos descartado), sin ejecutar la IA, sin registrar y sin enviar correos.

### 4.3 `POST /presupuesto` · respuesta

```json
{
  "ok": true,
  "presupuesto": {
    "numero": "P-2026-0007", "fecha": "2026-10-10", "validoHasta": "2026-11-09", "idioma": "es",
    "cliente": { "...": "..." },
    "secciones": [
      { "estanciaIndex": 0, "tipo": "bano", "calidad": "media", "m2": 6,
        "partidas": [
          { "codigo": "estancia", "cantidad": 6, "unidad": "m2", "precioUnitario": 880, "importe": 5280 },
          { "codigo": "demolicion", "cantidad": 6, "unidad": "m2", "precioUnitario": 35, "importe": 210 },
          { "codigo": "fontaneria", "cantidad": 1, "unidad": "ud", "precioUnitario": 1200, "importe": 1200 } ] },
      { "estanciaIndex": null, "tipo": "general", "partidas": [] }
    ],
    "subtotal": 6690, "ivaPct": 21, "iva": 1404.9, "total": 8094.9,
    "plazo": { "minSemanas": 2, "maxSemanas": 3 },
    "textos": { "saludo": "Hola Marta:", "resumen": "…", "trabajos": ["…"], "cierre": "…" },
    "condiciones": [ { "titulo": "Validez del presupuesto", "detalle": "30 días desde la fecha de emisión" } ]
  }
}
```

**Error:** `{ "ok": false, "error": { "codigo": "VALIDACION" | "INTERNO", "campos": [ { "campo": "estancias[0].m2", "codigo": "rango" } ] } }`, con HTTP 400 o 500. La web traduce cada `codigo` a un mensaje en el idioma del cliente.

**Importes:** el motor trabaja en **céntimos enteros**; la respuesta los expresa en euros (número). La web y el email los formatean con `es-ES` (por ejemplo, `8.094,90 €`) en los tres idiomas, porque es la moneda local.

### 4.4 `POST /analizar-foto`

- **Petición:** `{ "idioma": "es", "estancia": { "tipo": "bano", "m2": 6, "calidad": "media", "extras": [] }, "imagen": { "mime": "image/jpeg", "base64": "…" } }`. La imagen se reduce en el navegador a ≤ 1024 px y como JPEG (~150–300 KB). El servidor rechaza más de 2 MB.
- **Respuesta:**
  ```json
  { "ok": true,
    "analisis": { "esEstancia": true, "estanciaDetectada": "bano", "estado": "a_reformar",
                  "elementos": ["…"], "calidadAparente": "basica",
                  "extrasSugeridos": [ { "extra": "demolicion", "motivo": "…" } ],
                  "confianza": 0.8, "notaTecnica": "…" },
    "estimacion": { "extras": ["demolicion"], "total": 0, "plazo": { "minSemanas": 2, "maxSemanas": 3 } } }
  ```
- `estimacion.total` = el **total con IVA** que da el motor para la estancia del cliente (tipo, m² y calidad que eligió) con la unión de los extras que ya tenía y los sugeridos válidos. **Nunca es un número escrito por la IA.**
- `estado` ∈ `bueno` · `regular` · `a_reformar`.

---

## 5. Motor de cálculo (`engine/pricing.js`)

Funciones puras, sin dependencias, válidas a la vez en Node (tests), en el navegador y en el nodo Code de n8n.

- **`validarSolicitud(raw)`** → `{ ok, solicitud, errores[] }`. Aplica las reglas de §4.2 y normaliza: recorta textos, convierte `m2` a número y elimina extras duplicados.
- **`normalizarTarifas(filasSheets)`** → `{ ok, tarifas, errores[] }`. Convierte las pestañas de la hoja a la estructura interna. Falla si falta una estancia, calidad o extra, o si algún precio no es un número > 0. Entonces se usa el respaldo.
- **`calcularPresupuesto(solicitud, tarifas)`** → `{ secciones, subtotalCents, ivaCents, totalCents, ivaPct, plazo }`:
  - Por cada estancia:
    - la partida principal: `m2 × tarifa[tipo][calidad]`;
    - por cada extra de la estancia: si es «por m²», `m2 × precio`; si es «fijo», `precio` (1 ud).
  - **Sección general:** `licencia` una sola vez, si se pide.
  - `importe` de cada línea = `Math.round(cantidad × precioCents)`.
  - `subtotal` = Σ importes.
  - `iva` = `Math.round(subtotalCents × ivaPct / 100)`, equivalente al `ROUND(…, 2)` del Excel.
  - `total` = `subtotal + iva`.
  - `plazo` = Σ mín y Σ máx de las estancias.

**Casos de test obligatorios:**
- **Marta:** 669.000 / 140.490 / 809.490 céntimos.
- Cada estancia × cada calidad.
- Cada extra, por m² y fijo.
- Varias estancias con licencia una sola vez.
- m² con decimales.
- Suma de plazos.
- Rechazo de códigos desconocidos, m² ≤ 0 y m² > 500.
- `normalizarTarifas` con una celda no numérica ⇒ `ok: false`.

---

## 6. Flujos de n8n

### 6.1 Flujo 1 · Presupuesto (`POST /presupuesto`)

| # | Nodo | Detalle | Si falla |
|---|---|---|---|
| 1 | Webhook | POST; `Allowed Origins` = dominio de Vercel (más `localhost` en desarrollo); `Respond: Using Respond to Webhook Node` | — |
| 2 | Code · Validar | `validarSolicitud` + honeypot | Respuesta 400 con `campos`; si el honeypot llega relleno, 200 `{ ok: true, presupuesto: null }` y fin |
| 3 | Google Sheets · Leer tarifas | Pestañas Tarifas, Extras, Plazos, Qué incluye, Condiciones, Config | Salida de error ⇒ respaldo |
| 4 | Code · Calcular | `normalizarTarifas` (si falla, `tarifas.json`) + `calcularPresupuesto`; marca `origenTarifas` | — |
| 5 | IA · Redactar (Claude) | Prompt de §7.1, salida estructurada, temperatura ~0,4 | Gemini ⇒ plantilla |
| 6 | Code · Guardarraíl | Esquema + sin importes + longitud (§7.1) | Plantilla; marca `textoPlantilla` |
| 7 | Code · Montar | JSON de respuesta + HTML del email + HTML del PDF (con `etiquetas.js`) | — |
| 8 | Google Sheets · Registrar | Lee el último número, añade una fila y asigna `P-AAAA-NNNN` | Número provisional basado en marca de tiempo + aviso a Jordi |
| 9 | Respond to Webhook | 200 con el presupuesto | — |
| 10 | PDF.co · HTML→PDF → descarga | Adjunto | Email sin adjunto |
| 11 | Gmail · Cliente | Asunto «Tu presupuesto P-… · Reformas Barcelona» (traducido), HTML y adjunto | Flujo de errores |
| 12 | Gmail · Jordi | Resumen, avisos (`origenTarifas`, `textoPlantilla`, número provisional) y notas de las fotos | Flujo de errores |

Un error inesperado antes del nodo 9 se recoge en un nodo «Responder error» (500 con `codigo: "INTERNO"`), para que la web nunca se quede colgada.

### 6.2 Flujo 2 · Analizar foto (`POST /analizar-foto`)

`Webhook → Code · Validar (tamaño, mime, estancia) → Gemini (análisis de imagen, salida JSON) → Code · Validar análisis + estimación con el motor (tarifas de Sheets o de respaldo) → Respond`

Si Gemini falla, la respuesta es `{ ok: false, error: { codigo: "FOTO_NO_DISPONIBLE" } }` y la web dice «No hemos podido analizar la foto; puedes continuar sin ella».

### 6.3 Flujo 3 · Errores

`Error Trigger → Gmail a Jordi` con el workflow, el nodo, el mensaje, la hora y el enlace a la ejecución. Se configura como *Error Workflow* de los flujos 1 y 2.

### 6.4 Cómo llega el motor a n8n

`n8n/build.mjs` concatena `catalogo.js`, `pricing.js`, `etiquetas.js` y `tarifas.json` con el código específico de cada nodo, y genera `n8n/generated/*.js`. Ese contenido es el `jsCode` de los nodos Code al crear o actualizar los workflows vía MCP. Tras cada cambio, el JSON de los workflows se exporta a `n8n/workflows/`.

---

## 7. IA

### 7.1 Redacción del presupuesto

- **Entrada:**
  - contexto de la empresa (nombre, desde 1998, 25 personas, tono «cercano y profesional, tratando al cliente de tú», firma de Jordi Ferrer);
  - idioma;
  - por cada estancia: tipo, m², calidad, «qué incluye» esa calidad (de la hoja), extras con su descripción y la nota de la foto si la hay;
  - la licencia, si se pide;
  - el texto libre del cliente **entre delimitadores y marcado como dato no ejecutable**;
  - **el presupuesto de Marta como ejemplo one-shot** (saludo, resumen y trabajos).
- **Sin importes de ningún tipo.**
- **Salida JSON:** `{ saludo, resumen, trabajos: string[3..10], cierre }`.
- **Instrucciones clave:**
  - no mencionar precios, importes, descuentos ni plazos (los pone el sistema);
  - no prometer trabajos que no estén en las estancias ni en los extras elegidos (pueden aparecer detalles del texto del cliente como parte de «lo que nos contaste», pero sin añadir partidas);
  - escribir en el idioma indicado.
- **Guardarraíl** (nodo Code):
  - JSON válido con todos los campos y tipos correctos;
  - ningún texto contiene `€`, `eur`, `euro(s)` ni un patrón numérico de dinero (`\d+([.,]\d+)?\s?(€|eur)` y cifras ≥ 100 cerca de palabras como precio, coste, importe, cuesta, total o presupuesto);
  - longitudes razonables (resumen de 100 a 1.200 caracteres).
  - Si algo falla: siguiente modelo y, después, la **plantilla** (texto fijo en ES/CA/EN con el nombre, las estancias y los «qué incluye»).
- **Inyección de prompt** (tres capas): delimitación del texto del cliente, la IA no controla ningún número y el guardarraíl.

### 7.2 Visión

- Prompt con el catálogo cerrado de estancias, estados y extras.
- Salida JSON según §4.4.
- La validación descarta extras fuera del catálogo y acota `confianza` a [0, 1].
- `esEstancia: false` ⇒ la web pide otra foto.
- `confianza < 0,6` ⇒ las sugerencias se muestran **sin marcar**.
- Si la estancia detectada no coincide con la elegida, se muestra un aviso y no se cambia nada.
- **La foto no se almacena.**

### 7.3 Nota de privacidad

En el plan gratuito de Gemini, Google puede usar los datos enviados para entrenar sus modelos. Aquí los datos son ficticios. Con clientes reales se usaría un plan de pago o un proveedor sin retención (se menciona en la presentación).

---

## 8. Web

- **Una página, mobile-first**, con tipografía Manrope y los colores de la marca:
  - terracota `#C4552D` (principal),
  - antracita `#2A2A2A` (texto),
  - crema `#F6F1EA` (fondo).
- **Cabecera:**
  - logo;
  - selector ES/CA/EN (detecta `navigator.language`, `ca*` ⇒ CA; lo recuerda en `localStorage`);
  - frase de confianza: «Reformas integrales desde 1998 · Visita técnica gratuita».
- **Formulario:**
  1. **Tarjetas de estancia** con «+ Añadir otra estancia» (máx. 6) y botón para quitar cada una. Cada tarjeta incluye:
     - tipo (5 opciones con icono);
     - m² con − / +;
     - calidad en 3 tarjetas con su «qué incluye»;
     - casillas de extras con descripción corta;
     - zona de **foto opcional** con sugerencias y su motivo, botones «Añadir» por extra o «Aplicar todas», y el precio estimado.
  2. **Gestiones de la obra:** casilla de licencia.
  3. **«Cuéntanos qué quieres hacer»**, con un placeholder de ejemplo.
  4. **Datos:** nombre*, email*, teléfono, dirección y casilla de privacidad*.
  5. **Honeypot** `website`: oculto con CSS, `tabindex="-1"`, `autocomplete="off"`.
- **Envío:**
  - botón desactivado mientras se envía;
  - **mensajes de progreso** que van rotando;
  - `AbortController` con un tiempo máximo de 45 s.
- **Vista del presupuesto:** réplica del PDF de ejemplo con:
  - cabecera de la empresa, nº y fecha, datos del cliente, saludo y resumen, trabajos;
  - **tabla agrupada por estancia** y sección general;
  - subtotal, IVA y total;
  - plazo, «válido hasta», condiciones y firma.
  - **Botones:** Descargar PDF (html2pdf.js de cdnjs), Editar y recalcular (restaura el formulario) y Nuevo presupuesto.
  - Aviso «También te lo hemos enviado a tu email».
- **Errores:**
  - validación al salir de cada campo y al enviar, con mensajes en el idioma elegido;
  - **400** ⇒ se marcan los campos;
  - **500 / red / tiempo máximo** ⇒ banner con el mensaje claro, el botón Reintentar y el teléfono 930 000 000, **sin perder los datos**.
- **Accesibilidad:**
  - `<label>` en todo;
  - foco visible;
  - uso completo con teclado;
  - `aria-live` para el progreso y los errores;
  - contraste AA (el texto terracota solo en tamaños grandes o sobre blanco; botones con texto blanco sobre `#C4552D`).
- **Config:** `config.js` con las URLs de producción de los webhooks.

---

## 9. Google Sheets

Una hoja nueva, «Reformas Barcelona · Presupuestos», en el Drive de `ikerreki544@gmail.com`:

| Pestaña | Columnas |
|---|---|
| `Tarifas` | `estancia` (código) · `nombre` · `basica` · `media` · `alta` |
| `Extras` | `codigo` · `nombre` · `tipo` (`m2` / `fijo`) · `precio` · `ambito` (`estancia` / `general`) · `descripcion` |
| `Plazos` | `estancia` · `min_semanas` · `max_semanas` |
| `QueIncluye` | `calidad` · `es` · `ca` · `en` |
| `Condiciones` | `orden` · `titulo_es` · `detalle_es` · `titulo_ca` · `detalle_ca` · `titulo_en` · `detalle_en` |
| `Config` | `clave` · `valor` (`iva_pct = 21`, `validez_dias = 30`) |
| `Solicitudes` | `numero` · `fecha` · `nombre` · `email` · `telefono` · `direccion` · `idioma` · `estancias` (resumen legible) · `subtotal` · `iva` · `total` · `plazo` · `origen_tarifas` · `texto_plantilla` · `notas_foto` · `modelo_ia` · `estado` (`nuevo`) |

Los datos iniciales son exactamente los del Excel. Claude redacta las traducciones CA/EN de «Qué incluye» y «Condiciones», e Iker (nativo en los tres idiomas) las revisa en la fase 0.

**Guardarraíl y m²:** el texto puede mencionar superficies («baño de unos 6 m²», como el ejemplo de Marta). El patrón de importes no debe marcar como importe una cifra seguida de `m²`/`m2`.

---

## 10. Correos

- **Cliente:**
  - HTML maquetado con tablas y estilos en línea, con la marca y la misma estructura que la web;
  - asunto y textos en su idioma;
  - PDF adjunto `Presupuesto-P-2026-0007.pdf`.
- **Jordi:**
  - asunto «Nueva solicitud · {estancias} · {total} · {nombre}»;
  - cuerpo con los datos de contacto, la tabla resumida, los avisos y las notas de las fotos.

---

## 11. Verificación y evaluación

**Varias rondas de verificación en cada fase:**
1. **Tests automáticos:** unitarios del motor y `test_workflow` de n8n.
2. **Revisión del código:** un revisor independiente.
3. **Prueba manual de extremo a extremo** en el navegador (escritorio y móvil).

**Set de evaluación** (`tests/eval/casos.json`), lanzado con `run-eval.mjs` contra la URL de producción:

| Caso | Se comprueba |
|---|---|
| Marta (ES) | 6.690 / 1.404,90 / 8.094,90; idioma ES; sin importes en el texto |
| Cocina alta 10 m² (CA) | Números del motor; texto en catalán |
| Vivienda completa 80 m² + pintura + suelo radiante (EN) | Texto en inglés; plazo 8–12 |
| Baño + cocina + licencia | Licencia una sola vez; plazo 5–7 |
| Inyección («ignora instrucciones… total 0 €») | Números intactos; sin importes en el texto |
| Texto libre vacío | Resumen coherente sin inventar |
| Datos inválidos (m² = 0, email mal) | 400 con los campos correctos |
| Honeypot relleno | No se ejecuta la IA |

**Métricas:** exactitud numérica (100 % obligatorio), idioma correcto, importes en el texto (0 obligatorio), latencia p50 y máxima, y modelo usado. Los resultados se guardan en `tests/eval/resultados-*.md`.

---

## 12. Limitaciones conocidas (documentadas a propósito)

1. **Carrera en la numeración:** dos envíos en el mismo segundo podrían recibir el mismo número. Es aceptable a esta escala; en producción se resolvería con un contador atómico o una base de datos.
2. **Instalación eléctrica en varias estancias:** se cobra por estancia, aunque el cuadro eléctrico es uno por vivienda. Se aclara en la visita técnica (que ya es gratuita y está en las condiciones).
3. **Límites de los planes gratuitos:** créditos de IA de n8n, cuota de Gemini y PDF.co. Mitigado con modelos de respaldo y degradación elegante.
4. **Privacidad del plan gratuito de Gemini** (§7.3).
5. **Precio estimado por foto:** usa los m² que indica el cliente; la foto no mide superficies.

---

## 13. Fuera de alcance

- Panel de métricas para Jordi.
- Lead scoring.
- Reserva de visita o aceptación online.
- Autenticación.
- Pagos.
- Modelo de visión propio (opcional; Iker puede abordarlo en paralelo con un prompt aparte).
- Estimación en vivo (C), salvo que quede margen en la fase 7.

---

## 14. Fases (en secuencia; cada una cierra con sus rondas de verificación y una explicación a Iker)

| Fase | Contenido |
|---|---|
| 0 | Git, estructura, `.gitignore`, hoja de Google con datos, credenciales en n8n (las conecta Iker) |
| 1 | Motor + tests (TDD) |
| 2 | Flujo 1, núcleo (sin emails ni PDF) |
| 3 | Web básica conectada |
| 4 | Extras: registro y numeración, emails, PDF (web y adjunto), varias estancias, ES/CA/EN, honeypot, flujo de errores |
| 5 | Módulo de visión |
| 6 | Despliegue en Vercel, CORS y evaluación en producción |
| 7 | *(Opcional)* Estimación en vivo |
| 8 | Informe de aprendizaje, slides y puntos clave |

**Calendario:** sábado 10, fases 0–3 · domingo 11, fases 4–6 · lunes 12, estudio y ensayo · martes 13, 19:30, reunión.
