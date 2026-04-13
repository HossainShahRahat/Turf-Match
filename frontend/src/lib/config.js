const API_BASE_URL =
  localStorage.getItem("apiBaseUrl") ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:4000";

const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, "");

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
}

export function socketBaseUrl() {
  return normalizedBaseUrl;
}
