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
  });*/

if (process.env.RUN_INTEGRATION === "1") {
  run("rest POST body string (Genesys)", async () => {
    const baseUrl = "https://busservicioscert.segurosdelpichincha.com:5370";
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
        "x-raw-json": "false",
        "x-tipo-consulta": "producto-asistencia",
      },
      body: '{"Username":"XKALE","Password":"xk413P@$$w0rd"}',
      body2:
        '{"proveedor":"SEGPIC","requer":"SEGPIC05","cli_id":"1715521413","cli_tipo_id":"00","variables":["0603402777",""]}',
    });
    const res = await handler(event, {});
    console.log("Genesys POST status:", res.statusCode);
    console.log("Genesys POST body:", res.body);
  });
}
