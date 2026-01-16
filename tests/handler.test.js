// Simple tests for Lambda handler scenarios
const { handler } = require("../index.js");

function makeEvent({
  path = "/",
  method = "GET",
  query = {},
  headers = {},
  body = null,
  body2 = null,
  isBase64Encoded = false,
} = {}) {
  const evt = {
    httpMethod: method,
    path,
    queryStringParameters: { ...query },
    headers,
    body,
    body2,
    isBase64Encoded,
  };
  return evt;
}

async function run(name, fn) {
  try {
    const res = await fn();
    console.log(`TEST PASS: ${name}`);
    return res;
  } catch (e) {
    console.error(`TEST FAIL: ${name}`);
    console.error(e);
    process.exitCode = 1;
  }
}
/*
// 1) REST: invalid baseURL -> expect 400
run("rest invalid baseURL", async () => {
  const event = makeEvent({
    query: { base_url: "ftp://bad.url" },
    headers: { "X-Mode": "rest" },
  });
  const res = await handler(event, {});
  const body = JSON.parse(res.body);
  console.log("invalid Url status:", res.statusCode);
  console.log("invalid Url body:", res.body);
});

// 2) CEDULA válida
run("cedula valida", async () => {
  // Use a commonly valid sample like 1710034065 (example pattern; adjust if needed)
  const event = makeEvent({
    query: { cedula: "1311461790", country: "ec" },
    headers: { "X-Mode": "cedula" },
  });
  const res = await handler(event, {});
  const body = JSON.parse(res.body);
  console.log("cedula status:", res.statusCode);
  console.log("cedula body:", res.body);
});

// 4) EMAIL válido
run("email valido", async () => {
  const event = makeEvent({
    query: { email: "jpacheco@xkale,com" },
    headers: { "X-Mode": "email" },
  });
  const res = await handler(event, {});
  const body = JSON.parse(res.body);
  console.log("email status:", res.statusCode);
  console.log("email body:", res.body);
});

// 7) Integration-like PATCH to external API (optional). Set RUN_INTEGRATION=1 to enable.
if (process.env.RUN_INTEGRATION === "1") {
  run("rest PATCH external (integration)", async () => {
    const baseUrl =
      "https://sdp-salesforce-sapi-fw-dev-k0x124.x5l6ap.usa-e2.cloudhub.io";
    const event = makeEvent({
      method: "PATCH",
      path: "/api/v1/account/contract-acceptance",
      query: { cedula: "1723952584" },
      headers: {
        "X-Mode": "rest",
        "X-Base-Url": baseUrl,
        "X-Timeout": "200000",
        client_id: "a6aeb5c4767849d3bbecc256200dfd95",
        client_secret: "7b4E79CDdfD84F408C330E6CDacB49C0",
        "x-correlation-id": "d5534aa6-4f9c-4e57-8bdd-dc7d54d883eb",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contractAcceptance: "Sí" }),
    });
    const res = await handler(event, {});
    console.log("PATCH Integration status:", res.statusCode);
    console.log("PATCH Integration body:", res.body);
  });
}

// 8) Integration-like POST to /api/v1/otp (optional). Set RUN_INTEGRATION=1 to enable.
if (process.env.RUN_INTEGRATION === "1") {
  run("rest POST external /api/v1/otp (integration)", async () => {
    const baseUrl =
      "https://sdp-salesforce-sapi-fw-dev-k0x124.x5l6ap.usa-e2.cloudhub.io";
    const event = makeEvent({
      method: "POST",
      path: "/api/v1/otp",
      headers: {
        "X-Mode": "rest",
        "X-Base-Url": baseUrl,
        "X-Timeout": "200000",
        client_id: "a6aeb5c4767849d3bbecc256200dfd95",
        client_secret: "7b4E79CDdfD84F408C330E6CDacB49C0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identity: "651465456465",
        email: "jpacheco@xkale.com",
        channel: "1",
      }),
    });
    const res = await handler(event, {});
    console.log("POST OTP Integration status:", res.statusCode);
    console.log("POST OTP Integration body:", res.body);
  });
}

// 10) Integration-like GET to /api/accounts with query (optional). Set RUN_INTEGRATION=1 to enable.
if (process.env.RUN_INTEGRATION === "1") {
  run("rest GET external /api/accounts with query (integration)", async () => {
    const baseUrl =
      "https://sdp-data-salesforce-dev-k0x124.x5l6ap.usa-e2.cloudhub.io";
    const event = makeEvent({
      method: "GET",
      path: "/api/accounts",
      query: { documentNumber: "1714399217" },
      headers: {
        "X-Mode": "rest",
        "X-Base-Url": baseUrl,
        "X-Timeout": "200000",
        client_id: "723364749990431d9bd224efac0ce75a",
        client_secret: "6f89EEaB7DCa421082073738624eb032",
        "x-correlation-id": "1f1a6af9-b080-4fb2-91ed-fc78fa3deed6",
      },
    });
    const res = await handler(event, {});
    console.log("Accounts GET Integration status:", res.statusCode);
    console.log("Accounts GET Integration body:", res.body);
  });
}

// 11) Integration-like PUT to /api/v1/account/task with query and JSON body (optional). Set RUN_INTEGRATION=1 to enable.
if (process.env.RUN_INTEGRATION === "1") {
  run("rest PUT external /api/v1/account/task (integration)", async () => {
    const baseUrl =
      "https://sdp-salesforce-sapi-fw-dev-k0x124.x5l6ap.usa-e2.cloudhub.io";
    const event = makeEvent({
      method: "PUT",
      path: "/api/v1/account/task",
      query: { taskId: "00Tbc00000AShqfEAD" },
      headers: {
        "X-Mode": "rest",
        "X-Base-Url": baseUrl,
        "X-Timeout": "300000",
        client_id: "a6aeb5c4767849d3bbecc256200dfd95",
        client_secret: "7b4E79CDdfD84F408C330E6CDacB49C0",
        "x-correlation-id": "fedc5996-c592-4a6c-ba59-03429745f22e",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Subject: "CHATBOT WHATSAPP - CRISTHIAN JOSE AREVALO - 25/11/2025 10:56",
        Priority: "Normal",
        BC_Tipodecontacto__c: "In",
        GLB_ContactChannel__c: "WhatsApp",
        BC_Nombredelcliente__c: "CRISTHIAN JOSE AREVALO",
        SDP_originTask__c: "Manual",
        BCComentarios__c: "PRUEBAS 25/11/2025",
        Status: "Open",
        WhatId: "",
        GLB_InteractionReason__c: "Información estado de pagos",
        BC_Numerodeidentificacion__c: "1105149478",
        BC_Tipodeidentificacion__c: "00",
        BC_URLdellamada__c: "pruebas llamada url",
        BC_IDdelparticipante__c: "pruebas llamada url",
        BC_Numerodelllamante__c: "998193198",
        CallDisposition: "ok",
        SDP_OptionCall__c: "1-opcion 1",
        CallObject: "",
        BC_ACDQueue__c: "whatsapp",
        BC_Numerosaliente__c: "998193198",
        BC_Duraciondelallamada__c: "158.36",
        BC_Telefono__c: "998193198",
        GLB_Requester__c: "Broker",
        GLB_Email__c: "cjarevalo@seg-pichincha.com",
        GLB_RequesterName__c: "",
        GLB_ClientProduct__c: "SONRIETE",
        GLB_BusinessLineDescription__c: "VIDA COLECTIVO",
        GLB_PolicyId__c: "123456",
        GLB_AgencyCode__c: "1",
        GLB_ProductDescription__c: "VIDA COLECTIVO",
        GLB_CertificateId__c: "4589644",
        GLB_QuoteId__c: "745698",
        GLB_PolicyStartDate__c: "45621",
        GLB_InteractionType__c:
          "Consulta de Productos, Servicios, Beneficios y Coberturas",
        ChatBotId: "a1dbc000004UNUjAAO",
        InformacionChat: [
          {
            Pregunta__c: "¿Cuál es el horario de atención?",
            Respuesta__c:
              "Nuestro horario es de lunes a viernes de 8:00 a 18:00.",
          },
          {
            Pregunta__c: "¿Cómo puedo pagar mi póliza?",
            Respuesta__c:
              "Puedes pagar en línea a través de nuestro portal o en agencias autorizadas.",
          },
          {
            Pregunta__c: "¿Qué hacer en caso de siniestro?",
            Respuesta__c:
              "Comunícate con nuestro centro de asistencia al número 1800-XXX-XXX.",
          },
        ],
      }),
    });
    const res = await handler(event, {});
    console.log("Task PUT Integration status:", res.statusCode);
    console.log("Task PUT Integration body:", res.body);
  });
}

// 12) Integration-like POST to /api/v1/account/task with query and JSON body (from provided curl)
if (process.env.RUN_INTEGRATION === "1") {
  run("rest POST external /api/v1/account/task (integration - curl)", async () => {
    const baseUrl =
      "https://sdp-salesforce-sapi-fw-dev-k0x124.x5l6ap.usa-e2.cloudhub.io";
    const event = makeEvent({
      method: "POST",
      path: "/api/v1/account/task",
      query: { cedula: "1723952584" },
      headers: {
        "X-Mode": "rest",
        "X-Base-Url": baseUrl,
        "X-Timeout": "300000",
        client_id: "a6aeb5c4767849d3bbecc256200dfd95",
        client_secret: "7b4E79CDdfD84F408C330E6CDacB49C0",
        "x-correlation-id": "d61fd3cb-df52-4212-acb3-cb698753e5bf",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Subject:
          "CHATBOT WHATSAPP - CRISTHIAN JOSE AREVALO - 25/11/2025 10:56",
        Priority: "Normal",
        BC_Tipodecontacto__c: "In",
        GLB_ContactChannel__c: "WhatsApp",
        BC_Nombredelcliente__c: "CRISTHIAN JOSE AREVALO",
        SDP_originTask__c: "Manual",
        BCComentarios__c: "PRUEBAS 25/11/2025",
        Status: "Open",
        GLB_InteractionReason__c: "Información estado de pagos",
        BC_Numerodeidentificacion__c: "1105149478",
        BC_Tipodeidentificacion__c: "00",
        BC_URLdellamada__c: "pruebas llamada url",
        BC_IDdelparticipante__c: "pruebas llamada url",
        BC_Numerodelllamante__c: "998193198",
        CallDisposition: "ok",
        SDP_OptionCall__c: "1-opcion 1",
        CallObject: "",
        BC_ACDQueue__c: "whatsapp",
        BC_Numerosaliente__c: "998193198",
        BC_Duraciondelallamada__c: "158.36",
        BC_Telefono__c: "998193198",
        GLB_Requester__c: "Broker",
        GLB_Email__c: "cjarevalo@seg-pichincha.com",
        GLB_RequesterName__c: "",
        GLB_ClientProduct__c: "SONRIETE",
        GLB_BusinessLineDescription__c: "VIDA COLECTIVO",
        GLB_PolicyId__c: "123456",
        GLB_AgencyCode__c: "1",
        GLB_ProductDescription__c: "VIDA COLECTIVO",
        GLB_CertificateId__c: "4589644",
        GLB_QuoteId__c: "745698",
        GLB_PolicyStartDate__c: "45621",
        GLB_InteractionType__c:
          "Consulta de Productos, Servicios, Beneficios y Coberturas",
        ActivityDate: "2025-11-25",
        RecordTypeId: "012bc000000R0GuAAK",
        SDP_createChat__c: false,
      }),
    });
    const res = await handler(event, {});
    console.log("Task POST (curl) Integration status:", res.statusCode);
    console.log("Task POST (curl) Integration body:", res.body);
  });
}

// 9) Integration-like GET to /api/v1/otp with query (optional). Set RUN_INTEGRATION=1 to enable.
if (process.env.RUN_INTEGRATION === "1") {
  run("rest GET external /api/v1/otp with query (integration)", async () => {
    const baseUrl =
      "https://sdp-salesforce-sapi-fw-dev-k0x124.x5l6ap.usa-e2.cloudhub.io";
    const event = makeEvent({
      method: "GET",
      path: "/api/v1/otp",
      query: { code: "01143", identity: "1234567906" },
      headers: {
        "X-Mode": "rest",
        "X-Base-Url": baseUrl,
        "X-Timeout": "200000",
        client_id: "a6aeb5c4767849d3bbecc256200dfd95",
        client_secret: "7b4E79CDdfD84F408C330E6CDacB49C0",
      },
    });
    const res = await handler(event, {});
    console.log("OTP GET Integration status:", res.statusCode);
    console.log("OTP GET Integration body:", res.body);
  });
}

// 12) Integration-like POST to /api/v1/account/task with query and JSON body (from provided curl)

if (process.env.RUN_INTEGRATION === "1") {
  run("rest POST body string (Genesys)", async () => {
    const baseUrl =
      "https://sdp-salesforce-sapi-fw-dev-k0x124.x5l6ap.usa-e2.cloudhub.io";
    const event = makeEvent({
      method: "POST",
      path: "/api/v1/account/task",
      query: { cedula: "1723952584" },
      headers: {
        "X-Mode": "rest",
        "X-Base-Url": baseUrl,
        "Content-Type": "application/json",
        "X-Timeout": "300000",
        client_id: "a6aeb5c4767849d3bbecc256200dfd95",
        client_secret: "7b4E79CDdfD84F408C330E6CDacB49C0",
        "x-correlation-id": "d61fd3cb-df52-4212-acb3-cb698753e5bf",
      },
      body: "{\"Subject\":\"CHATBOT WHATSAPP - CRISTHIAN JOSE AREVALO - 25/11/2025 10:56\",\"Priority\":\"Normal\",\"BC_Tipodecontacto__c\":\"In\",\"GLB_ContactChannel__c\":\"WhatsApp\",\"BC_Nombredelcliente__c\":\"CRISTHIAN JOSE AREVALO\",\"SDP_originTask__c\":\"Manual\",\"BCComentarios__c\":\"PRUEBAS 25/11/2025\",\"Status\":\"Open\",\"GLB_InteractionReason__c\":\"Información estado de pagos\",\"BC_Numerodeidentificacion__c\":\"1105149478\",\"BC_Tipodeidentificacion__c\":\"00\",\"BC_URLdellamada__c\":\"pruebas llamada url\",\"BC_IDdelparticipante__c\":\"pruebas llamada url\",\"BC_Numerodelllamante__c\":\"998193198\",\"CallDisposition\":\"ok\",\"SDP_OptionCall__c\":\"1-opcion 1\",\"CallObject\":\"\",\"BC_ACDQueue__c\":\"whatsapp\",\"BC_Numerosaliente__c\":\"998193198\",\"BC_Duraciondelallamada__c\":\"158.36\",\"BC_Telefono__c\":\"998193198\",\"GLB_Requester__c\":\"Broker\",\"GLB_Email__c\":\"cjarevalo@seg-pichincha.com\",\"GLB_RequesterName__c\":\"\",\"GLB_ClientProduct__c\":\"SONRIETE\",\"GLB_BusinessLineDescription__c\":\"VIDA COLECTIVO\",\"GLB_PolicyId__c\":\"123456\",\"GLB_AgencyCode__c\":\"1\",\"GLB_ProductDescription__c\":\"VIDA COLECTIVO\",\"GLB_CertificateId__c\":\"4589644\",\"GLB_QuoteId__c\":\"745698\",\"GLB_PolicyStartDate__c\":\"45621\",\"GLB_InteractionType__c\":\"Consulta de Productos, Servicios, Beneficios y Coberturas\",\"ActivityDate\":\"2025-11-25\",\"RecordTypeId\":\"012bc000000R0GuAAK\",\"SDP_createChat__c\":false}",
   });
    const res = await handler(event, {});
    console.log("Genesys POST status:", res.statusCode);
    console.log("Genesys POST body:", res.body);
  });
}
*/

if (process.env.RUN_INTEGRATION === "1") {
  run("rest POST body string (Genesys)", async () => {
    const baseUrl =
      "https://busservicioscert.segurosdelpichincha.com:5370";
  const baseUrl2 =
      "https://busservicioscert.segurosdelpichincha.com:5370/rest/jwt/switchtrans";
    const event = makeEvent({
      method: "POST",
      path: "/rest/jwt/generatoken",
      headers: {
        "X-Mode": "rest",
        "X-Base-Url": baseUrl,
        "X-Next-Url": baseUrl2,
        "Content-Type": "application/json",
        "X-Timeout": "300000",
        "x-correlation-id": "d61fd3cb-df52-4212-acb3-cb698753e5bf",
        "x-raw-json": "false"
      },
      body: "{\"Username\":\"XKALE\",\"Password\":\"xk413P@$$w0rd\"}",
      body2: "{\"proveedor\":\"SEGPIC\",\"requer\":\"SEGPIC03\",\"cli_id\":\"1715521413\",\"cli_tipo_id\":\"00\",\"variables\":[\"0603402777\"]}",
   });
    const res = await handler(event, {});
    console.log("Genesys POST status:", res.statusCode);
    console.log("Genesys POST body:", res.body);
  });
}