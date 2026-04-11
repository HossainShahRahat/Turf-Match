import "../styles.css";
import { apiUrl } from "../lib/config.js";

const message = document.getElementById("message");
let playerToken = localStorage.getItem("playerToken") || null;

async function loadProfile(playerId) {
  message.className = "alert alert-info";
  message.textContent = "Loading profile...";
  const headers = {};
  if (playerToken) headers.Authorization = `Bearer ${playerToken}`;
  const response = await fetch(apiUrl(`/players/profile/${encodeURIComponent(playerId)}`), { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to load profile");
  const player = data.player;
  document.getElementById("player-name").textContent = `${player.name} (${player.playerId})`;
  document.getElementById("matches").textContent = player.stats.matches ?? 0;
  document.getElementById("goals").textContent = player.stats.goals ?? 0;
  document.getElementById("rating").textContent = player.stats.rating ?? 0;
  document.getElementById("tournamentsPlayed").textContent = player.stats.tournamentsPlayed ?? 0;
  document.getElementById("totalValue").textContent = `৳${player.stats.totalValue ?? 0}`;
  document.getElementById("value").textContent = `৳${player.stats.value ?? 0}`;
  message.className = "alert alert-success";
  message.textContent = "Profile loaded.";
}

document.getElementById("profile-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const playerId = document.getElementById("profilePlayerId").value.trim();
    await loadProfile(playerId);
    const url = new URL(window.location.href);
    url.searchParams.set("playerId", playerId);
    window.history.replaceState({}, "", url);
  } catch (error) {
    message.className = "alert alert-error";
    message.textContent = error.message;
  }
});

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const btn = document.getElementById("login-btn");
  btn.disabled = true;
  btn.classList.add("loading");
  message.className = "alert alert-info";
  message.textContent = "Logging in...";
  try {
    const payload = {
      playerId: document.getElementById("loginPlayerId").value.trim(),
      password: document.getElementById("loginPassword").value
    };
    const response = await fetch(apiUrl("/auth/player-login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Login failed");
    playerToken = data.token;
    localStorage.setItem("playerToken", data.token);
    message.className = "alert alert-success";
    message.textContent = "Player login successful.";
  } catch (error) {
    message.className = "alert alert-error";
    message.textContent = error.message;
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
  }
});

document.getElementById("rating-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!playerToken) {
    message.className = "alert alert-warning";
    message.textContent = "Please login as player first.";
    return;
  }
  const matchId = document.getElementById("ratingMatchId").value.trim();
  const payload = {
    targetPlayerId: document.getElementById("targetPlayerMongoId").value.trim(),
    score: Number(document.getElementById("ratingScore").value)
  };
  const rateBtn = document.getElementById("rate-btn");
  rateBtn.disabled = true;
  rateBtn.classList.add("loading");
  try {
    const response = await fetch(apiUrl(`/matches/${matchId}/ratings`), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${playerToken}` },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to submit rating");
    message.className = "alert alert-success";
    message.textContent = `Rating submitted.\nTarget avg (this match): ${data.averageRatingForThisMatch}`;
  } catch (error) {
    message.className = "alert alert-error";
    message.textContent = error.message;
  } finally {
    rateBtn.disabled = false;
    rateBtn.classList.remove("loading");
  }
});

const initialPlayerId = new URLSearchParams(window.location.search).get("playerId");
if (initialPlayerId) {
  document.getElementById("profilePlayerId").value = initialPlayerId;
  loadProfile(initialPlayerId).catch((error) => {
    message.className = "alert alert-error";
    message.textContent = error.message;
  });
}
