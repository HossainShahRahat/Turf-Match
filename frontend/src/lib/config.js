const API_BASE_URL =
  localStorage.getItem("apiBaseUrl") ||
  import.meta.env.VITE_API_BASE_URL ||
"http://127.0.0.1:4000";

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

export function socketBaseUrl() {
  return API_BASE_URL;
}
