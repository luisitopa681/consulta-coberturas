/**
 * index.js
 * AWS Lambda handler que reenvía la petición a un servicio externo usando createApiClient.
 * - La entrada (event.body) puede ser JSON dinámico o cualquier otro payload: se pasa tal cual cuando no se puede parsear.
 * - La respuesta siempre será 200 con el objeto normalizado:
 *   { error:"", mensajeUsuario:"", mensajeSistema:"", data: ... }
 */

const { createApiClient } = require("./axios-middleware");
const {
  getHeader,
  getParam,
  getMode,
  getConfigFromRequest,
  isValidBaseURL,
} = require("./request-utils");

const ENV_BASE_URL = "";
const ENV_TIMEOUT = 100000;

const baseResponse = {
  success: false,
  status: 200,
  error: "",
  mensajeUsuario: "",
  mensajeSistema: "",
  data: null,
};

function replaceNulls(value) {
  if (value === null) return "";
  if (Array.isArray(value)) return value.map(replaceNulls);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value)) out[k] = replaceNulls(value[k]);
    return out;
  }
  return value;
}

function normalizeHeaderList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

// Mantiene lógica actual: Producto + Coberturas
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
    const key = raw.length > 24 ? raw.slice(0, 24) : raw;
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
        Descripcion: raw,
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

// Nueva opción: Producto + Asistencias
function groupAsistenciasByProducto(data) {
  if (!data || typeof data !== "object") return null;
  const rows = Array.isArray(data.Table)
    ? data.Table
    : Array.isArray(data.table)
    ? data.table
    : [];


  const map = new Map();
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const producto = r && r.Producto ? String(r.Producto) : "SIN_PRODUCTO";
    if (!map.has(producto)) {
      map.set(producto, {
        Producto: producto,
        Asistencias: [],
      });
    }
    map.get(producto).Asistencias.push({
      asistencia: r.asistencia,
      codigo_asistencia: r.codigo_asistencia,
      nombre_proveedor: r.nombre_proveedor,
      nombre_cobertura: r.nombre_cobertura,
    });
  }

  return Array.from(map.values());
}

function getConsultaTipo(headers) {
  const t = String(
    getHeader(
      headers,
      "x-consulta",
      "X-Consulta",
      "x-tipo-consulta",
      "X-Tipo-Consulta"
    ) || ""
  ).toLowerCase();
  return t.includes("asistencia") ? "producto-asistencia" : "producto-coberturas";
}

exports.handler = async (event, context) => {
  if (context && typeof context.callbackWaitsForEmptyEventLoop !== "undefined") {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  console.log("Received event:", JSON.stringify(event));
  const requestId =
    (context && context.awsRequestId) ||
    (event.headers &&
      (event.headers["X-Request-Id"] || event.headers["x-request-id"])) ||
    null;

  const headers = Object.assign({}, event.headers || {});
  if (requestId) {
    headers["X-Request-Id"] =
      headers["X-Request-Id"] || headers["x-request-id"] || requestId;
  }

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
  } catch {}

  const mode = getMode(headers);
  const params = event.queryStringParameters || undefined;
  const wantRawJson =
    String(getHeader(headers, "x-raw-json", "X-Raw-Json") || "").toLowerCase() === "true";

  const method = (event.httpMethod || "GET").toLowerCase();
  const url = event.path || "/";

  const consultaTipo = getConsultaTipo(headers);
  const { baseURL, timeout } = getConfigFromRequest(
    params,
    headers,
    ENV_BASE_URL,
    ENV_TIMEOUT
  );

  const baseURLIsValid = isValidBaseURL(baseURL);
  if (mode === "rest" && (!baseURL || !baseURLIsValid)) {
    const fallback = {
      ...baseResponse,
      status: 400,
      error: "BASE_URL_INVALIDA",
      mensajeUsuario: "La base URL especificada es inválida o está ausente.",
      mensajeSistema: `Valor recibido baseURL='${baseURL}' no cumple formato http/https requerido`,
      data: null,
    };
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: wantRawJson ? { ...fallback, success: false } : JSON.stringify(replaceNulls(fallback)),
    };
  }

  const apiClient = createApiClient({ baseURL, timeout });

  try {
    const response = await apiClient.request({
      method,
      url,
      params,
      data: bodyObj ?? undefined,
      headers,
    });

    const is5xx = typeof response.status === "number" && response.status >= 501 && response.status < 600;
    const success = response.status === 200;
    let outboundStatus = 200;
    let resp = "";

    if (success === true) {
      let bodyObj2 = event?.body2 ?? null;
      let methodo = (event.httpMethod || "GET").toLowerCase();
      let base = getHeader(headers, "x-next-url", "X-Next-Url", "X-Next-URL");

      headers["Authorization"] = response.data;

      const nextResp = await apiClient.request({
        method: methodo,
        url: base,
        data: bodyObj2,
        headers: { ...headers, ...(headers || {}) },
      });

      if (nextResp && nextResp.data) {
        const dataTransformado =
          consultaTipo === "producto-asistencia"
            ? groupAsistenciasByProducto(nextResp.data)
            : groupCoberturasByProducto(nextResp.data);
        nextResp.agrupadoPorProducto = dataTransformado;
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
      resp = Object.assign({}, baseResponse, {
        status: response.status,
        error: response.error || "",
        data: response.data || null,
      });
    }

    return {
      statusCode: outboundStatus,
      headers: { "Content-Type": "application/json" },
      body: wantRawJson ? replaceNulls({ ...resp, success }) : JSON.stringify(replaceNulls({ ...resp, success })),
    };
  } catch (err) {
    const fallback = Object.assign({}, baseResponse, {
      status: 500,
      error: "UNEXPECTED_ERROR",
      mensajeUsuario: "Ocurrió un error inesperado al procesar la petición",
      mensajeSistema: err && err.message ? err.message : "Excepción desconocida",
      data: null,
    });
    return {
      statusCode: 500,
      body: wantRawJson ? replaceNulls(fallback) : JSON.stringify(replaceNulls(fallback)),
    };
  }
};
