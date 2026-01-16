/**
 * index.js
 * AWS Lambda handler que reenvía la petición a un servicio externo usando createApiClient.
 * - La entrada (event.body) puede ser JSON dinámico o cualquier otro payload: se pasa tal cual cuando no se puede parsear.
 * - La respuesta siempre será 200 con el objeto normalizado:
 *   { error:"", mensajeUsuario:"", mensajeSistema:"", data: ... }
 *
 * Variables de entorno:
 * - BASE_URL: URL base del servicio destino (obligatorio)
 * - TIMEOUT: timeout en ms (opcional, default 10000)
 */

const { createApiClient } = require("./axios-middleware");
const {
  getHeader,
  getParam,
  getMode,
  getConfigFromRequest,
  isValidBaseURL,
} = require("./request-utils");

// Configuración: baseURL y timeout se determinan exclusivamente por request (query/body/headers).
// No se usan variables de entorno; si no llegan, se aplican valores por defecto controlados.
const ENV_BASE_URL = ""; // default vacío obliga a enviar baseURL en modo rest
const ENV_TIMEOUT = 100000; // default razonable cuando no se especifica

// Plantilla global de respuesta (estructura mínima solicitada)
const baseResponse = {
  success: false,
  status: 200,
  error: "",
  mensajeUsuario: "",
  mensajeSistema: "",
  data: null,
};
// Utilidad: reemplaza todos los valores null por cadenas vacías "" de forma recursiva
function replaceNulls(value) {
  if (value === null) return "";
  if (Array.isArray(value)) return value.map(replaceNulls);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value)) {
      out[k] = replaceNulls(value[k]);
    }
    return out;
  }
  return value;
}

// Agrupa coberturas por producto a partir de data.Table
function groupCoberturasByProducto(data) {
  if (!data || typeof data !== "object") return null;
  const rows = Array.isArray(data.Table)
    ? data.Table
    : Array.isArray(data.table)
    ? data.table
    : [];
  const map = new Map();
  for (const r of rows) {
    const raw = r && r.Producto ? String(r.Producto) : "SIN_PRODUCTO";
    const key = raw.length > 24 ? raw.slice(0, 24) : raw; // truncar clave a 24
    const descripcion = raw; // mantener descripción completa
    const cobertura = {
      Codigo: r && r.Cobertura,
      Nombre: r && r.nom_cobertura,
      MontoAsegurado: r && r.MontoAsegurado,
      Dividendo: r && r.Dividendo,
    };
    if (map.has(key)) {
      map.get(key).Coberturas.push(cobertura);
    } else {
      map.set(key, {
        Producto: key,
        Descripcion: descripcion,
        Agencia: r && r.Agencia,
        Cotizacion: r && r.Cotizacion,
        Poliza: r && r.Poliza,
        Certificado_Individual: r && r.Certificado_Individual,
        FechaInicioVigencia: r && r.FechaInicioVigencia,
        Coberturas: [cobertura],
      });
    }
  }
  return Array.from(map.values());
}

exports.handler = async (event, context) => {
  // Evitar que Lambda espere el event loop
  if (
    context &&
    typeof context.callbackWaitsForEmptyEventLoop !== "undefined"
  ) {
    context.callbackWaitsForEmptyEventLoop = false;
  }
  console.log("Received event:", JSON.stringify(event));
  const requestId =
    (context && context.awsRequestId) ||
    (event.headers &&
      (event.headers["X-Request-Id"] || event.headers["x-request-id"])) ||
    null;
  // Cabeceras: clonamos las entrantes y añadimos X-Request-Id si no existe
  const headers = Object.assign({}, event.headers || {});
  if (requestId) {
    headers["X-Request-Id"] =
      headers["X-Request-Id"] || headers["x-request-id"] || requestId;
  }
  console.log("Using headers:", JSON.stringify(headers));

  let raw = event?.body ?? null;
  let bodyObj = null;
  try {
    if (raw != null) {
      if (event.isBase64Encoded) {
        raw = Buffer.from(raw, "base64").toString("utf8");
      }
      if (typeof raw === "string") {
        bodyObj = JSON.parse(raw);
        if (
          typeof bodyObj === "string" &&
          bodyObj.trim().startsWith("{") &&
          bodyObj.trim().endsWith("}")
        ) {
          try {
            bodyObj = JSON.parse(bodyObj);
          } catch {}
        }
      } else if (typeof raw === "object") {
        bodyObj = raw;
      }
    }
  } catch {
    // si falla, bodyObj queda null y no se envía data en la petición REST
  }
  console.log("Using body data:", bodyObj ? JSON.stringify(bodyObj) : raw);
  const mode = getMode(headers);
  console.log(`Operating in mode: ${mode}`);
  const params = event.queryStringParameters || undefined;
  console.log("Using query params:", JSON.stringify(params));
  // Flag opcional para devolver body como objeto JSON en vez de string
  const wantRawJson =
    String(
      getHeader(headers, "x-raw-json", "X-Raw-Json") || ""
    ).toLowerCase() === "true";
  // Manejadores locales (sin llamada HTTP externa)

  const method = (event.httpMethod || "GET").toLowerCase();
  // Usamos event.path como ruta relativa; si necesitas mapear pathParameters adapta aquí.
  const url = event.path || "/";

  // Extracción dinámica de baseURL y timeout
  const { baseURL, timeout } = getConfigFromRequest(
    params,
    headers,
    ENV_BASE_URL,
    ENV_TIMEOUT
  );

  // Validación básica de baseURL para evitar SSRF trivial (solo http/https y sin espacios)
  const baseURLIsValid = isValidBaseURL(baseURL);
  if (mode === "rest" && (!baseURL || !baseURLIsValid)) {
    const fallback = {
      success: false,
      status: 400,
      error: "BASE_URL_INVALIDA",
      mensajeUsuario: "La base URL especificada es inválida o está ausente.",
      mensajeSistema: `Valor recibido baseURL='${baseURL}' no cumple formato http/https requerido`,
      data: null,
    };
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: (function () {
        if (wantRawJson) {
          return replaceNulls({ ...fallback, success });
        }
        return JSON.stringify(replaceNulls(fallback));
      })(),
    };
  }

  // Crear cliente Axios específico de la petición
  const apiClient = createApiClient({ baseURL, timeout });

  try {
    const response = await apiClient.request({
      method,
      url,
      params,
      data: bodyObj ?? undefined,
      headers,
    });

    // success true/false: false para cualquier 5xx
    const is5xx =
      typeof response.status === "number" &&
      response.status >= 501 &&
      response.status < 600;
    // Éxito solo si el servicio externo respondió 200
    const success = response.status === 200;
    // Devolvemos código real si es 5xx, de lo contrario 200
    let outboundStatus = 200;
    let resp = "";
    if (success === true) {
      resp = Object.assign({}, baseResponse, {
        status: response.status,
        error: response.error || "",
        mensajeUsuario: "",
        mensajeSistema: "",
        data: response.data !== undefined ? response.data : null,
      });
      let bodyObj = event?.body2 ?? null;
      let methodo = (event.httpMethod || "GET").toLowerCase();
      let base = getHeader(headers, "x-next-url", "X-Next-Url", "X-Next-URL");
      // Usamos event.path como ruta relativa; si necesitas mapear pathParameters adapta aquí.
      headers["Authorization"] = response.data;
      // Intentar ejecutar una siguiente API si se proporcionan datos
      const nextResp = await apiClient.request({
        method: methodo,
        url: base,
        data: bodyObj,
        headers: { ...headers, ...(headers || {}) },
      });
      // Estructura adicional: agrupado por producto
      if (nextResp && nextResp.data) {
        nextResp.agrupadoPorProducto = groupCoberturasByProducto(
          nextResp.data
        );
      }
      resp = Object.assign({}, baseResponse, {
        status: nextResp.status,
        error: nextResp.error || "",
        mensajeUsuario: nextResp.mensajeUsuario || "",
        mensajeSistema: nextResp.mensajeSistema || "",
        data: nextResp.agrupadoPorProducto !== undefined ? nextResp.agrupadoPorProducto : null,
      });
    } else {
      outboundStatus = is5xx ? response.status : 200;
    }

    return {
      statusCode: outboundStatus,
      headers: { "Content-Type": "application/json" },
      body: (function () {
        const payload = replaceNulls({ ...resp, success });
        return wantRawJson ? payload : JSON.stringify(payload);
      })(),
    };
  } catch (err) {
    // Fallback inesperado: tratamos como error interno -> 500
    const fallback = Object.assign({}, baseResponse, {
      status: 500,
      error: "UNEXPECTED_ERROR",
      mensajeUsuario: "Ocurrió un error inesperado al procesar la petición",
      mensajeSistema:
        err && err.message ? err.message : "Excepción desconocida",
      data: null,
    });
    return {
      statusCode: 500,
      body: (function () {
        const payload = replaceNulls(fallback);
        return wantRawJson ? payload : JSON.stringify(payload);
      })(),
    };
  }
};
