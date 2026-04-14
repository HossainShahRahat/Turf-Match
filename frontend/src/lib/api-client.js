import { apiUrl } from "./config.js";

async function parseResponse(response) {
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }
  return data;
}

export async function apiRequest(path, options = {}) {
  const { token, onUnauthorized, body, headers, ...rest } = options;
  const response = await fetch(apiUrl(path), {
    ...rest,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    ...(body !== undefined
      ? { body: typeof body === "string" ? body : JSON.stringify(body) }
      : {}),
  });

  if (response.status === 401 && typeof onUnauthorized === "function") {
    onUnauthorized();
    throw new Error("Session expired");
  }

  return parseResponse(response);
}

export function createAuthedClient({ getToken, onUnauthorized }) {
  return {
    request(path, options = {}) {
      const token = getToken?.();
      if (!token) throw new Error("No auth token");
      return apiRequest(path, { ...options, token, onUnauthorized });
    },
  };
}
