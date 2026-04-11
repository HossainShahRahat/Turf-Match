import "../styles.css";
import { apiUrl } from "../lib/config.js";

const message = document.getElementById("message");
let playerToken = localStorage.getItem("playerToken") || null;

document.getElementById("player-login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const btn = document.getElementById("player-login-btn");
  btn.disabled = true;
  btn.classList.add("loading");
  message.className = "alert alert-info";
  message.textContent = "Logging in...";
  try {
    const payload = { playerId: document.getElementById("playerId").value.trim(), password: document.getElementById("password").value };
    const response = await fetch(apiUrl("/auth/player-login"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Login failed");
    playerToken = data.token;
    localStorage.setItem("playerToken", playerToken);
    message.className = "alert alert-success";
    message.textContent = "Login successful.";
  } catch (error) {
    message.className = "alert alert-error";
    message.textContent = error.message;
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
  }
});

document.getElementById("transfer-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!playerToken) {
    message.className = "alert alert-warning";
    message.textContent = "Please login first.";
    return;
  }
  const btn = document.getElementById("transfer-btn");
  btn.disabled = true;
  btn.classList.add("loading");
  message.className = "alert alert-info";
  message.textContent = "Submitting transfer request...";
  try {
    const payload = { matchId: document.getElementById("matchId").value.trim(), reason: document.getElementById("reason").value.trim() || undefined };
    const response = await fetch(apiUrl("/transfers/request"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${playerToken}` },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to request transfer");
    message.className = "alert alert-success";
    message.textContent = `Transfer request submitted.\nRequest ID: ${data.request._id}\nStatus: ${data.request.status}`;
    document.getElementById("transfer-form").reset();
  } catch (error) {
    message.className = "alert alert-error";
    message.textContent = error.message;
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
  }
});
