let API_BASE_URL =
  localStorage.getItem("apiBaseUrl") || "http://127.0.0.1:5000";

async function detectBackendPort() {
  const testUrls = [
    "http://127.0.0.1:5000/health",
    "http://127.0.0.1:4000/health",
    "http://localhost:5000/health",
    "http://localhost:4000/health",
  ];

  for (const url of testUrls) {
    try {
      const response = await fetch(url, { method: "HEAD", mode: "no-cors" });
      if (response.ok) {
        API_BASE_URL = url.split("/health")[0];
        localStorage.setItem("apiBaseUrl", API_BASE_URL);
        break;
      }
    } catch (e) {
      // Continue to next
    }
  }
}

detectBackendPort();

window.APP_CONFIG = { API_BASE_URL };

window.apiUrl = function apiUrl(path) {
  return `${window.APP_CONFIG.API_BASE_URL}${path}`;
};
