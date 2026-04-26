function normalizeApiBaseUrl(value) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue.replace(/\/+$/, "");
}

export const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:3000" : "")
);

function buildApiUrl(path) {
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path}`;

  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}

function getErrorMessage(path, response, payload) {
  if (payload && typeof payload === "object" && payload.message) {
    return payload.message;
  }

  if (typeof payload === "string") {
    const normalized = payload.trim();

    if (!normalized) {
      return `Request failed with status ${response.status}`;
    }

    if (normalized.startsWith("<!DOCTYPE html>") || normalized.includes("Cannot GET")) {
      return `API endpoint not available: ${path} (${response.status})`;
    }

    return normalized;
  }

  return `Request failed with status ${response.status}`;
}

export async function apiRequest(path, options = {}) {
  const { method = "GET", body, token, headers = {} } = options;
  const requestHeaders = { ...headers };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(buildApiUrl(path), {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (error) {
    throw new Error("Unable to connect to the server. Check that VITE_API_BASE_URL points to the deployed backend.");
  }

  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch (error) {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(path, response, payload));
  }

  return payload;
}
