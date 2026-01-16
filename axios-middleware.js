/**
 * axios-middleware.js
 * Cliente Axios con interceptores que normalizan las respuestas y agregan metadata.
 * Mejoras:
 *  - Devuelve `ok`, `status`, `headers`.
 *  - Conserva compatibilidad con campos previos (error, mensajeUsuario, mensajeSistema).
 *  - Opcionalmente lanza excepción en errores si options.throwOnError === true.
 *  - Permite validación de baseURL con options.validateBaseURL(url).
 */

const axios = require("axios");

function createApiClient(options = {}) {
  const {
    baseURL = "",
    timeout = 10000,
    headers = {},
    throwOnError = false,
    validateBaseURL,
    transformError, // opcional: (errObj, error) => errObj modificado
  } = options;

  if (validateBaseURL) {
    try {
      const urlObj = new URL(baseURL);
      const valid = validateBaseURL(urlObj);
      if (!valid) throw new Error("BaseURL no permitido");
    } catch (e) {
      throw new Error(`BaseURL inválido o no permitido: ${baseURL}`);
    }
  }

  const client = axios.create({
    baseURL,
    timeout,
    headers: { Accept: "application/json", ...headers },
  });

  client.interceptors.response.use(
    // Éxito 2xx
    (response) => {
      return {
        status: response.status,
        headers: response.headers,
        error: "",
        mensajeUsuario: "",
        mensajeSistema: "",
        data: response.data, // body original
      };
    },
    // Error (no-2xx, red, timeout, etc.)
    (error) => {
      let structured;
      if (error.response) {
        const r = error.response;
        const originalBody = r.data;
        let mensajeUsuario = "";
        let mensajeSistema = "";

        if (originalBody && typeof originalBody === "object") {
          mensajeUsuario =
            originalBody.mensajeUsuario ||
            originalBody.userMessage ||
            originalBody.message ||
            "";
          mensajeSistema =
            originalBody.mensajeSistema ||
            originalBody.detail ||
            originalBody.error_description ||
            "";
        }
        if (!mensajeSistema) mensajeSistema = error.message || "";

        structured = {
          status: r.status,
          headers: r.headers || {},
          // error mantiene compatibilidad antigua (texto compuesto)
          error: `${r.status}` + (r.statusText ? ` ${r.statusText}` : ""),
          errorCode: r.status, // numérico independiente
          mensajeUsuario,
          mensajeSistema,
          data: originalBody,
        };
      } else {
        const networkMessage =
          error.code === "ECONNABORTED"
            ? "Tiempo de espera agotado al contactar el servicio"
            : "No fue posible conectar con el servicio";
        structured = {
          status: null,
          headers: {},
          error: "NETWORK_ERROR",
          errorCode: "NETWORK_ERROR",
          mensajeUsuario: networkMessage,
          mensajeSistema: error.message || "Error de red",
          data: null,
        };
      }

      if (typeof transformError === "function") {
        try {
          structured = transformError(structured, error) || structured;
        } catch (_) {
          /* ignorar errores en transformError */
        }
      }

      // Si se desea comportamiento tradicional de axios en errores:
      if (throwOnError) {
        const e = new Error(structured.error || "HTTP_ERROR");
        e.details = structured;
        throw e;
      }
      return structured;
    }
  );

  return client;
}

module.exports = { createApiClient };
