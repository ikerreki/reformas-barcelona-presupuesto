import { workflow, node, trigger, sticky, ifElse, languageModel, expr } from '@n8n/workflow-sdk';

const webhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {
    name: 'Webhook',
    parameters: { httpMethod: 'POST', path: 'presupuesto', responseMode: 'responseNode', options: { allowedOrigins: '*' } },
    position: [0, 300],
  },
  output: [{ body: { idioma: 'es' }, headers: {}, query: {} }],
});

const validar = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Validar', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: '@@CODE:validar@@' }, position: [220, 300] },
  output: [{ ok: true, esBot: false, solicitud: {}, errores: [] }],
});

const esValida = ifElse({
  version: 2.3,
  config: {
    name: '¿Válida?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr('{{ $json.ok }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
    },
    position: [440, 300],
  },
});

const esBot = ifElse({
  version: 2.3,
  config: {
    name: '¿Es bot?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr('{{ $json.esBot }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
    },
    position: [660, 560],
  },
});

const responderBot = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: { name: 'Responder bot', parameters: { respondWith: 'json', responseBody: '{"ok":true,"presupuesto":null}', options: { responseCode: 200 } }, position: [880, 480] },
  output: [{ ok: true }],
});

const responder400 = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Responder 400',
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ JSON.stringify({ ok: false, error: { codigo: "VALIDACION", campos: $json.errores } }) }}'),
      options: { responseCode: 400 },
    },
    position: [880, 640],
  },
  output: [{ ok: false }],
});

const leerHoja = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Leer hoja',
    parameters: {
      method: 'GET',
      url: 'https://sheets.googleapis.com/v4/spreadsheets/1rSOnXhucE3Mp1aYjmgsWE8_hkHCnQfZASz39ocDC4ZE/values:batchGet?ranges=Tarifas&ranges=Extras&ranges=Plazos&ranges=QueIncluye&ranges=Condiciones&ranges=Config&ranges=Solicitudes!A2:B&valueRenderOption=UNFORMATTED_VALUE',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleSheetsOAuth2Api',
      options: { timeout: 10000 },
    },
    credentials: { googleSheetsOAuth2Api: { id: 'rd5Bk7aribYCOuua', name: 'Google Sheets account' } },
    onError: 'continueRegularOutput',
    position: [660, 300],
  },
  output: [{ valueRanges: [] }],
});

const calcular = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Calcular',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: '@@CODE:calcular@@' },
    onError: 'continueErrorOutput',
    position: [880, 300],
  },
  output: [{ reservar: true, filaReserva: [], promptRedaccion: '' }],
});

const responder500 = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: { name: 'Responder 500', parameters: { respondWith: 'json', responseBody: '{"ok":false,"error":{"codigo":"INTERNO"}}', options: { responseCode: 500 } }, position: [3080, 640] },
  output: [{ ok: false }],
});

const hayQueReservar = ifElse({
  version: 2.3,
  config: {
    name: '¿Reservar fila?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr('{{ $json.reservar }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
    },
    position: [1100, 300],
  },
});

const reservarFila = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Reservar fila',
    parameters: {
      method: 'POST',
      url: 'https://sheets.googleapis.com/v4/spreadsheets/1rSOnXhucE3Mp1aYjmgsWE8_hkHCnQfZASz39ocDC4ZE/values/Solicitudes!A:R:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleSheetsOAuth2Api',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ values: [$json.filaReserva] }) }}'),
      options: { timeout: 10000 },
    },
    credentials: { googleSheetsOAuth2Api: { id: 'rd5Bk7aribYCOuua', name: 'Google Sheets account' } },
    onError: 'continueRegularOutput',
    position: [1320, 200],
  },
  output: [{ updates: { updatedRange: 'Solicitudes!A2:R2' } }],
});

const asignarNumero = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Asignar número', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: '@@CODE:asignar-numero@@' }, position: [1540, 300] },
  output: [{ numero: 'P-2026-0001', numeroProvisional: false, numeroExistente: false, filaReservada: 'Solicitudes!A2:R2' }],
});

const claude = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
  version: 1.6,
  config: {
    name: 'Claude',
    parameters: {
      model: { __rl: true, mode: 'list', value: 'claude-sonnet-5', cachedResultName: 'Claude Sonnet 5' },
      options: { maxTokensToSample: 1500 },
    },
    position: [1760, 520],
  },
});

const redactarClaude = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: {
    name: 'Redactar · Claude',
    parameters: { promptType: 'define', text: expr('{{ $("Calcular").first().json.promptRedaccion }}') },
    subnodes: { model: claude },
    onError: 'continueRegularOutput',
    position: [1760, 300],
  },
  output: [{ text: '{"saludo":"Hola Marta:"}' }],
});

const comprobarClaude = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Comprobar Claude', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: '@@CODE:comprobar-ia@@' }, position: [1980, 300] },
  output: [{ ok: true, textos: {}, motivo: null, modelo: 'claude' }],
});

const textoOk = ifElse({
  version: 2.3,
  config: {
    name: '¿Texto OK?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr('{{ $json.ok }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
    },
    position: [2200, 300],
  },
});

const gemini = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
  version: 1.2,
  config: {
    name: 'Gemini',
    parameters: { modelName: 'models/gemini-3-flash-preview', options: { temperature: 0.4, maxOutputTokens: 2048 } },
    credentials: { googlePalmApi: { id: 'lbFW2OhO3S0ytP2r', name: 'Google Gemini(PaLM) Api account' } },
    position: [2420, 720],
  },
});

const redactarGemini = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: {
    name: 'Redactar · Gemini',
    parameters: { promptType: 'define', text: expr('{{ $("Calcular").first().json.promptRedaccion }}') },
    subnodes: { model: gemini },
    onError: 'continueRegularOutput',
    position: [2420, 500],
  },
  output: [{ text: '{"saludo":"Hola Marta:"}' }],
});

const comprobarGemini = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Comprobar Gemini', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: '@@CODE:comprobar-ia@@' }, position: [2640, 500] },
  output: [{ ok: true, textos: {}, motivo: null, modelo: 'gemini' }],
});

const montar = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Montar',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: '@@CODE:montar@@' },
    onError: 'continueErrorOutput',
    position: [2860, 300],
  },
  output: [{ respuesta: { ok: true }, filaSolicitud: [] }],
});

const filaReservada = ifElse({
  version: 2.3,
  config: {
    name: '¿Fila reservada?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr('{{ !!$("Asignar número").first().json.filaReservada }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
    },
    position: [3080, 300],
  },
});

const completarFila = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Completar fila',
    parameters: {
      method: 'PUT',
      url: expr('https://sheets.googleapis.com/v4/spreadsheets/1rSOnXhucE3Mp1aYjmgsWE8_hkHCnQfZASz39ocDC4ZE/values/{{ encodeURIComponent($("Asignar número").first().json.filaReservada) }}?valueInputOption=RAW'),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleSheetsOAuth2Api',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ values: [$("Montar").first().json.filaSolicitud] }) }}'),
      options: { timeout: 10000 },
    },
    credentials: { googleSheetsOAuth2Api: { id: 'rd5Bk7aribYCOuua', name: 'Google Sheets account' } },
    onError: 'continueRegularOutput',
    position: [3300, 200],
  },
  output: [{ updatedRange: 'Solicitudes!A2:R2' }],
});

const responder200 = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Responder 200',
    parameters: { respondWith: 'json', responseBody: expr('{{ JSON.stringify($("Montar").first().json.respuesta) }}'), options: { responseCode: 200 } },
    position: [3520, 300],
  },
  output: [{ ok: true }],
});

const nota1 = sticky('## 1 · Entrada y validación\nNunca nos fiamos del navegador: se valida todo otra vez. Honeypot: un bot recibe un "OK" falso y no gasta IA.',
  [webhook, validar, esValida, esBot, responderBot, responder400], { color: 7 });
const nota2 = sticky('## 2 · Tarifas y cálculo\nLas tarifas se leen de la hoja de Jordi. Si la hoja falla o tiene un precio raro, se usan las de respaldo. El motor calcula en céntimos.',
  [leerHoja, calcular], { color: 4 });
const nota3 = sticky('## 3 · Numeración atómica\nSe reserva una fila ANTES de la IA: Google da filas distintas a dos clientes simultáneos, así que los números nunca se repiten. Un reintento conserva su número.',
  [hayQueReservar, reservarFila, asignarNumero], { color: 5 });
const nota4 = sticky('## 4 · La IA solo redacta\nNo recibe ningún importe. Guardarraíl: si escribe un precio, un enlace o una promesa, pasa a Gemini y, si vuelve a fallar, a la plantilla.',
  [redactarClaude, comprobarClaude, textoOk, redactarGemini, comprobarGemini], { color: 3 });
const nota5 = sticky('## 5 · Montaje, registro y respuesta\nNúmeros del motor + textos de la IA: web, email, PDF y fila completa en la hoja.',
  [montar, filaReservada, completarFila, responder200, responder500], { color: 6 });

export default workflow('presupuestos-reformas-barcelona', 'Reformas Barcelona · Presupuesto')
  .add(webhook)
  .to(validar)
  .to(esValida
    .onTrue(leerHoja.to(calcular))
    .onFalse(esBot.onTrue(responderBot).onFalse(responder400)))
  .add(calcular)
  .to(hayQueReservar
    .onTrue(reservarFila.to(asignarNumero))
    .onFalse(asignarNumero))
  .add(calcular.onError(responder500))
  .add(asignarNumero)
  .to(redactarClaude)
  .to(comprobarClaude)
  .to(textoOk
    .onTrue(montar)
    .onFalse(redactarGemini.to(comprobarGemini).to(montar)))
  .add(montar)
  .to(filaReservada
    .onTrue(completarFila.to(responder200))
    .onFalse(responder200))
  .add(montar.onError(responder500))
  .add(nota1)
  .add(nota2)
  .add(nota3)
  .add(nota4)
  .add(nota5);
