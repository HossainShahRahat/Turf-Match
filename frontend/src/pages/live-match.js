import "../styles.css";
import { apiUrl, socketBaseUrl } from "../lib/config.js";

const message = document.getElementById("message");
const matchIdInput = document.getElementById("matchId");
const teamsEl = document.getElementById("teams");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const goalsEl = document.getElementById("goals");
const socket = window.io(socketBaseUrl(), { transports: ["websocket", "polling"] });
let currentMatchId = null;

function renderMatch(match) {
  teamsEl.textContent = `${match.teams[0].name} vs ${match.teams[1].name}`;
  scoreEl.textContent = `${match.score.teamA} - ${match.score.teamB}`;
  statusEl.textContent = `Status: ${match.status}`;
  if (!match.goals.length) {
    goalsEl.innerHTML = "<li>No goals yet</li>";
    return;
  }
  goalsEl.innerHTML = "";
  match.goals.forEach((goal) => {
    const li = document.createElement("li");
    const teamName = goal.teamIndex === 0 ? match.teams[0].name : match.teams[1].name;
    li.textContent = `${goal.player?.name || "Unknown"} - ${teamName} (${goal.minute}')`;
    goalsEl.appendChild(li);
  });
}

async function loadMatch(matchId) {
  const loadBtn = document.getElementById("load-btn");
  loadBtn.disabled = true;
  loadBtn.classList.add("loading");
  message.className = "alert alert-info";
  message.textContent = "Loading match...";
  const response = await fetch(apiUrl(`/matches/${matchId}`));
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to load match");
  currentMatchId = matchId;
  socket.emit("match:watch", matchId);
  renderMatch(data.match);
  message.className = "alert alert-success";
  message.textContent = "Connected to live updates.";
  loadBtn.disabled = false;
  loadBtn.classList.remove("loading");
}

socket.on("match:updated", (match) => {
  if (match._id === currentMatchId) {
    renderMatch(match);
    message.className = "alert alert-success";
    message.textContent = "Live update received.";
  }
});

document.getElementById("load-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const matchId = matchIdInput.value.trim();
    await loadMatch(matchId);
    const url = new URL(window.location.href);
    url.searchParams.set("matchId", matchId);
    window.history.replaceState({}, "", url);
  } catch (error) {
    document.getElementById("load-btn").disabled = false;
    document.getElementById("load-btn").classList.remove("loading");
    message.className = "alert alert-error";
    message.textContent = error.message;
  }
});

const initialMatchId = new URLSearchParams(window.location.search).get("matchId");
if (initialMatchId) {
  matchIdInput.value = initialMatchId;
  loadMatch(initialMatchId).catch((error) => {
    message.className = "alert alert-error";
    message.textContent = error.message;
  });
}
