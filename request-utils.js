const getHeader = (headers, ...keys) => {
  for (const k of keys) {
    if (headers && headers[k] != null) return headers[k];
  }
  return undefined;
};

const getParam = (obj, ...keys) => {
  if (!obj || typeof obj !== "object") return undefined;
  for (const k of keys) {
    if (obj[k] != null) return obj[k];
  }
  return undefined;
};

// Mode estricto: solo se acepta desde headers (X-Mode/x-mode). Fallback "rest".
const getMode = (headers) => {
  return String(getHeader(headers, "X-Mode", "x-mode") || "rest").toLowerCase();
};

const getConfigFromRequest = (params, headers, envBaseUrl, envTimeout) => {
  const baseURLRaw =
    getParam(params, "base_url", "baseURL") ||
    getHeader(headers, "x-base-url", "X-Base-Url", "X-Base-URL") ||
    envBaseUrl;
  const timeoutRaw =
    getParam(params, "timeout", "time_out") ||
    getHeader(headers, "x-timeout", "X-Timeout") ||
    envTimeout;

  const baseURL =
    typeof baseURLRaw === "string"
      ? baseURLRaw.trim()
      : String(baseURLRaw || "");
  let timeout = parseInt(timeoutRaw, 10);
  if (Number.isNaN(timeout)) timeout = envTimeout;
  if (timeout < 100) timeout = 100;
  if (timeout > 120000) timeout = 120000;

  return { baseURL, timeout };
};

const isValidBaseURL = (baseURL) =>
  /^https?:\/\/[\w.-]+(?::\d+)?(\/.*)?$/.test(baseURL);

module.exports = {
  getHeader,
  getParam,
  getMode,
  getConfigFromRequest,
  isValidBaseURL,
};
