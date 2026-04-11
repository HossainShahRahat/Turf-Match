import "../styles.css";
import { apiUrl } from "../lib/config.js";

const form = document.getElementById("admin-login-form");
const result = document.getElementById("result");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const loginBtn = document.getElementById("login-btn");
  loginBtn.disabled = true;
  loginBtn.classList.add("loading");
  result.textContent = "Logging in...";

  const adminId = document.getElementById("adminId").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch(apiUrl("/auth/admin-login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId, password })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Login failed");

    localStorage.setItem("adminToken", data.token);
    result.textContent = "Login successful. Redirecting to admin panel...";
    setTimeout(() => {
      window.location.href = "/admin-panel.html";
    }, 500);
  } catch (error) {
    result.textContent = error.message;
  } finally {
    loginBtn.disabled = false;
    loginBtn.classList.remove("loading");
  }
});
